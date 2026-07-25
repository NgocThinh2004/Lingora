import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal } from 'sequelize';
import { User } from '../models/user.model';

@Injectable()
export class PublicUsersService {
  constructor(@InjectModel(User) private readonly userModel: typeof User) {}

  async getRecommended() {
    const users = await this.userModel.findAll({
      where: { status: 'active', deleted_at: null },
      order: [
        [literal(`(SELECT COUNT(*) FROM subscriptions WHERE author_id = User.id)`), 'DESC']
      ],
      limit: 10,
    });

    return users.map((u) => ({
      id: Number(u.id),
      name: u.display_name || u.username,
      handle: u.username,
      email: u.email,
      avatarUrl: u.avatar || null,
      bio: u.bio || null,
      role: u.role_id === 1 ? ('admin' as const) : ('member' as const),
      allowShowSubscribers: true,
      allowShowFollowing: true,
    }));
  }
}
