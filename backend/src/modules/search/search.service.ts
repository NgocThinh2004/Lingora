import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User } from '../users/models/user.model';
import { Category } from '../categories/models/category.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Post } from '../posts/models/post.model';
import { PostTranslation } from '../posts/models/post-translation.model';
import { Subscription } from '../subscriptions/models/subscription.model';
import { removeAccents } from '../../utils/string.util';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation) private readonly categoryTranslationModel: typeof CategoryTranslation,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
  ) {}

  async globalSearch(q: string, userId?: number) {
    if (!q || !q.trim()) return { data: { users: [], categories: [], posts: [] } };
    const keyword = `%${removeAccents(q.trim())}%`;

    // 1. Search Users (limit 3)
    const users = await this.userModel.findAll({
      where: {
        [Op.or]: [
          { unaccented_display_name: { [Op.like]: keyword } },
          { username: { [Op.like]: keyword } }
        ]
      },
      attributes: ['id', 'display_name', 'username', 'avatar', 'bio'],
      limit: 3
    });

    // 2. Search Categories (limit 3)
    const catTranslations = await this.categoryTranslationModel.findAll({
      where: { unaccented_name: { [Op.like]: keyword } },
      attributes: ['category_id']
    });
    const catIdsFromName = catTranslations.map(t => Number(t.category_id));

    const categories = await this.categoryModel.findAll({
      where: {
        [Op.or]: [
          { slug: { [Op.like]: keyword } },
          { id: { [Op.in]: catIdsFromName.length ? catIdsFromName : [0] } }
        ],
        status: 'active'
      },
      limit: 3
    });
    const categoryIds = categories.map(c => Number(c.id));
    const allCatTranslations = categoryIds.length ? await this.categoryTranslationModel.findAll({
      where: { category_id: categoryIds }
    }) : [];

    // 3. Search Posts by Title ONLY (limit 4)
    const postTranslations = await this.postTranslationModel.findAll({
      where: {
        unaccented_title: { [Op.like]: keyword },
        translation_status: 'completed'
      },
      attributes: ['post_id', 'title']
    });
    const postIds = postTranslations.map(t => Number(t.post_id));

    const posts = await this.postModel.findAll({
      where: {
        id: { [Op.in]: postIds.length ? postIds : [0] },
        status: { [Op.in]: ['approved', 'published'] },
        deleted_at: null
      },
      limit: 4
    });

    const postAuthorIds = [...new Set(posts.map(p => Number(p.author_id)))];
    const postAuthors = postAuthorIds.length ? await this.userModel.findAll({
      where: { id: postAuthorIds },
      attributes: ['id', 'display_name', 'username', 'avatar']
    }) : [];

    const allUserIds = [...new Set([...users.map(u => Number(u.id)), ...postAuthorIds])];
    const followingRows = userId && allUserIds.length ? await this.subscriptionModel.findAll({
      where: { subscriber_id: userId, author_id: allUserIds },
      attributes: ['author_id']
    }) : [];
    const followingSet = new Set(followingRows.map(r => String(r.author_id)));

    return {
      data: {
        users: users.map(u => ({
          id: Number(u.id),
          name: u.display_name || u.username,
          handle: u.username,
          avatarUrl: u.avatar,
          isFollowing: followingSet.has(String(u.id))
        })),
        categories: categories.map(c => {
          const trans = allCatTranslations.find(t => Number(t.category_id) === Number(c.id));
          return {
            id: Number(c.id),
            slug: c.slug,
            name: trans?.name || c.slug,
          };
        }),
        posts: posts.map(p => {
          const trans = postTranslations.find(t => Number(t.post_id) === Number(p.id));
          const author = postAuthors.find(a => Number(a.id) === Number(p.author_id));
          return {
            id: Number(p.id),
            title: trans?.title || '',
            createdAt: p.published_at || p.created_at,
            author: {
              id: Number(author?.id || p.author_id),
              name: author?.display_name || author?.username,
              avatarUrl: author?.avatar
            }
          };
        })
      }
    };
  }
}
