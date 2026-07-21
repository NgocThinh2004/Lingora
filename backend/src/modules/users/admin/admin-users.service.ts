import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { RefreshToken } from '../../auth/models/refresh-token.model';
import { Role } from '../models/role.model';
import { User } from '../models/user.model';
import {
  AdminUsersQueryDto,
  AdminUserStatus,
  UpdateAdminUserDto,
} from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Role) private readonly roleModel: typeof Role,
    @InjectModel(RefreshToken) private readonly refreshTokenModel: typeof RefreshToken,
  ) {}

  async findAll(query: AdminUsersQueryDto) {
    let where: WhereOptions = {};
    const search = query.search?.trim();

    if (search) {
      where = {
        ...where,
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { display_name: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    if (query.status) {
      where = {
        ...where,
        status: query.status === 'inactive'
          ? { [Op.in]: ['inactive', 'banned'] }
          : query.status,
      };
    }

    if (query.role) {
      const role = await this.roleModel.findOne({ where: { name: query.role } });
      if (!role) {
        return this.emptyPage(query.page, query.limit);
      }
      where = { ...where, role_id: role.id };
    }

    const [{ rows, count }, directoryTotal] = await Promise.all([
      this.userModel.findAndCountAll({
      where,
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      }),
      this.userModel.count(),
    ]);
    const roles = await this.getRolesByIds(rows.map(user => user.role_id));

    return {
      data: rows.map(user => this.toAdminUser(user, roles.get(user.role_id))),
      meta: {
        pagination: {
          total: count,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(count / query.limit),
        },
        directoryTotal,
      },
    };
  }

  async findOne(userId: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleModel.findByPk(user.role_id);
    return this.toAdminUser(user, role);
  }

  async update(actorId: string, userId: string, dto: UpdateAdminUserDto) {
    if (dto.displayName === undefined && dto.bio === undefined && !dto.role && !dto.status) {
      throw new BadRequestException('Provide profile or access fields to update');
    }

    return this.sequelize.transaction(async transaction => {
      const user = await this.userModel.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const currentRole = await this.roleModel.findByPk(user.role_id, { transaction });
      const nextRole = dto.role
        ? await this.roleModel.findOne({ where: { name: dto.role }, transaction })
        : currentRole;
      if (!nextRole) {
        throw new BadRequestException('Role not found');
      }

      const requestedStatus = dto.status ?? user.status;
      if (currentRole?.name === 'admin' && nextRole.name !== 'admin') {
        throw new BadRequestException('Admin roles are protected and cannot be downgraded');
      }
      if (currentRole?.name === 'admin' && requestedStatus !== 'active') {
        throw new BadRequestException('Admin accounts cannot be deactivated');
      }
      const nextStatus = nextRole.name === 'admin' ? 'active' : requestedStatus;
      if (actorId === user.id && nextStatus !== 'active') {
        throw new BadRequestException('You cannot deactivate or ban your own account');
      }
      if (actorId === user.id && nextRole.name !== 'admin') {
        throw new BadRequestException('You cannot remove your own admin role');
      }

      await user.update(
        {
          display_name: dto.displayName?.trim() ?? user.display_name,
          bio: dto.bio === undefined ? user.bio : dto.bio.trim() || null,
          role_id: nextRole.id,
          status: nextStatus,
          updated_at: new Date(),
        },
        { transaction },
      );

      if (nextStatus !== 'active') {
        const now = new Date();
        await this.refreshTokenModel.update(
          { revoked_at: now, last_used_at: now },
          {
            where: { user_id: user.id, revoked_at: null },
            transaction,
          },
        );
      }

      return this.toAdminUser(user, nextRole);
    });
  }

  private async getRolesByIds(roleIds: number[]): Promise<Map<number, Role>> {
    const uniqueRoleIds = [...new Set(roleIds)];
    if (!uniqueRoleIds.length) {
      return new Map();
    }

    const roles = await this.roleModel.findAll({
      where: { id: { [Op.in]: uniqueRoleIds } },
    });
    return new Map(roles.map(role => [role.id, role]));
  }

  private toAdminUser(user: User, role: Role | null | undefined) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar,
      bio: user.bio,
      role: role?.name ?? null,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private emptyPage(page: number, limit: number) {
    return {
      data: [],
      meta: {
        pagination: { total: 0, page, limit, totalPages: 0 },
        directoryTotal: 0,
      },
    };
  }
}
