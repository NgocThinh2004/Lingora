import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal } from 'sequelize';
import { User } from '../models/user.model';
import { Subscription } from '../../subscriptions/models/subscription.model';

@Injectable()
export class PublicUsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription
  ) {}

  async getRecommended(userId?: number) {
    const users = await this.userModel.findAll({
      where: { status: 'active', deleted_at: null },
      order: [
        [literal(`(SELECT COUNT(*) FROM subscriptions WHERE author_id = User.id)`), 'DESC']
      ],
      limit: 10,
    });

    const authorIds = users.map(u => Number(u.id));
    const followingRows = userId && authorIds.length ? await this.subscriptionModel.findAll({
      where: { subscriber_id: userId, author_id: authorIds },
      attributes: ['author_id']
    }) : [];
    const followingSet = new Set(followingRows.map(r => String(r.author_id)));

    return users.map((u) => ({
      id: Number(u.id),
      name: u.display_name || u.username,
      handle: u.username,
      avatarUrl: u.avatar || null,
      bio: u.bio || null,
      role: u.role_id === 1 ? ('admin' as const) : ('member' as const),
      allowShowSubscribers: true,
      allowShowFollowing: true,
      isFollowing: followingSet.has(String(u.id))
    }));
  }

  async getById(id: string, userId?: number) {
    const u = await this.userModel.findOne({
      where: { id, status: 'active', deleted_at: null },
    });

    if (!u) {
      throw new Error('User not found');
    }

    let isFollowing = false;
    if (userId) {
      const sub = await this.subscriptionModel.findOne({
        where: { subscriber_id: userId, author_id: u.id }
      });
      isFollowing = !!sub;
    }

    return {
      id: Number(u.id),
      name: u.display_name || u.username,
      handle: u.username,
      avatarUrl: u.avatar || null,
      bio: u.bio || null,
      role: u.role_id === 1 ? ('admin' as const) : ('member' as const),
      allowShowSubscribers: true,
      allowShowFollowing: true,
      isFollowing
    };
  }
}
