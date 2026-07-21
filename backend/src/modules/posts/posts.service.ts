import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import sanitizeHtml from 'sanitize-html';
import { Op, Transaction, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Post, PostTranslation } from '../../database/models';
import { TranslationStatus } from '../translations/translations.constants';
import { AdminPostsQueryDto } from './dto/admin-posts-query.dto';
import { AuthorPostsQueryDto } from './dto/author-posts-query.dto';
import { CreateAuthorPostDto } from './dto/create-author-post.dto';
import { ApprovePostDto, RejectPostDto } from './dto/review-post.dto';
import { UpdateAuthorPostDto } from './dto/update-author-post.dto';
import {
  AUTHOR_EDITABLE_POST_STATUSES,
  POST_STATUS_TRANSITIONS,
  PostStatus,
} from './posts.constants';

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
  summary: string | null;
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

type PaginatedAdminPostsResponse = PaginatedAuthorPostsResponse;

type AdminPostMetricsResponse = {
  total: number;
  trashed: number;
  byStatus: Record<PostStatus, number>;
  translations: Record<TranslationStatus, number>;
};

@Injectable()
export class PostsService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
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

  assertRejectNote(reviewNote: string | undefined): void {
    if (!reviewNote?.trim()) {
      throw new BadRequestException('reviewNote is required when rejecting a post');
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
    return this.sequelize.transaction(async (transaction) => {
      const now = new Date();
      const post = await this.postModel.create(
        {
          author_id: authorId,
          category_id: dto.categoryId ?? null,
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
          summary: dto.summary ?? null,
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

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const posts = await this.postModel.findAll({
      where,
      order: [['updated_at', 'DESC']],
    });
    const translationsByPost = await this.getTranslationsByPostIds(posts.map((post) => post.id));

    const search = query.search?.trim().toLowerCase();
    const allItems = posts
      .map((post) => this.toAuthorPostResponse(post, translationsByPost.get(post.id) ?? []))
      .filter((post) => {
        if (!search) {
          return true;
        }

        return post.translations.some((translation) =>
          [translation.title, translation.summary, translation.slug]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(search)),
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
  ): Promise<AuthorPostResponse> {
    const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
    const translations = await this.findTranslations(post.id, transaction);

    return this.toAuthorPostResponse(post, translations);
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
        summary: dto.summary ?? currentSource?.summary ?? null,
        content: dto.content ?? currentSource?.content ?? '',
      };
      const sanitizedNextContent = this.sanitizeContent(nextSource.content);
      const sourceChanged = this.hasSourceChanged(currentSource, {
        languageId: originalLanguageId,
        title: nextSource.title,
        summary: nextSource.summary,
        content: sanitizedNextContent,
      });

      await post.update(
        {
          category_id: dto.categoryId === undefined ? post.category_id : dto.categoryId,
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

      if (dto.targetLanguageIds) {
        await this.ensureTargetTranslations(
          post.id,
          this.normalizeTargetLanguageIds(dto.targetLanguageIds, originalLanguageId),
          sourceTranslation.id,
          transaction,
        );
      }

      if (sourceChanged) {
        await this.markTargetTranslationsOutdated(post.id, originalLanguageId, transaction);
      }

      return this.getAuthorPost(authorId, post.id, transaction);
    });
  }

  async submitAuthorPost(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findAuthorPostOrThrow(authorId, postId, transaction);
      this.assertCanTransition(post.status, 'pending_review');

      const sourceTranslation = await this.findSourceTranslation(post.id, post.original_language_id, transaction);
      if (!sourceTranslation?.title?.trim() || !sourceTranslation.content?.trim()) {
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

  async getAuthorPreview(authorId: string, postId: string): Promise<AuthorPostResponse> {
    return this.getAuthorPost(authorId, postId);
  }

  async listAdminPosts(query: AdminPostsQueryDto): Promise<PaginatedAdminPostsResponse> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 10));
    const where: WhereOptions = {
      deleted_at: null,
    };

    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    if (query.authorId) {
      where.author_id = query.authorId;
    }

    if (query.categoryId) {
      where.category_id = query.categoryId;
    }

    if (query.originalLanguageId) {
      where.original_language_id = query.originalLanguageId;
    }

    const posts = await this.postModel.findAll({
      where,
      order: [['updated_at', 'DESC']],
    });
    const translationsByPost = await this.getTranslationsByPostIds(posts.map((post) => post.id));
    const search = query.search?.trim().toLowerCase();
    const allItems = posts
      .map((post) => this.toAuthorPostResponse(post, translationsByPost.get(post.id) ?? []))
      .filter((post) => {
        if (!search) {
          return true;
        }

        return (
          post.id.includes(search) ||
          post.authorId.includes(search) ||
          post.translations.some((translation) =>
            [translation.title, translation.summary, translation.slug]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(search)),
          )
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

  async getAdminPost(postId: string): Promise<AuthorPostResponse> {
    const post = await this.findPostOrThrow(postId);
    const translations = await this.findTranslations(post.id);

    return this.toAuthorPostResponse(post, translations);
  }

  async approveAdminPost(postId: string, dto: ApprovePostDto): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findPostOrThrow(postId, transaction, true);
      this.assertCanTransition(post.status, 'approved');

      const sourceTranslation = await this.findSourceTranslation(post.id, post.original_language_id, transaction);
      if (!sourceTranslation?.title?.trim() || !sourceTranslation.content?.trim()) {
        throw new BadRequestException('A post must have source title and content before approval');
      }

      if (dto.targetLanguageIds) {
        await this.ensureTargetTranslations(
          post.id,
          this.normalizeTargetLanguageIds(dto.targetLanguageIds, post.original_language_id),
          sourceTranslation.id,
          transaction,
        );
      }

      await this.queueTargetTranslations(post.id, post.original_language_id, transaction);

      await post.update(
        {
          status: 'approved',
          review_note: null,
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.getAdminPostInTransaction(post.id, transaction);
    });
  }

  async rejectAdminPost(postId: string, dto: RejectPostDto): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findPostOrThrow(postId, transaction, true);
      this.assertCanTransition(post.status, 'rejected');
      this.assertRejectNote(dto.reviewNote);

      await post.update(
        {
          status: 'rejected',
          review_note: dto.reviewNote.trim(),
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.getAdminPostInTransaction(post.id, transaction);
    });
  }

  async publishAdminPost(postId: string): Promise<AuthorPostResponse> {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.findPostOrThrow(postId, transaction, true);
      this.assertCanTransition(post.status, 'published');

      await post.update(
        {
          status: 'published',
          published_at: post.published_at ?? new Date(),
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.getAdminPostInTransaction(post.id, transaction);
    });
  }

  async getAdminPostMetrics(): Promise<AdminPostMetricsResponse> {
    const byStatus = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      rejected: 0,
      published: 0,
      archived: 0,
    } satisfies Record<PostStatus, number>;

    const posts = await this.postModel.findAll({
      attributes: ['status'],
      where: { deleted_at: null },
    });
    posts.forEach((post) => {
      byStatus[post.status] += 1;
    });

    const trashed = await this.postModel.count({
      where: { deleted_at: { [Op.ne]: null } },
    });

    const translations = await this.postTranslationModel.findAll({
      attributes: ['translation_status'],
    });

    const translationMetrics = translations.reduce(
      (metrics, translation) => {
        metrics[translation.translation_status] += 1;
        return metrics;
      },
      {
        not_started: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      } satisfies Record<TranslationStatus, number>,
    );

    return {
      total: posts.length,
      trashed,
      byStatus,
      translations: translationMetrics,
    };
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

  private async findPostOrThrow(postId: string, transaction?: Transaction, lock = false): Promise<Post> {
    const post = await this.postModel.findOne({
      where: {
        id: postId,
        deleted_at: null,
      },
      transaction,
      lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async getAdminPostInTransaction(postId: string, transaction: Transaction): Promise<AuthorPostResponse> {
    const post = await this.findPostOrThrow(postId, transaction);
    const translations = await this.findTranslations(post.id, transaction);

    return this.toAuthorPostResponse(post, translations);
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
      summary: string | null;
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
      summary: this.normalizeNullableText(source.summary),
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
            summary: null,
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

  private async queueTargetTranslations(
    postId: string,
    originalLanguageId: number,
    transaction: Transaction,
  ): Promise<void> {
    await this.postTranslationModel.update(
      {
        translation_status: 'queued',
        updated_at: new Date(),
      },
      {
        where: {
          post_id: postId,
          language_id: { [Op.ne]: originalLanguageId },
          translation_status: { [Op.in]: ['not_started', 'failed'] },
        },
        transaction,
      },
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
      },
    );
  }

  private hasSourceChanged(
    currentSource: PostTranslation | null,
    nextSource: {
      languageId: number;
      title: string;
      summary: string | null;
      content: string;
    },
  ): boolean {
    if (!currentSource) {
      return true;
    }

    return (
      currentSource.language_id !== nextSource.languageId ||
      currentSource.title !== nextSource.title.trim() ||
      currentSource.summary !== this.normalizeNullableText(nextSource.summary) ||
      currentSource.content !== nextSource.content
    );
  }

  private normalizeTargetLanguageIds(targetLanguageIds: number[] | undefined, originalLanguageId: number): number[] {
    return [...new Set(targetLanguageIds ?? [])].filter((languageId) => languageId !== originalLanguageId);
  }

  private normalizeNullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private sanitizeContent(content: string): string {
    return sanitizeHtml(content, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'img',
        'audio',
        'video',
        'source',
        'track',
        'figure',
        'figcaption',
        'h1',
        'h2',
        'h3',
        'span',
      ],
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        audio: ['src', 'controls', 'preload', 'title'],
        video: ['src', 'controls', 'playsinline', 'preload', 'poster', 'title', 'width', 'height'],
        source: ['src', 'type'],
        track: ['default', 'kind', 'label', 'src', 'srclang'],
        span: ['class'],
        code: ['class'],
        pre: ['class'],
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      },
    });
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
        summary: translation.summary,
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
