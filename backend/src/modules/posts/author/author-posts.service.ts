import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import sanitizeHtml from 'sanitize-html';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Category, CategoryTranslation, Language, Post, PostTranslation } from '../../../database/models';
import { TranslationStatus } from '../../translations/translations.constants';
import { AuthorPostsQueryDto } from './dto/author-posts-query.dto';
import { AutosaveAuthorPostDto } from './dto/autosave-author-post.dto';
import { CreateAuthorPostDto } from './dto/create-author-post.dto';
import { UpdateAuthorPostDto } from './dto/update-author-post.dto';
import {
  AUTHOR_EDITABLE_POST_STATUSES,
  POST_STATUS_TRANSITIONS,
  PostStatus,
} from '../posts.constants';
import { removeAccents } from '../../../utils/string.util';
import { UploadsService } from '../../uploads/uploads.service';
import { sanitizePostContent } from './post-content-sanitizer';

type TranslationMatrixItem = {
  languageId: number;
  status: TranslationStatus;
  provider: string | null;
};

type AuthorPostTranslationResponse = {
  id: string;
  languageId: number;
  title: string | null;
  slug: string | null;
  content: string | null;
  translationStatus: TranslationStatus;
  translationProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AuthorPostResponse = {
  id: string;
  authorId: string;
  categoryId: number | null;
  originalLanguageId: number;
  status: PostStatus;
  reviewNote: string | null;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  translations: AuthorPostTranslationResponse[];
  translationMatrix: TranslationMatrixItem[];
};

type PaginatedAuthorPostsResponse = {
  items: AuthorPostResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class AuthorPostsService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation) private readonly categoryTranslationModel: typeof CategoryTranslation,
    private readonly uploadsService: UploadsService,
  ) {}

  getAllowedTransitions(status: PostStatus): readonly PostStatus[] {
    return POST_STATUS_TRANSITIONS[status];
  }

  canTransition(fromStatus: PostStatus, toStatus: PostStatus): boolean {
    return this.getAllowedTransitions(fromStatus).includes(toStatus);
  }

  assertCanTransition(fromStatus: PostStatus, toStatus: PostStatus): void {
    if (!this.canTransition(fromStatus, toStatus)) {
      throw new BadRequestException(`Cannot transition post from ${fromStatus} to ${toStatus}`);
    }
  }

  assertAuthorCanEdit(status: PostStatus): void {
    if (!AUTHOR_EDITABLE_POST_STATUSES.includes(status)) {
      throw new BadRequestException(`Authors can only edit posts in: ${AUTHOR_EDITABLE_POST_STATUSES.join(', ')}`);
    }
  }

  assertEditorContentLimits(title: string, content: string): void {
    if (!title.trim()) {
      throw new BadRequestException('Title is required');
    }

    if (!this.hasMeaningfulEditorContent(content)) {
      throw new BadRequestException('Content is required');
    }

    if (this.countWords(title) > 20) {
      throw new BadRequestException('Title must contain no more than 20 words');
    }

    const plainContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
    if (this.countWords(plainContent) > 3000) {
      throw new BadRequestException('Content must contain no more than 3000 words');
    }
  }

  assertAutosaveContentLimits(title: string, content: string): void {
    if (!title.trim() && !this.hasMeaningfulEditorContent(content)) {
      throw new BadRequestException('An autosaved draft must contain a title or content');
    }
    if (this.countWords(title) > 20) {
      throw new BadRequestException('Title must contain no more than 20 words');
    }

    const plainContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
    if (this.countWords(plainContent) > 3000) {
      throw new BadRequestException('Content must contain no more than 3000 words');
    }
  }

  buildTranslationMatrix(
    translations: Array<{
      language_id: number;
      translation_status: TranslationStatus;
      translation_provider: string | null;
    }>,
  ): TranslationMatrixItem[] {
    return translations.map((translation) => ({
      languageId: translation.language_id,
      status: translation.translation_status,
      provider: translation.translation_provider,
    }));
  }

  async createAuthorPost(authorId: string, dto: CreateAuthorPostDto): Promise<AuthorPostResponse> {
    this.assertEditorContentLimits(dto.title, dto.content);

    return this.sequelize.transaction(async (transaction) => {
      const now = new Date();
      const categoryId = await this.resolveCategoryId(dto.categoryId, transaction);
      const post = await this.postModel.create(
        {
          author_id: authorId,
          category_id: categoryId,
          original_language_id: dto.originalLanguageId,
          view_count: 0,
          status: 'draft',
          review_note: null,
          published_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        { transaction },
      );

      const sourceTranslation = await this.upsertSourceTranslation(
        post.id,
        dto.originalLanguageId,
        {
          title: dto.title,
          content: this.sanitizeContent(dto.content),
        },
        transaction,
      );

      await this.ensureTargetTranslations(
        post.id,
        this.normalizeTargetLanguageIds(dto.targetLanguageIds, dto.originalLanguageId),
        sourceTranslation.id,
        transaction,
      );

      await this.uploadsService.syncPostMedia(
        post.id,
        authorId,
        [sourceTranslation.content],
        transaction,
      );

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  async autosaveAuthorPost(
    authorId: string,
    dto: AutosaveAuthorPostDto,
    postId?: string,
  ): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async transaction => {
      const now = new Date();
      const selectedCategoryId = postId
        ? undefined
        : await this.resolveCategoryId(dto.categoryId, transaction);
      const post = postId
        ? await this.findAuthorPostOrThrow(authorId, postId, transaction)
        : await this.postModel.create(
            {
              author_id: authorId,
              category_id: selectedCategoryId,
              original_language_id: dto.originalLanguageId,
              view_count: 0,
              status: 'draft',
              review_note: null,
              published_at: null,
              created_at: now,
              updated_at: now,
              deleted_at: null,
            },
            { transaction },
          );

      if (post.status !== 'draft' && post.status !== 'rejected') {
        throw new BadRequestException('Only draft or rejected posts can be autosaved');
      }

      const originalLanguageId = dto.originalLanguageId ?? post.original_language_id;
      const currentSource = await this.findSourceTranslation(
        post.id,
        post.original_language_id,
        transaction,
      );
      const title = dto.title ?? currentSource?.title ?? '';
      const content = this.sanitizeContent(dto.content ?? currentSource?.content ?? '');
      this.assertAutosaveContentLimits(title, content);

      const categoryId = dto.categoryId === undefined
        ? post.category_id
        : await this.resolveCategoryId(dto.categoryId, transaction);

      await post.update(
        {
          category_id: categoryId,
          original_language_id: originalLanguageId,
          review_note: null,
          updated_at: now,
        },
        { transaction },
      );

      const sourceChanged = this.hasSourceChanged(currentSource, {
        languageId: originalLanguageId,
        title,
        content,
      });
      const sourceTranslation = await this.upsertSourceTranslation(
        post.id,
        originalLanguageId,
        { title, content },
        transaction,
      );

      if (dto.targetLanguageIds !== undefined) {
        await this.syncTargetTranslations(
          post.id,
          this.normalizeTargetLanguageIds(dto.targetLanguageIds, originalLanguageId),
          originalLanguageId,
          sourceTranslation.id,
          transaction,
        );
      }
      if (sourceChanged) {
        await this.markTargetTranslationsOutdated(post.id, originalLanguageId, transaction);
      }

      await this.uploadsService.syncPostMedia(
        post.id,
        authorId,
        [sourceTranslation.content],
        transaction,
      );

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  async listAuthorPosts(authorId: string, query: AuthorPostsQueryDto): Promise<PaginatedAuthorPostsResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const where: WhereOptions = {
      author_id: authorId,
      deleted_at: query.trash ? { [Op.ne]: null } : null,
    };

    if (query.status === 'public') {
      where.status = { [Op.in]: ['approved', 'published'] };
    } else if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.categoryId) {
      where.category_id = query.categoryId;
    }

    if (query.originalLanguageId) {
      where.original_language_id = query.originalLanguageId;
    }

    if (query.updatedMonth) {
      const [year, month] = query.updatedMonth.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      where.updated_at = { [Op.gte]: start, [Op.lt]: end };
    }

    const posts = await this.postModel.findAll({
      where,
      order: [['updated_at', 'DESC']],
    });
    const translationsByPost = await this.getTranslationsByPostIds(posts.map((post) => post.id));

    const search = removeAccents(query.search?.trim().toLowerCase() || '');
    const allItems = posts
      .map((post) => this.toAuthorPostResponse(post, translationsByPost.get(post.id) ?? []))
      .filter((post) => {
        if (!search) {
          return true;
        }

        return post.translations.some((translation) =>
          [translation.title, translation.slug]
            .filter(Boolean)
            .some((value) => removeAccents(value!.toLowerCase()).includes(search)),
        );
      });

    const total = allItems.length;
    const start = (page - 1) * limit;

    return {
      items: allItems.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAuthorPost(
    authorId: string,
    postId: string,
    transaction?: Transaction,
    includeDeleted = false,
  ): Promise<AuthorPostResponse> {
    const post = await this.findAuthorPostOrThrow(authorId, postId, transaction, includeDeleted);
    const translations = await this.findTranslations(post.id, transaction);

    return this.toAuthorPostResponse(post, translations);
  }

  async getPostOptions() {
    const [languages, categories, categoryTranslations] = await Promise.all([
      this.languageModel.findAll({ where: { is_active: true }, order: [['id', 'ASC']] }),
      this.categoryModel.findAll({ where: { status: 'active' }, order: [['id', 'ASC']] }),
      this.categoryTranslationModel.findAll({ order: [['language_id', 'ASC']] }),
    ]);
    return {
      languages: languages.map(language => ({
        id: language.id,
        code: language.code,
        label: language.name,
        nativeLabel: language.native_name,
        flagCode: language.flag_code,
      })),
      categories: categories.map(category => {
        const translation = categoryTranslations.find(item => item.category_id === category.id);
        return { id: category.id, label: translation?.name || category.slug, isActive: true };
      }),
    };
  }

  async getAuthorPostFilterOptions(authorId: string) {
    const [options, posts] = await Promise.all([
      this.getPostOptions(),
      this.postModel.findAll({
        where: { author_id: authorId },
        attributes: ['category_id', 'original_language_id', 'updated_at'],
        order: [['updated_at', 'DESC']],
      }),
    ]);
    const visibleLanguageIds = new Set(options.languages.map(language => Number(language.id)));
    const hiddenLanguageIds = [...new Set(posts
      .map(post => Number(post.original_language_id))
      .filter(id => Number.isFinite(id) && !visibleLanguageIds.has(id)))];
    const hiddenLanguages = hiddenLanguageIds.length
      ? await this.languageModel.findAll({
          where: { id: { [Op.in]: hiddenLanguageIds }, is_active: false },
          order: [['id', 'ASC']],
        })
      : [];
    const languages = [
      ...options.languages,
      ...hiddenLanguages.map(language => ({
        id: language.id,
        code: language.code,
        label: language.name,
        nativeLabel: language.native_name,
        flagCode: language.flag_code,
      })),
    ];
    const visibleCategoryIds = new Set(options.categories.map(category => category.id));
    const hiddenCategoryIds = [...new Set(posts
      .map(post => post.category_id)
      .filter((id): id is number => typeof id === 'number' && !visibleCategoryIds.has(id)))];
    const [hiddenCategories, hiddenTranslations] = hiddenCategoryIds.length
      ? await Promise.all([
          this.categoryModel.findAll({
            where: { id: { [Op.in]: hiddenCategoryIds }, status: 'inactive' },
            order: [['id', 'ASC']],
          }),
          this.categoryTranslationModel.findAll({
            where: { category_id: { [Op.in]: hiddenCategoryIds } },
            order: [['language_id', 'ASC']],
          }),
        ])
      : [[], []];
    const categories = [
      ...options.categories,
      ...hiddenCategories.map(category => ({
        id: category.id,
        label: hiddenTranslations.find(item => item.category_id === category.id)?.name || category.slug,
        isActive: false,
      })),
    ];
    const updatedMonths = [...new Set(posts.map(post => {
      const date = new Date(post.updated_at);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }))];

    return { ...options, languages, categories, updatedMonths };
  }

  async updateAuthorPost(
    authorId: string,
    postId: string,
    dto: UpdateAuthorPostDto,
  ): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
      this.assertAuthorCanEdit(post.status);

      const originalLanguageId = dto.originalLanguageId ?? post.original_language_id;
      const currentSource = await this.findSourceTranslation(post.id, post.original_language_id, transaction);
      const nextSource = {
        title: dto.title ?? currentSource?.title ?? '',
        content: dto.content ?? currentSource?.content ?? '',
      };
      const sanitizedNextContent = this.sanitizeContent(nextSource.content);
      this.assertEditorContentLimits(nextSource.title, sanitizedNextContent);
      const sourceChanged = this.hasSourceChanged(currentSource, {
        languageId: originalLanguageId,
        title: nextSource.title,
        content: sanitizedNextContent,
      });
      const categoryId = dto.categoryId === undefined
        ? post.category_id
        : await this.resolveCategoryId(dto.categoryId, transaction);

      await post.update(
        {
          category_id: categoryId,
          original_language_id: originalLanguageId,
          review_note: null,
          updated_at: new Date(),
        },
        { transaction },
      );

      const sourceTranslation = await this.upsertSourceTranslation(
        post.id,
        originalLanguageId,
        {
          ...nextSource,
          content: sanitizedNextContent,
        },
        transaction,
      );

      if (dto.targetLanguageIds !== undefined) {
        await this.syncTargetTranslations(
          post.id,
          this.normalizeTargetLanguageIds(dto.targetLanguageIds, originalLanguageId),
          originalLanguageId,
          sourceTranslation.id,
          transaction,
        );
      }

      if (sourceChanged) {
        await this.markTargetTranslationsOutdated(post.id, originalLanguageId, transaction);
      }

      await this.uploadsService.syncPostMedia(
        post.id,
        authorId,
        [sourceTranslation.content],
        transaction,
      );

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  async submitAuthorPost(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
      this.assertCanTransition(post.status, 'pending_review');

      const sourceTranslation = await this.findSourceTranslation(post.id, post.original_language_id, transaction);
      if (
        !sourceTranslation?.title?.trim() ||
        !this.hasMeaningfulEditorContent(sourceTranslation.content ?? '')
      ) {
        throw new BadRequestException('A post must have source title and content before review submission');
      }

      await post.update(
        {
          status: 'pending_review',
          review_note: null,
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  async archiveAuthorPost(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.moveAuthorPost(authorId, postId, 'archived');
  }

  async restoreAuthorPost(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.moveAuthorPost(authorId, postId, 'draft');
  }

  async trashAuthorPost(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);

      await post.update(
        {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        { transaction },
      );

      const translations = await this.findTranslations(post.id, transaction);
      return this.toAuthorPostResponse(post, translations);
    });
  }

  async restoreAuthorPostFromTrash(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction, true);
      if (!post.deleted_at) {
        throw new BadRequestException('Post is not in trash');
      }

      await post.update(
        {
          deleted_at: null,
          updated_at: new Date(),
        },
        { transaction },
      );

      const translations = await this.findTranslations(post.id, transaction);
      return this.toAuthorPostResponse(post, translations);
    });
  }

  async deleteAuthorPostPermanently(
    authorId: string,
    postId: string,
  ): Promise<{ id: string }> {
    const deletedPost = await this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction, true);
      if (!post.deleted_at) {
        throw new BadRequestException('Post must be in trash before permanent deletion');
      }

      const id = post.id;
      const mediaAssetIds = await this.uploadsService.detachPostMediaForDeletion(
        post.id,
        authorId,
        transaction,
      );
      await post.destroy({ transaction });
      return { id, mediaAssetIds };
    });

    await this.uploadsService.deleteDetachedPostMedia(authorId, deletedPost.mediaAssetIds);
    return { id: deletedPost.id };
  }

  async discardAuthorDraft(authorId: string, postId: string): Promise<{ id: string }> {
    const deletedPost = await this.sequelize.transaction(async transaction => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
      if (post.status !== 'draft' && post.status !== 'rejected') {
        throw new BadRequestException('Only draft or rejected posts can be discarded');
      }

      const id = post.id;
      const mediaAssetIds = await this.uploadsService.detachPostMediaForDeletion(
        post.id,
        authorId,
        transaction,
      );
      await post.destroy({ transaction });
      return { id, mediaAssetIds };
    });

    await this.uploadsService.deleteDetachedPostMedia(authorId, deletedPost.mediaAssetIds);
    return { id: deletedPost.id };
  }

  async getAuthorPreview(
    authorId: string,
    postId: string,
    includeDeleted = false,
  ): Promise<AuthorPostResponse> {
    return this.getAuthorPost(authorId, postId, undefined, includeDeleted);
  }

  private async moveAuthorPost(
    authorId: string,
    postId: string,
    nextStatus: PostStatus,
  ): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
      this.assertCanTransition(post.status, nextStatus);

      await post.update(
        {
          status: nextStatus,
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  private async findAuthorPostOrThrow(
    authorId: string,
    postId: string,
    transaction?: Transaction,
    includeDeleted = false,
  ): Promise<Post> {
    const where: WhereOptions = {
      id: postId,
      author_id: authorId,
    };

    if (!includeDeleted) {
      where.deleted_at = null;
    }

    const post = await this.postModel.findOne({
      where,
      transaction,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async resolveCategoryId(
    requestedCategoryId: number | null | undefined,
    transaction: Transaction,
  ): Promise<number> {
    const category = requestedCategoryId
      ? await this.categoryModel.findOne({
          where: { id: requestedCategoryId, status: 'active' },
          transaction,
        })
      : await this.categoryModel.findOne({
          where: { is_system: true, status: 'active' },
          transaction,
        });
    if (!category) {
      throw new BadRequestException(
        requestedCategoryId
          ? 'The selected category is unavailable'
          : 'The system uncategorized category is not configured',
      );
    }
    return category.id;
  }

  private async findSourceTranslation(
    postId: string,
    languageId: number,
    transaction?: Transaction,
  ): Promise<PostTranslation | null> {
    return this.postTranslationModel.findOne({
      where: {
        post_id: postId,
        language_id: languageId,
      },
      transaction,
    });
  }

  private async findTranslations(postId: string, transaction?: Transaction): Promise<PostTranslation[]> {
    return this.postTranslationModel.findAll({
      where: { post_id: postId },
      order: [['language_id', 'ASC']],
      transaction,
    });
  }

  private async getTranslationsByPostIds(postIds: string[]): Promise<Map<string, PostTranslation[]>> {
    const translationsByPost = new Map<string, PostTranslation[]>();
    if (!postIds.length) {
      return translationsByPost;
    }

    const translations = await this.postTranslationModel.findAll({
      where: {
        post_id: { [Op.in]: postIds },
      },
      order: [
        ['post_id', 'ASC'],
        ['language_id', 'ASC'],
      ],
    });

    translations.forEach((translation) => {
      const group = translationsByPost.get(translation.post_id) ?? [];
      group.push(translation);
      translationsByPost.set(translation.post_id, group);
    });

    return translationsByPost;
  }

  private async upsertSourceTranslation(
    postId: string,
    languageId: number,
    source: {
      title: string;
      content: string;
    },
    transaction: Transaction,
  ): Promise<PostTranslation> {
    const existing = await this.findSourceTranslation(postId, languageId, transaction);
    const now = new Date();
    const slug = await this.generateUniqueSlug(source.title, languageId, existing?.id, transaction);
    const values = {
      title: source.title.trim(),
      slug,
      content: source.content,
      translation_status: 'completed' as TranslationStatus,
      translation_provider: null,
      updated_at: now,
    };

    if (existing) {
      await existing.update(values, { transaction });
      return existing;
    }

    return this.postTranslationModel.create(
      {
        post_id: postId,
        language_id: languageId,
        ...values,
        created_at: now,
      },
      { transaction },
    );
  }

  private async ensureTargetTranslations(
    postId: string,
    targetLanguageIds: number[],
    sourceTranslationId: string,
    transaction: Transaction,
  ): Promise<void> {
    const now = new Date();

    for (const languageId of targetLanguageIds) {
      const existing = await this.findSourceTranslation(postId, languageId, transaction);
      if (existing && existing.id !== sourceTranslationId) {
        continue;
      }

      if (!existing) {
        await this.postTranslationModel.create(
          {
            post_id: postId,
            language_id: languageId,
            title: null,
            slug: null,
            content: null,
            translation_status: 'not_started',
            translation_provider: null,
            created_at: now,
            updated_at: now,
          },
          { transaction },
        );
      }
    }
  }

  private async syncTargetTranslations(
    postId: string,
    targetLanguageIds: number[],
    originalLanguageId: number,
    sourceTranslationId: string,
    transaction: Transaction,
  ): Promise<void> {
    const retainedLanguageIds = [originalLanguageId, ...targetLanguageIds];
    await this.postTranslationModel.destroy({
      where: {
        post_id: postId,
        language_id: { [Op.notIn]: retainedLanguageIds },
      },
      transaction,
    });
    await this.ensureTargetTranslations(
      postId,
      targetLanguageIds,
      sourceTranslationId,
      transaction,
    );
  }

  private async markTargetTranslationsOutdated(
    postId: string,
    originalLanguageId: number,
    transaction: Transaction,
  ): Promise<void> {
    await this.postTranslationModel.update(
      {
        translation_status: 'not_started',
        translation_provider: null,
        updated_at: new Date(),
      },
      {
        where: {
          post_id: postId,
          language_id: { [Op.ne]: originalLanguageId },
        },
        transaction,
        individualHooks: true,
      },
    );
  }

  private hasSourceChanged(
    currentSource: PostTranslation | null,
    nextSource: {
      languageId: number;
      title: string;
      content: string;
    },
  ): boolean {
    if (!currentSource) {
      return true;
    }

    return (
      currentSource.language_id !== nextSource.languageId ||
      currentSource.title !== nextSource.title.trim() ||
      currentSource.content !== nextSource.content
    );
  }

  private normalizeTargetLanguageIds(targetLanguageIds: number[] | undefined, originalLanguageId: number): number[] {
    return [...new Set(targetLanguageIds ?? [])].filter((languageId) => languageId !== originalLanguageId);
  }

  private sanitizeContent(content: string): string {
    return sanitizePostContent(content);
  }

  private async generateUniqueSlug(
    title: string,
    languageId: number,
    excludeTranslationId: string | undefined,
    transaction: Transaction,
  ): Promise<string> {
    const baseSlug = this.slugify(title).slice(0, 180) || 'post';

    for (let index = 0; index < 100; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const where: WhereOptions = {
        slug: candidate,
        language_id: languageId,
      };

      if (excludeTranslationId) {
        where.id = { [Op.ne]: excludeTranslationId };
      }

      const existing = await this.postTranslationModel.findOne({ where, transaction });
      if (!existing) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now()}`;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private countWords(value: string): number {
    return value.trim().split(/\s+/).filter(Boolean).length;
  }

  private hasMeaningfulEditorContent(content: string): boolean {
    const plainContent = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })
      .replace(/\u00a0/g, ' ')
      .trim();

    return Boolean(plainContent || /<(img|audio|video)\b/i.test(content));
  }

  private toAuthorPostResponse(post: Post, translations: PostTranslation[]): AuthorPostResponse {
    return {
      id: post.id,
      authorId: post.author_id,
      categoryId: post.category_id,
      originalLanguageId: post.original_language_id,
      status: post.status,
      reviewNote: post.review_note,
      viewCount: post.view_count,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      deletedAt: post.deleted_at,
      translations: translations.map((translation) => ({
        id: translation.id,
        languageId: translation.language_id,
        title: translation.title,
        slug: translation.slug,
        content: translation.content,
        translationStatus: translation.translation_status,
        translationProvider: translation.translation_provider,
        createdAt: translation.created_at,
        updatedAt: translation.updated_at,
      })),
      translationMatrix: this.buildTranslationMatrix(translations),
    };
  }

}
