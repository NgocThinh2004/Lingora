import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { CategoryTranslation } from '../../categories/models/category-translation.model';
import { Category } from '../../categories/models/category.model';
import { Language } from '../../languages/models/language.model';
import { User } from '../../users/models/user.model';
import { PostTranslation } from '../models/post-translation.model';
import { Post } from '../models/post.model';
import { AdminPostsQueryDto, ReviewAdminPostDto } from './dto/admin-posts.dto';
import { removeAccents } from '../../../utils/string.util';

type UiStatus = 'pending' | 'approved' | 'rejected';

@Injectable()
export class AdminPostsService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly translationModel: typeof PostTranslation,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation) private readonly categoryTranslationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
  ) {}

  async findAll(query: AdminPostsQueryDto) {
    const posts = await this.buildViews(query.language);
    const search = removeAccents(query.search.trim().toLocaleLowerCase());
    const filtered = posts.filter(post => {
      const matchesSearch = !search || [post.title, post.author.name, post.category?.name]
        .some(value => removeAccents(value?.toLocaleLowerCase() || '').includes(search));
      const matchesStatus = query.status === 'all' || post.status === query.status;
      const matchesCategory = !query.categoryId || post.category?.id === query.categoryId;
      return matchesSearch && matchesStatus && matchesCategory;
    });
    filtered.sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
    const start = (query.page - 1) * query.limit;
    return {
      data: filtered.slice(start, start + query.limit).map(({ content, reviewNote, ...post }) => post),
      meta: {
        pagination: {
          total: filtered.length,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(filtered.length / query.limit),
        },
      },
    };
  }

  async findOne(postId: string, language?: string) {
    const posts = await this.buildViews(language, [postId]);
    if (!posts[0]) {
      throw new NotFoundException('Post not found');
    }
    return posts[0];
  }

  async review(postId: string, dto: ReviewAdminPostDto, language?: string) {
    if (dto.decision === 'reject' && !dto.note?.trim()) {
      throw new BadRequestException('A review note is required when rejecting a post');
    }
    await this.sequelize.transaction(async transaction => {
      const post = await this.postModel.findOne({
        where: { id: postId, deleted_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
      const now = new Date();
      await post.update({
        status: dto.decision === 'approve' ? 'published' : 'rejected',
        review_note: dto.note?.trim() || null,
        published_at: dto.decision === 'approve' ? (post.published_at ?? now) : post.published_at,
        updated_at: now,
      }, { transaction });
      await this.translationModel.update({
        translation_status: dto.decision === 'approve' ? 'queued' : 'not_started',
        updated_at: now,
      }, {
        where: {
          post_id: postId,
          language_id: { [Op.ne]: post.original_language_id },
          ...(dto.decision === 'approve' ? { translation_status: { [Op.ne]: 'completed' } } : {}),
        },
        transaction,
        individualHooks: true,
      });
    });
    return this.findOne(postId, language);
  }

  async getDashboardMetrics(languageCode?: string) {
    const posts = await this.postModel.findAll({
      attributes: ['id', 'category_id', 'status', 'view_count'],
      where: { deleted_at: null },
    });
    const postIds = posts.map(post => post.id);
    const categoryIds = [...new Set(posts
      .map(post => post.category_id)
      .filter((id): id is number => id !== null))];
    const languages = await this.languageModel.findAll({
      attributes: ['id', 'code', 'is_default', 'is_active'],
    });
    const normalizedLanguage = languageCode?.trim().toLowerCase();
    const displayLanguage = languages.find(language =>
      language.code === normalizedLanguage && language.is_active,
    ) ?? languages.find(language => language.is_default)
      ?? languages.find(language => language.is_active);
    const [translations, categories, categoryTranslations] = await Promise.all([
      postIds.length
        ? this.translationModel.findAll({
            attributes: [
              'post_id',
              'language_id',
              'title',
              'content',
              'translation_status',
              'translation_provider',
            ],
            where: { post_id: { [Op.in]: postIds } },
          })
        : [],
      categoryIds.length
        ? this.categoryModel.findAll({ where: { id: { [Op.in]: categoryIds } } })
        : [],
      categoryIds.length
        ? this.categoryTranslationModel.findAll({
            where: { category_id: { [Op.in]: categoryIds } },
          })
        : [],
    ]);

    const byStatus: Record<string, number> = {};
    for (const post of posts) {
      byStatus[post.status] = (byStatus[post.status] ?? 0) + 1;
    }

    const rankedTranslations = new Map(translations
      .filter(translation => {
        const provider = translation.translation_provider?.trim().toLowerCase();
        return translation.language_id === displayLanguage?.id
          && translation.translation_status === 'completed'
          && Boolean(translation.title?.trim())
          && Boolean(translation.content?.trim())
          && provider !== 'mock';
      })
      .map(translation => [String(translation.post_id), translation]));
    const publicPosts = posts.filter(post => post.status === 'approved' || post.status === 'published');
    const topArticles = [...publicPosts]
      .filter(post => rankedTranslations.has(String(post.id)))
      .sort((left, right) => right.view_count - left.view_count)
      .slice(0, 10)
      .map(post => ({
        id: String(post.id),
        title: rankedTranslations.get(String(post.id))!.title!,
        viewCount: post.view_count,
      }));

    const categoryCounts = new Map<number, number>();
    for (const post of publicPosts) {
      if (post.category_id !== null) {
        categoryCounts.set(post.category_id, (categoryCounts.get(post.category_id) ?? 0) + 1);
      }
    }
    const categorizedTotal = [...categoryCounts.values()].reduce((total, count) => total + count, 0);
    const topCategories = [...categoryCounts.entries()]
      .map(([categoryId, count]) => {
        const category = categories.find(item => item.id === categoryId);
        const names = categoryTranslations.filter(item => item.category_id === categoryId);
        const name = names.find(item => item.language_id === displayLanguage?.id)?.name
          ?? names[0]?.name
          ?? category?.slug
          ?? 'Uncategorized';
        return {
          id: categoryId,
          name,
          count,
          percentage: categorizedTotal ? Math.round((count / categorizedTotal) * 100) : 0,
        };
      })
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    return {
      total: posts.length,
      totalViews: posts.reduce((total, post) => total + post.view_count, 0),
      pendingReview: byStatus.pending_review ?? 0,
      byStatus,
      topArticles,
      topCategories,
    };
  }

  private async buildViews(languageCode?: string, postIds?: string[]) {
    const posts = await this.postModel.findAll({
      where: {
        deleted_at: null,
        status: { [Op.in]: ['pending_review', 'approved', 'rejected', 'published'] },
        ...(postIds ? { id: { [Op.in]: postIds } } : {}),
      },
    });
    if (!posts.length) {
      return [];
    }
    const ids = posts.map(post => post.id);
    const authorIds = [...new Set(posts.map(post => post.author_id))];
    const categoryIds = [...new Set(posts.map(post => post.category_id).filter((id): id is number => id !== null))];
    const [translations, authors, categories, categoryTranslations, languages] = await Promise.all([
      this.translationModel.findAll({ where: { post_id: { [Op.in]: ids } } }),
      this.userModel.findAll({ where: { id: { [Op.in]: authorIds } } }),
      categoryIds.length ? this.categoryModel.findAll({ where: { id: { [Op.in]: categoryIds } } }) : [],
      categoryIds.length ? this.categoryTranslationModel.findAll({ where: { category_id: { [Op.in]: categoryIds } } }) : [],
      this.languageModel.findAll(),
    ]);
    const languageMap = new Map(languages.map(item => [item.id, item]));
    const requestedLanguage = languages.find(item => item.code === languageCode);
    const defaultLanguage = languages.find(item => item.is_default);
    const authorMap = new Map(authors.map(item => [item.id, item]));
    const categoryMap = new Map(categories.map(item => [item.id, item]));

    return posts.map(post => {
      const postTranslations = translations.filter(item => item.post_id === post.id);
      const displayTranslation = postTranslations.find(item => item.language_id === post.original_language_id)
        ?? postTranslations.find(item => item.language_id === defaultLanguage?.id)
        ?? postTranslations.find(item => item.title)
        ?? postTranslations[0];
      const author = authorMap.get(post.author_id);
      const category = post.category_id ? categoryMap.get(post.category_id) : undefined;
      const categoryCandidates = categoryTranslations.filter(item => item.category_id === post.category_id);
      const categoryTranslation = categoryCandidates.find(item => item.language_id === requestedLanguage?.id)
        ?? categoryCandidates.find(item => item.language_id === defaultLanguage?.id)
        ?? categoryCandidates[0];
      const originalLanguage = languageMap.get(post.original_language_id);
      return {
        id: String(post.id),
        title: displayTranslation?.title || 'Untitled post',
        content: displayTranslation?.content ?? null,
        author: {
          id: String(post.author_id),
          name: author?.display_name || author?.username || 'Unknown author',
          avatarUrl: author?.avatar ?? null,
        },
        category: category ? {
          id: category.id,
          name: categoryTranslation?.name || category.slug,
          status: category.status,
        } : null,
        submittedAt: post.created_at,
        originalLanguage: originalLanguage ? this.languageView(originalLanguage) : null,
        translations: postTranslations.map(item => ({
          id: String(item.id),
          ...this.languageView(languageMap.get(item.language_id)),
          status: item.translation_status,
          isOriginal: item.language_id === post.original_language_id,
        })),
        status: this.uiStatus(post.status),
        workflowStatus: post.status,
        reviewNote: post.review_note,
      };
    });
  }

  private languageView(language?: Language) {
    return {
      languageId: language?.id ?? 0,
      code: language?.code ?? '--',
      name: language?.name ?? 'Unknown language',
      nativeName: language?.native_name ?? 'Unknown language',
      flagCode: language?.flag_code ?? null,
    };
  }

  private uiStatus(status: Post['status']): UiStatus {
    if (status === 'rejected') return 'rejected';
    if (status === 'approved' || status === 'published') return 'approved';
    return 'pending';
  }
}
