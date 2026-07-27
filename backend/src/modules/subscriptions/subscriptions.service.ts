import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Subscription, User } from '../../database/models';
import { PublicPostsService } from '../posts/public/public-posts.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly postsService: PublicPostsService,
  ) {}

  async list(subscriberId: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: subscriberId },
      order: [['created_at', 'DESC']],
    });
    const authorIds = subscriptions.map(item => item.author_id);
    const authors = authorIds.length
      ? await this.userModel.findAll({ where: { id: authorIds, status: 'active', deleted_at: null } })
      : [];
    const publicPosts = await this.postsService.listFeed({ limit: 50 });
    return {
      authors: authors.map(author => ({
        id: author.id,
        username: author.username,
        displayName: author.display_name,
        avatarUrl: author.avatar,
        bio: author.bio,
      })),
      posts: publicPosts.items.filter(post => authorIds.some(id => String(id) === String(post.authorId))),
    };
  }

  async subscribe(subscriberId: string, authorId: string) {
    if (subscriberId === authorId) {
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

  async stats(userId: string) {
    const [followers, following] = await Promise.all([
      this.subscriptionModel.count({ where: { author_id: userId } }),
      this.subscriptionModel.count({ where: { subscriber_id: userId } }),
    ]);
    return { followers, following };
  }

  async listFollowers(userId: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { author_id: userId },
      order: [['created_at', 'DESC']],
    });
    return this.listActiveUsers(subscriptions.map(item => item.subscriber_id));
  }

  async listFollowing(userId: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: userId },
      order: [['created_at', 'DESC']],
    });
    return this.listActiveUsers(subscriptions.map(item => item.author_id));
  }

  async checkSubscription(subscriberId: string, authorId: string) {
    const sub = await this.subscriptionModel.findOne({ where: { subscriber_id: subscriberId, author_id: authorId } });
    return { subscribed: !!sub };
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
