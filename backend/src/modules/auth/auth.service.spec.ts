import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService session management', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const user = {
    id: '7',
    email: 'member@example.com',
    username: 'member',
    display_name: 'Member',
    avatar: null,
    password: '',
    role_id: 2,
    status: 'active',
  };

  let usersService: {
    findByEmailOrUsername: jest.Mock;
    findById: jest.Mock;
    getRoleById: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let sequelize: { transaction: jest.Mock };
  let refreshTokenModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmailOrUsername: jest.fn(),
      findById: jest.fn(),
      getRoleById: jest.fn().mockResolvedValue({ name: 'member' }),
    };
    jwtService = { sign: jest.fn().mockReturnValue('access-token') };
    configService = {
      get: jest.fn((key: string) => key === 'REFRESH_TOKEN_TTL' ? '7d' : undefined),
    };
    sequelize = {
      transaction: jest.fn(async callback => callback(transaction)),
    };
    refreshTokenModel = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue([0]),
    };

    service = new AuthService(
      usersService as never,
      jwtService as never,
      configService as never,
      sequelize as never,
      refreshTokenModel as never,
    );
  });

  it('stores only a hash when login creates a refresh token', async () => {
    user.password = await bcrypt.hash('password123', 4);
    usersService.findByEmailOrUsername.mockResolvedValue(user);

    const session = await service.login(
      { emailOrUsername: user.email, password: 'password123' },
      { deviceInfo: 'PostmanRuntime', ipAddress: '127.0.0.1' },
    );

    const stored = refreshTokenModel.create.mock.calls[0][0];
    expect(session.accessToken).toBe('access-token');
    expect(session.refreshToken).toBeTruthy();
    expect(stored.token_hash).toHaveLength(64);
    expect(stored.token_hash).not.toBe(session.refreshToken);
    expect(stored.device_info).toBe('PostmanRuntime');
    expect(session.user.role).toBe('member');
  });

  it('atomically revokes the old refresh token and creates a replacement', async () => {
    const storedToken = {
      user_id: user.id,
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null as Date | null,
      update: jest.fn(async (values: Record<string, unknown>) => {
        Object.assign(storedToken, values);
      }),
    };
    refreshTokenModel.findOne.mockResolvedValue(storedToken);
    usersService.findById.mockResolvedValue(user);

    const session = await service.refresh('valid-refresh-token');

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(refreshTokenModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: transaction.LOCK.UPDATE }),
    );
    expect(storedToken.revoked_at).toBeInstanceOf(Date);
    expect(session.refreshToken).toBeTruthy();
    expect(refreshTokenModel.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a refresh token after it has been rotated', async () => {
    refreshTokenModel.findOne.mockResolvedValue({
      revoked_at: new Date(),
    });

    await expect(service.refresh('already-used-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshTokenModel.create).not.toHaveBeenCalled();
  });

  it('marks an expired refresh token as revoked and rejects it', async () => {
    const storedToken = {
      expires_at: new Date(Date.now() - 1000),
      revoked_at: null,
      update: jest.fn(),
    };
    refreshTokenModel.findOne.mockResolvedValue(storedToken);

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(storedToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(Date) }),
      expect.any(Object),
    );
  });

  it('keeps logout idempotent and revokes every active session on logout-all', async () => {
    refreshTokenModel.update
      .mockResolvedValueOnce([0])
      .mockResolvedValueOnce([3]);

    await expect(service.logout('unknown-token')).resolves.toEqual({
      message: 'Logged out successfully',
    });
    await expect(service.logoutAll(user.id)).resolves.toEqual({
      message: 'Logged out from all devices successfully',
      revokedSessions: 3,
    });
  });
});
