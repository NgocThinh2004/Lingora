import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal } from 'sequelize';
import { User } from '../models/user.model';
import { Subscription } from '../../subscriptions/models/subscription.model';

@Injectable()
export class PublicUsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
  ) {}

  async getRecommended() {
    const users = await this.userModel.findAll({
      where: { status: 'active', deleted_at: null },
      order: [
        [literal(`(SELECT COUNT(*) FROM subscriptions WHERE author_id = User.id)`), 'DESC']
      ],
      limit: 10,
    });

    return users.map(user => this.serializeUser(user));
  }

  async getProfile(id: number) {
    const user = await this.userModel.findOne({
      where: { id, status: 'active', deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    const [followersCount, followingCount] = await Promise.all([
      this.subscriptionModel.count({ where: { author_id: String(id) } }),
      this.subscriptionModel.count({ where: { subscriber_id: String(id) } }),
    ]);

    return {
      ...this.serializeUser(user),
      followersCount,
      followingCount,
    };
  }

  async getFollowers(id: number) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { author_id: String(id) },
      order: [['created_at', 'DESC']],
    });
    return this.listUsers(subscriptions.map(item => item.subscriber_id));
  }

  async getFollowing(id: number) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: String(id) },
      order: [['created_at', 'DESC']],
    });
    return this.listUsers(subscriptions.map(item => item.author_id));
  }

  private async listUsers(ids: string[]) {
    if (!ids.length) {
      return [];
    }
    const users = await this.userModel.findAll({
      where: { id: ids, status: 'active', deleted_at: null },
    });
    const usersById = new Map(users.map(user => [String(user.id), user]));
    return ids
      .map(id => usersById.get(String(id)))
      .filter((user): user is User => Boolean(user))
      .map(user => this.serializeUser(user));
  }

  private serializeUser(user: User) {
    return {
      id: Number(user.id),
      name: user.display_name || user.username,
      handle: user.username,
      avatarUrl: user.avatar || null,
      bio: user.bio || null,
      role: user.role_id === 1 ? ('admin' as const) : ('member' as const),
      accentColor: user.accent_color || null,
      backgroundColor: user.background_color || null,
      allowShowSubscribers: true,
      allowShowFollowing: true,
    };
  }
}
