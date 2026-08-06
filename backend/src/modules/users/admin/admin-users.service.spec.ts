import { BadRequestException } from '@nestjs/common';
import { Op } from 'sequelize';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let user: Record<string, any>;
  let sequelize: { transaction: jest.Mock };
  let userModel: { findAndCountAll: jest.Mock; findByPk: jest.Mock; count: jest.Mock };
  let roleModel: { findOne: jest.Mock; findAll: jest.Mock; findByPk: jest.Mock };
  let refreshTokenModel: { update: jest.Mock };
  let service: AdminUsersService;

  beforeEach(() => {
    user = {
      id: '7',
      email: 'member@example.com',
      username: 'member',
      display_name: 'Member',
      avatar: null,
      bio: 'Reader',
      role_id: 2,
      status: 'active',
      password: 'must-never-be-returned',
      created_at: new Date('2026-07-01T00:00:00Z'),
      updated_at: new Date('2026-07-01T00:00:00Z'),
      update: jest.fn(async (values: Record<string, unknown>) => Object.assign(user, values)),
    };
    sequelize = {
      transaction: jest.fn(async callback => callback(transaction)),
    };
    userModel = {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      count: jest.fn().mockResolvedValue(12),
    };
    roleModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    };
    refreshTokenModel = {
      update: jest.fn().mockResolvedValue([0]),
    };
    service = new AdminUsersService(
      sequelize as never,
      userModel as never,
      roleModel as never,
      refreshTokenModel as never,
    );
  });

  it('returns a safe, paginated user directory', async () => {
    userModel.findAndCountAll.mockResolvedValue({ rows: [user], count: 1 });
    roleModel.findAll.mockResolvedValue([{ id: 2, name: 'member' }]);

    const result = await service.findAll({
      search: 'member',
      status: 'active',
      page: 1,
      limit: 10,
    });

    expect(userModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      offset: 0,
      where: expect.objectContaining({
        status: 'active',
        [Op.or]: expect.any(Array),
      }),
    }));
    expect(result.meta).toEqual(expect.objectContaining({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }));
    expect(result.meta.directoryTotal).toBe(12);
    expect(result.data[0]).toEqual(expect.objectContaining({
      id: user.id,
      email: user.email,
      role: 'member',
      status: 'active',
    }));
    expect(result.data[0]).not.toHaveProperty('password');
  });

  it('treats banned accounts as inactive for the prototype status filter', async () => {
    userModel.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    roleModel.findAll.mockResolvedValue([]);

    await service.findAll({ status: 'inactive', page: 1, limit: 8 });

    expect(userModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { [Op.in]: ['inactive', 'banned'] },
      }),
    }));
  });

  it('prevents an admin from banning their own account', async () => {
    user.id = '1';
    user.role_id = 1;
    userModel.findByPk.mockResolvedValue(user);
    roleModel.findByPk.mockResolvedValue({ id: 1, name: 'admin' });

    await expect(service.update('1', '1', { status: 'banned' }))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(user.update).not.toHaveBeenCalled();
    expect(refreshTokenModel.update).not.toHaveBeenCalled();
  });

  it('bans another user and revokes all of their active refresh tokens', async () => {
    userModel.findByPk.mockResolvedValue(user);
    roleModel.findByPk.mockResolvedValue({ id: 2, name: 'member' });
    refreshTokenModel.update.mockResolvedValue([3]);

    const result = await service.update('1', user.id, { status: 'banned' });

    expect(result.status).toBe('banned');
    expect(refreshTokenModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(Date) }),
      expect.objectContaining({
        where: { user_id: user.id, revoked_at: null },
        transaction,
      }),
    );
  });

  it('changes another user role without exposing sensitive fields', async () => {
    userModel.findByPk.mockResolvedValue(user);
    roleModel.findByPk.mockResolvedValue({ id: 2, name: 'member' });
    roleModel.findOne.mockResolvedValue({ id: 1, name: 'admin' });

    const result = await service.update('1', user.id, { role: 'admin' });

    expect(user.role_id).toBe(1);
    expect(result.role).toBe('admin');
    expect(result).not.toHaveProperty('password');
    expect(refreshTokenModel.update).not.toHaveBeenCalled();
  });

  it('updates profile fields used by the admin details panel', async () => {
    userModel.findByPk.mockResolvedValue(user);
    roleModel.findByPk.mockResolvedValue({ id: 2, name: 'member' });

    const result = await service.update('1', user.id, {
      displayName: 'Updated member',
      bio: 'Updated bio',
    });

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Updated member',
        bio: 'Updated bio',
      }),
      { transaction },
    );
    expect(result.displayName).toBe('Updated member');
    expect(result.bio).toBe('Updated bio');
  });

  it('protects existing admin accounts from being downgraded', async () => {
    user.role_id = 1;
    userModel.findByPk.mockResolvedValue(user);
    roleModel.findByPk.mockResolvedValue({ id: 1, name: 'admin' });
    roleModel.findOne.mockResolvedValue({ id: 2, name: 'member' });

    await expect(service.update('2', user.id, { role: 'member' }))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(user.update).not.toHaveBeenCalled();
  });
});
