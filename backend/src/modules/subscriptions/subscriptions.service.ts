import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn } from 'sequelize';
import { Subscription, User } from '../../database/models';
import { PublicPostsService } from '../posts/public/public-posts.service';
import { Op } from 'sequelize';
import { removeAccents } from '../../utils/string.util';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly postsService: PublicPostsService,
  ) {}

  async getFeed(subscriberId: string, authorIdFilter?: string, lang?: string, pageStr?: string, limitStr?: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: subscriberId },
    });
    
    const followingIds = subscriptions.map(item => String(item.author_id));
    if (!followingIds.length) {
      return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }

    let queryAuthorIds = followingIds;
    // Security: Only allow filtering by author if the user actually follows them
    if (authorIdFilter) {
      if (followingIds.includes(String(authorIdFilter))) {
        queryAuthorIds = [String(authorIdFilter)];
      } else {
        return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
      }
    }

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    return await this.postsService.listFeedByAuthorIds(queryAuthorIds, { limit, page, lang }, Number(subscriberId));
  }

  async subscribe(subscriberId: string, authorId: string) {
    if (String(subscriberId) === String(authorId)) {
      throw new ConflictException('You cannot subscribe to yourself');
    }
    const author = await this.userModel.findOne({ where: { id: authorId, status: 'active', deleted_at: null } });
    if (!author) throw new NotFoundException('Author not found');
    const [subscription] = await this.subscriptionModel.findOrCreate({
      where: { subscriber_id: subscriberId, author_id: authorId },
      defaults: { subscriber_id: subscriberId, author_id: authorId, last_viewed_at: null, created_at: new Date() },
    });
    return { authorId: subscription.author_id, subscribed: true };
  }

  async unsubscribe(subscriberId: string, authorId: string) {
    await this.subscriptionModel.destroy({ where: { subscriber_id: subscriberId, author_id: authorId } });
    return { authorId, subscribed: false };
  }


  async listFollowers(userId: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { author_id: userId },
      order: [['created_at', 'DESC']],
    });
    return this.listActiveUsers(subscriptions.map(item => item.subscriber_id));
  }

  async listFollowing(userId: string, q?: string, pageStr?: string, limitStr?: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: userId },
      order: [['created_at', 'DESC']],
    });
    if (!subscriptions.length) {
      return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }

    const authorIds = subscriptions.map(item => item.author_id);
    let whereClause: any = { id: authorIds, status: 'active', deleted_at: null };
    
    if (q) {
      const rawQ = q.trim();
      const qWithoutAt = rawQ.startsWith('@') ? rawQ.substring(1) : rawQ;
      const keyword = `%${removeAccents(rawQ)}%`;
      const keywordWithoutAt = `%${removeAccents(qWithoutAt)}%`;
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { username: { [Op.like]: keywordWithoutAt } },
          { unaccented_display_name: { [Op.like]: keyword } }
        ]
      };
    }

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : authorIds.length;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.userModel.findAndCountAll({
      where: whereClause,
      limit,
      offset
    });

    return {
      items: rows.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        bio: user.bio,
      })),
      meta: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit) || 1
      }
    };
  }


  async getDashboardMetrics() {
    const [total, followerGroups] = await Promise.all([
      this.subscriptionModel.count(),
      this.subscriptionModel.findAll({
        attributes: [
          'author_id',
          [fn('COUNT', col('id')), 'followerCount'],
        ],
        group: ['author_id'],
        order: [[fn('COUNT', col('id')), 'DESC'], ['author_id', 'ASC']],
        limit: 5,
        raw: true,
      }),
    ]);

    const rankedAuthors = followerGroups as unknown as Array<{
      author_id: string;
      followerCount: string | number;
    }>;
    const authorIds = rankedAuthors.map(item => item.author_id);
    const authors = authorIds.length
      ? await this.userModel.findAll({
          where: { id: authorIds, status: 'active', deleted_at: null },
        })
      : [];
    const authorsById = new Map(authors.map(author => [String(author.id), author]));

    const topUsers = rankedAuthors
      .map(item => ({ item, user: authorsById.get(String(item.author_id)) }))
      .filter((entry): entry is { item: typeof entry.item; user: User } => Boolean(entry.user))
      .map(({ item, user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        followerCount: Number(item.followerCount),
      }));

    return { total, topUsers };
  }

  private async listActiveUsers(userIds: string[]) {
    if (!userIds.length) {
      return [];
    }

    const users = await this.userModel.findAll({
      where: { id: userIds, status: 'active', deleted_at: null },
    });
    const usersById = new Map(users.map(user => [String(user.id), user]));

    return userIds
      .map(id => usersById.get(String(id)))
      .filter((user): user is User => Boolean(user))
      .map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        bio: user.bio,
      }));
  }
}
