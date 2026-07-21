import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UsersService } from '../users/users.service';
import { User } from '../users/models/user.model';
import { RefreshToken } from './models/refresh-token.model';
import { ChangePasswordDto, RegisterDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';

export interface SessionMetadata {
  deviceInfo?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly forgotPasswordMessage =
    'If an account exists for this email, a password reset code has been sent.';

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly sequelize: Sequelize,
    @InjectModel(RefreshToken)
    private readonly refreshTokenModel: typeof RefreshToken,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmailOrUsername(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Since we don't have username in RegisterDto but it's required in User model, we'll derive it from email for now
    // Alternatively, we can just use the email prefix if it's unique, but let's just make it unique
    const username = dto.email.split('@')[0] + Math.floor(Math.random() * 10000);

    const memberRole = await this.usersService.getRoleByName('member');
    if (!memberRole) {
      throw new BadRequestException('Default role not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      username, // Generated username
      display_name: dto.fullName,
      password: hashedPassword,
      role_id: memberRole.id,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { password, ...result } = user.toJSON();
    return result;
  }

  async login(dto: LoginDto, metadata: SessionMetadata = {}) {
    const user = await this.usersService.findByEmailOrUsername(dto.emailOrUsername);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(user, metadata);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...result } = user.toJSON();
    return result;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();
    const otpTtlMinutes = this.getPositiveConfigNumber('RESET_OTP_TTL_MINUTES', 5);
    const resendSeconds = this.getPositiveConfigNumber('RESET_OTP_RESEND_SECONDS', 60);

    const resetRequest = await this.sequelize.transaction(async transaction => {
      const user = await this.usersService.findByEmailForUpdate(normalizedEmail, transaction);

      // The public response is deliberately identical for missing and inactive accounts.
      if (!user || user.status !== 'active') {
        return null;
      }

      if (
        user.password_reset_sent_at &&
        now.getTime() - user.password_reset_sent_at.getTime() < resendSeconds * 1000
      ) {
        return null;
      }

      const otp = randomInt(100000, 1000000).toString();
      const bcryptRounds = this.getPositiveConfigNumber('BCRYPT_ROUNDS', 12);
      const otpHash = await bcrypt.hash(otp, bcryptRounds);

      await user.update(
        {
          password_reset_otp_hash: otpHash,
          password_reset_expires_at: new Date(now.getTime() + otpTtlMinutes * 60 * 1000),
          password_reset_attempts: 0,
          password_reset_sent_at: now,
          updated_at: now,
        },
        { transaction },
      );

      return { userId: user.id, email: user.email, otp, otpHash, otpTtlMinutes };
    });

    if (resetRequest) {
      try {
        await this.mailService.sendPasswordResetOtp(
          resetRequest.email,
          resetRequest.otp,
          resetRequest.otpTtlMinutes,
        );
      } catch (error) {
        // Clear only the OTP created by this request so a newer request cannot be erased.
        await this.usersService.clearPasswordResetOtp(resetRequest.userId, resetRequest.otpHash);
        this.logger.error('Unable to send password reset email', error);
      }
    }

    return { message: this.forgotPasswordMessage };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const now = new Date();
    const maxAttempts = this.getPositiveConfigNumber('RESET_OTP_MAX_ATTEMPTS', 5);

    const resetSucceeded = await this.sequelize.transaction(async transaction => {
      const user = await this.usersService.findByEmailForUpdate(dto.email, transaction);

      if (
        !user ||
        user.status !== 'active' ||
        !user.password_reset_otp_hash ||
        !user.password_reset_expires_at
      ) {
        return false;
      }

      if (
        user.password_reset_expires_at.getTime() <= now.getTime() ||
        user.password_reset_attempts >= maxAttempts
      ) {
        await user.update(this.getClearedPasswordResetFields(now), { transaction });
        return false;
      }

      let isOtpValid = false;
      try {
        isOtpValid = await bcrypt.compare(dto.otp, user.password_reset_otp_hash);
      } catch {
        // A malformed stored hash must behave exactly like an invalid OTP.
      }

      if (!isOtpValid) {
        const nextAttempts = user.password_reset_attempts + 1;
        const update = nextAttempts >= maxAttempts
          ? this.getClearedPasswordResetFields(now)
          : { password_reset_attempts: nextAttempts, updated_at: now };

        await user.update(update, { transaction });
        return false;
      }

      const bcryptRounds = this.getPositiveConfigNumber('BCRYPT_ROUNDS', 12);
      const password = await bcrypt.hash(dto.newPassword, bcryptRounds);

      await user.update(
        {
          password,
          ...this.getClearedPasswordResetFields(now),
        },
        { transaction },
      );

      await this.refreshTokenModel.update(
        { revoked_at: now, last_used_at: now },
        {
          where: { user_id: user.id, revoked_at: null },
          transaction,
        },
      );

      return true;
    });

    if (!resetSucceeded) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    return { message: 'Password reset successfully. Please sign in again.' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const now = new Date();

    await this.sequelize.transaction(async transaction => {
      const user = await this.usersService.findByIdForUpdate(userId, transaction);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Account is not active');
      }

      const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      if (dto.newPassword === dto.currentPassword) {
        throw new BadRequestException('New password must be different from current password');
      }

      const bcryptRounds = this.getPositiveConfigNumber('BCRYPT_ROUNDS', 12);
      const password = await bcrypt.hash(dto.newPassword, bcryptRounds);

      await user.update(
        {
          password,
          ...this.getClearedPasswordResetFields(now),
        },
        { transaction },
      );

      await this.refreshTokenModel.update(
        { revoked_at: now, last_used_at: now },
        {
          where: { user_id: user.id, revoked_at: null },
          transaction,
        },
      );
    });

    return { message: 'Password changed successfully. Please sign in again.' };
  }

  async refresh(refreshToken: string, metadata: SessionMetadata = {}) {
    const tokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.sequelize.transaction(async transaction => {
      const storedToken = await this.refreshTokenModel.findOne({
        where: { token_hash: tokenHash },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!storedToken || storedToken.revoked_at) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const now = new Date();
      if (storedToken.expires_at.getTime() <= now.getTime()) {
        await storedToken.update({ revoked_at: now, last_used_at: now }, { transaction });
        return null;
      }

      const user = await this.usersService.findById(storedToken.user_id, transaction);
      if (!user || user.status !== 'active') {
        await storedToken.update({ revoked_at: now, last_used_at: now }, { transaction });
        return null;
      }

      // Rotation is atomic: the current token is revoked before its replacement is stored.
      await storedToken.update({ revoked_at: now, last_used_at: now }, { transaction });
      return this.createSession(user, metadata, transaction);
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return session;
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const now = new Date();
    await this.refreshTokenModel.update(
      { revoked_at: now, last_used_at: now },
      {
        where: {
          token_hash: this.hashRefreshToken(refreshToken),
          revoked_at: null,
        },
      },
    );

    // Logout is intentionally idempotent and does not reveal whether a token existed.
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string): Promise<{ message: string; revokedSessions: number }> {
    const now = new Date();
    const [revokedSessions] = await this.refreshTokenModel.update(
      { revoked_at: now, last_used_at: now },
      {
        where: {
          user_id: userId,
          revoked_at: null,
          expires_at: { [Op.gt]: now },
        },
      },
    );

    return { message: 'Logged out from all devices successfully', revokedSessions };
  }

  private async createSession(
    user: User,
    metadata: SessionMetadata,
    transaction?: Transaction,
  ) {
    const payload = { sub: user.id, email: user.email, roleId: user.role_id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    const now = new Date();
    const role = await this.usersService.getRoleById(user.role_id, transaction);

    await this.refreshTokenModel.create(
      {
        user_id: user.id,
        token_hash: this.hashRefreshToken(refreshToken),
        device_info: metadata.deviceInfo?.slice(0, 255) || null,
        ip_address: metadata.ipAddress?.slice(0, 45) || null,
        expires_at: new Date(now.getTime() + this.getRefreshTokenTtlMs()),
        last_used_at: null,
        revoked_at: null,
        created_at: now,
      },
      { transaction },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        role: role?.name,
      }
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenTtlMs(): number {
    const configuredTtl = this.configService.get<string>('REFRESH_TOKEN_TTL') || '7d';
    const match = /^(\d+)(s|m|h|d)$/i.exec(configuredTtl.trim());

    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const unitInMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * unitInMs[match[2].toLowerCase()];
  }

  private getPositiveConfigNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private getClearedPasswordResetFields(now: Date) {
    return {
      password_reset_otp_hash: null,
      password_reset_expires_at: null,
      password_reset_attempts: 0,
      password_reset_sent_at: null,
      updated_at: now,
    };
  }
}
