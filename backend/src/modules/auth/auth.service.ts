import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken, User } from '../../database/models';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(RefreshToken)
    private refreshTokenModel: typeof RefreshToken,
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

  async login(dto: LoginDto) {
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

    return this.generateTokens(user);
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...result } = user.toJSON();
    return result;
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, roleId: user.role_id };
    const accessToken = this.jwtService.sign(payload);

    // Normally we'd generate a refresh token and store its hash
    // But for A-02, we'll just return a placeholder or generate it simply
    const refreshTokenString = bcrypt.genSaltSync(16); // random string for refresh token

    // Assuming refresh token logic will be fully implemented in A-03, we return it now
    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
      }
    };
  }
}
