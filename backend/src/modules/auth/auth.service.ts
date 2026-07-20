import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UsersService } from '../users/users.service';
import { RefreshToken, User } from '../../database/models';
import { RegisterDto, LoginDto } from './dto/auth.dto';

export interface SessionMetadata {
  deviceInfo?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
}
