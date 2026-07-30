import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { Post } from '../models/post.model';
import { PostTranslation } from '../models/post-translation.model';
import { User } from '../../users/models/user.model';
import { Category } from '../../categories/models/category.model';
import { CategoryTranslation } from '../../categories/models/category-translation.model';
import { Language } from '../../languages/models/language.model';
import { removeAccents } from '../../../utils/string.util';
import { PostLike } from '../../likes/models/post-like.model';
import { PublicPostsQueryDto } from './dto/public-posts.dto';

@Injectable()
export class PublicPostsService {
  constructor(
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly categoryTranslationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(PostLike) private readonly postLikeModel: typeof PostLike,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async listFeed(
    query: PublicPostsQueryDto,
    postId?: number,
    userId?: number,
    followedAuthorIds?: Array<string | number>,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    // Load active languages map (mapping both number and string keys)
    const languages = await this.languageModel.findAll({ where: { is_active: true } });
    const languageMap = new Map<any, string>();
    languages.forEach((l) => {
      languageMap.set(l.id, l.code);
      languageMap.set(Number(l.id), l.code);
      languageMap.set(String(l.id), l.code);
    });

    // Handle category filter by slug or ID
    let categoryId: number | undefined;
    if (query.category) {
      const cat = await this.categoryModel.findOne({
        where: {
          [Op.or]: [
            { slug: query.category },
            ...(isNaN(Number(query.category)) ? [] : [{ id: Number(query.category) }]),
          ],
        },
      });
      if (cat) categoryId = cat.id;
    }

    const where: any = {
      deleted_at: null,
      // `approved` is retained for posts approved before approval began publishing
      // immediately. This keeps legacy public links and profile posts available.
      status: { [Op.in]: ['approved', 'published'] },
    };
    if (categoryId) {
      where.category_id = categoryId;
    }
    if (query.authorId) {
      where.author_id = query.authorId;
    } else if (followedAuthorIds?.length) {
      where.author_id = { [Op.in]: followedAuthorIds };
    }

    let matchingPostIds: number[] | null = null;
    const intersectPostIds = (ids: number[]) => {
      if (matchingPostIds === null) {
        matchingPostIds = [...new Set(ids)];
        return;
      }
      const allowed = new Set(ids);
      matchingPostIds = matchingPostIds.filter(id => allowed.has(id));
    };

    // Only expose posts with a completed translation in the selected locale.
    if (query.lang?.trim()) {
      const selectedLanguage = languages.find(language =>
        language.code === query.lang!.trim().toLowerCase(),
      );
      if (!selectedLanguage) {
        intersectPostIds([]);
      } else {
        const localizedTranslations = await this.postTranslationModel.findAll({
          where: {
            language_id: selectedLanguage.id,
            translation_status: 'completed',
            [Op.and]: [
              literal("TRIM(title) != ''"),
              literal("TRIM(content) != ''"),
            ],
          },
          attributes: ['post_id'],
        });
        intersectPostIds(localizedTranslations.map(item => Number(item.post_id)));
      }
    }

    if (query.q && query.q.trim()) {
      const keyword = `%${removeAccents(query.q.trim())}%`;
      const translationWhere: any = {
        translation_status: 'completed',
        unaccented_title: { [Op.like]: keyword },
      };
      
      if (query.lang) {
        const langModel = await this.languageModel.findOne({ where: { code: query.lang } });
        if (langModel) {
          translationWhere.language_id = langModel.id;
        }
      }

      const matchedTranslations = await this.postTranslationModel.findAll({
        where: translationWhere,
        attributes: ['post_id'],
      });
      intersectPostIds(matchedTranslations.map((t) => Number(t.post_id)));
    }
    const filteredPostIds = matchingPostIds as number[] | null;
    if (postId !== undefined) {
      where.id = filteredPostIds === null || filteredPostIds.includes(postId) ? postId : 0;
    } else if (filteredPostIds !== null) {
      where.id = { [Op.in]: filteredPostIds.length ? filteredPostIds : [0] };
    }

    const order: any = query.sort === 'trending'
      ? [
          [
            literal(
              `(view_count) + 
               (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = Post.id) * 5 + 
               (SELECT COUNT(*) FROM comments WHERE comments.post_id = Post.id AND comments.status = 'approved') * 10`
            ),
            'DESC',
          ],
          ['published_at', 'DESC'],
        ]
      : [
          ['published_at', 'DESC'],
          ['created_at', 'DESC'],
        ];

    const { rows: posts, count: total } = await this.postModel.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });

    if (!posts.length) {
      return {
        items: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const postIds = posts.map((p) => Number(p.id));
    const authorIds = [...new Set(posts.map((p) => Number(p.author_id)))];
    const categoryIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))] as number[];

    const [translations, authors, categories, categoryTranslations, userLikeRows] = await Promise.all([
      this.postTranslationModel.findAll({
        where: {
          post_id: postIds,
          translation_status: 'completed',
        },
      }),
      this.userModel.findAll({ where: { id: authorIds } }),
      categoryIds.length ? this.categoryModel.findAll({ where: { id: categoryIds } }) : [],
      categoryIds.length
        ? this.categoryTranslationModel.findAll({ where: { category_id: categoryIds } })
        : [],
      userId
        ? this.postLikeModel.findAll({
            where: { post_id: postIds, user_id: userId },
            attributes: ['post_id'],
          })
        : Promise.resolve([]),
    ]);

    const userLikes = new Set(userId ? userLikeRows.map((row: any) => String(row.post_id)) : []);

    const authorMap = new Map<any, User>();
    authors.forEach((u) => {
      authorMap.set(u.id, u);
      authorMap.set(Number(u.id), u);
      authorMap.set(String(u.id), u);
    });

    const categoryMap = new Map<any, Category>();
    categories.forEach((c) => {
      categoryMap.set(c.id, c);
      categoryMap.set(Number(c.id), c);
      categoryMap.set(String(c.id), c);
    });

    const items = posts.map((post) => {
      // authorMap is keyed by id/Number(id)/String(id), so a single lookup suffices
      const postAuthor = authorMap.get(post.author_id);
      const postCategory = post.category_id ? categoryMap.get(post.category_id) : null;

      const postTranslations = translations
        .filter((t) => Number(t.post_id) === Number(post.id))
        .map((t) => {
          // languageMap is keyed by id/Number(id)/String(id) — one lookup is enough
          const langCode = languageMap.get(t.language_id) || 'en';
          const origLangCode = languageMap.get(post.original_language_id) || 'en';

          return {
            id: Number(t.id),
            languageCode: langCode,
            title: t.title || '',
            contentHtml: t.content || '',
            source: (
              langCode === origLangCode
                ? 'original'
                : t.translation_provider
                  ? 'machine'
                  : 'human'
            ) as 'original' | 'human' | 'machine',
          };
        });

      let coverImageUrl: string | null = null;
      let coverVideoUrl: string | null = null;
      for (const t of postTranslations) {
        if (!t.contentHtml) continue;

        // Find the position of the first <img> and first <video>/<source> in the HTML
        const imgMatch = t.contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
        const videoMatch =
          t.contentHtml.match(/<video[^>]+src=["']([^"']+)["']/i) ||
          t.contentHtml.match(/<source[^>]+src=["']([^"']+)["']/i) ||
          t.contentHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);

        const imgIdx = imgMatch ? t.contentHtml.indexOf(imgMatch[0]) : Infinity;
        const videoIdx = videoMatch ? t.contentHtml.indexOf(videoMatch[0]) : Infinity;

        if (imgIdx === Infinity && videoIdx === Infinity) continue;

        // Whichever appears first in the HTML wins
        if (imgIdx <= videoIdx) {
          coverImageUrl = imgMatch![1];
        } else {
          coverVideoUrl = videoMatch![1];
        }
        break;
      }

      return {
        id: Number(post.id),
        authorId: Number(post.author_id),
        categoryId: post.category_id,
        originalLanguage: languageMap.get(post.original_language_id) || 'en',
        coverImageUrl,
        coverVideoUrl,
        // Legacy `approved` rows are public, so expose the public API contract
        // consistently instead of leaking the old workflow state.
        status: 'published',
        viewCount: post.view_count || 0,
        commentCount: post.comment_count || 0,
        likeCount: post.like_count || 0,
        liked: userLikes.has(String(post.id)),
        author: {
          id: Number(postAuthor?.id || post.author_id),
          name: postAuthor?.display_name || postAuthor?.username || 'Tác giả',
          handle: postAuthor?.username || 'author',
          email: postAuthor?.email,
          avatarUrl: postAuthor?.avatar || null,
          bio: postAuthor?.bio || null,
          role: postAuthor?.role_id === 1 ? ('admin' as const) : ('member' as const),
          allowShowSubscribers: true,
          allowShowFollowing: true,
        },
        category: postCategory
          ? {
              id: postCategory.id,
              slug: postCategory.slug,
              isActive: postCategory.status === 'active',
              translations: categoryTranslations
                .filter((ct) => Number(ct.category_id) === Number(postCategory.id))
                .map((ct) => ({
                  id: Number(ct.id),
                  languageCode: languageMap.get(ct.language_id) || 'en',
                  name: ct.name,
                })),
            }
          : null,
        translations: postTranslations,
        createdAt: post.published_at
          ? post.published_at.toISOString()
          : post.created_at.toISOString(),
      };
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listFeedByAuthorIds(
    authorIds: string[],
    options: { limit?: number; page?: number; lang?: string } = {},
    userId?: number,
  ) {
    if (!authorIds.length) return { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    const limit = options.limit || 50;
    const page = options.page || 1;

    const result = await this.listFeed(
      { page, limit, lang: options.lang },
      undefined,
      userId,
      authorIds,
    );
    return result;
  }

  async getById(id: number, userId?: number, lang?: string, ip?: string) {
    const post = await this.postModel.findOne({
      where: { id, deleted_at: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // View Count Spam Prevention (1 view / 1 hour / IP or UserId)
    const viewerId = userId ? `user:${userId}` : (ip ? `ip:${ip}` : `ip:unknown`);
    const cacheKey = `view:post:${id}:${viewerId}`;
    const alreadyViewed = await this.cacheManager.get(cacheKey);

    if (!alreadyViewed) {
      post.increment('view_count', { by: 1 }).catch(() => null);
      // TTL is in milliseconds for cache-manager v5+, but v4/NestJS cache-manager might use seconds.
      // NestJS cache-manager default is ms. Let's pass 3600000ms (1 hour).
      await this.cacheManager.set(cacheKey, true, 3600000).catch(() => null);
    }

    const result = await this.listFeed({ page: 1, limit: 1, lang }, id, userId);
    const found = result.items.find((p) => p.id === Number(id));
    if (!found) throw new NotFoundException('Post details not found');
    return found;
  }

  async getRelated(id: number, userId?: number, lang?: string) {
    const post = await this.postModel.findOne({
      where: { id, deleted_at: null, status: { [Op.in]: ['approved', 'published'] } },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Try posts from the same category first, fallback to newest if not enough
    const query = post.category_id
      ? { category: String(post.category_id), limit: 4, lang }
      : { limit: 4, lang };
    const feed = await this.listFeed(query, undefined, userId);
    const related = feed.items.filter(item => item.id !== Number(id)).slice(0, 3);
    if (related.length >= 3 || !post.category_id) return related;

    // category had no other posts — fall back to newest
    const newest = await this.listFeed({ limit: 4, lang }, undefined, userId);
    const seen = new Set([Number(id), ...related.map(item => item.id)]);
    const fallback = newest.items.filter(item => !seen.has(item.id));
    return [...related, ...fallback].slice(0, 3);
  }
}
