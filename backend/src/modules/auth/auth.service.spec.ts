import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService session management', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let user: Record<string, any>;

  let usersService: {
    findByEmailOrUsername: jest.Mock;
    findById: jest.Mock;
    findByEmailForUpdate: jest.Mock;
    clearPasswordResetOtp: jest.Mock;
    getRoleById: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let mailService: { sendPasswordResetOtp: jest.Mock };
  let sequelize: { transaction: jest.Mock };
  let refreshTokenModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let service: AuthService;

  beforeEach(() => {
    user = {
      id: '7',
      email: 'member@example.com',
      username: 'member',
      display_name: 'Member',
      avatar: null,
      password: '',
      role_id: 2,
      status: 'active',
      password_reset_otp_hash: null,
      password_reset_expires_at: null,
      password_reset_attempts: 0,
      password_reset_sent_at: null,
      update: jest.fn(async (values: Record<string, unknown>) => {
        Object.assign(user, values);
      }),
    };
    usersService = {
      findByEmailOrUsername: jest.fn(),
      findById: jest.fn(),
      findByEmailForUpdate: jest.fn(),
      clearPasswordResetOtp: jest.fn().mockResolvedValue(undefined),
      getRoleById: jest.fn().mockResolvedValue({ name: 'member' }),
    };
    jwtService = { sign: jest.fn().mockReturnValue('access-token') };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          REFRESH_TOKEN_TTL: '7d',
          RESET_OTP_TTL_MINUTES: '5',
          RESET_OTP_RESEND_SECONDS: '60',
          BCRYPT_ROUNDS: '4',
        };
        return values[key];
      }),
    };
    mailService = { sendPasswordResetOtp: jest.fn().mockResolvedValue(undefined) };
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
      mailService as never,
      sequelize as never,
      refreshTokenModel as never,
    );
  });

  it('creates and emails a hashed six-digit password reset OTP', async () => {
    usersService.findByEmailForUpdate.mockResolvedValue(user);

    await expect(service.forgotPassword(' Member@Example.COM ')).resolves.toEqual({
      message: 'If an account exists for this email, a password reset code has been sent.',
    });

    expect(usersService.findByEmailForUpdate).toHaveBeenCalledWith(
      'member@example.com',
      transaction,
    );
    const emailedOtp = mailService.sendPasswordResetOtp.mock.calls[0][1];
    expect(emailedOtp).toMatch(/^\d{6}$/);
    expect(user.password_reset_otp_hash).not.toBe(emailedOtp);
    await expect(bcrypt.compare(emailedOtp, user.password_reset_otp_hash)).resolves.toBe(true);
    expect(user.password_reset_expires_at).toBeInstanceOf(Date);
    expect(user.password_reset_attempts).toBe(0);
    expect(user.password_reset_sent_at).toBeInstanceOf(Date);
  });

  it('returns the same response without sending mail for an unknown email', async () => {
    usersService.findByEmailForUpdate.mockResolvedValue(null);

    await expect(service.forgotPassword('missing@example.com')).resolves.toEqual({
      message: 'If an account exists for this email, a password reset code has been sent.',
    });
    expect(mailService.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('does not replace or resend an OTP during the cooldown', async () => {
    user.password_reset_sent_at = new Date();
    usersService.findByEmailForUpdate.mockResolvedValue(user);

    await service.forgotPassword(user.email);

    expect(user.update).not.toHaveBeenCalled();
    expect(mailService.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('clears the newly-created OTP when email delivery fails', async () => {
    usersService.findByEmailForUpdate.mockResolvedValue(user);
    mailService.sendPasswordResetOtp.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(service.forgotPassword(user.email)).resolves.toEqual({
      message: 'If an account exists for this email, a password reset code has been sent.',
    });

    expect(usersService.clearPasswordResetOtp).toHaveBeenCalledWith(
      user.id,
      user.password_reset_otp_hash,
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
