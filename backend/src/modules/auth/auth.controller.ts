import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  RegisterDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@Controller('auth')
export class AuthController {
  private readonly refreshCookieName = 'lingora_refresh';

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return user;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto, this.getSessionMetadata(request));
    return this.writeSession(response, session);
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshTokenCookie(request);
    if (!refreshToken) {
      this.clearRefreshCookie(response);
      throw new UnauthorizedException('Refresh session is unavailable');
    }

    try {
      const session = await this.authService.refresh(
        refreshToken,
        this.getSessionMetadata(request),
      );
      return this.writeSession(response, session);
    } catch (error) {
      this.clearRefreshCookie(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshTokenCookie(request);
    try {
      return refreshToken
        ? await this.authService.logout(refreshToken)
        : { message: 'Logged out successfully' };
    } finally {
      this.clearRefreshCookie(response);
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.resetPassword(dto);
    this.clearRefreshCookie(response);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    this.clearRefreshCookie(response);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logoutAll(user.id);
    this.clearRefreshCookie(response);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: User) {
    const data = await this.authService.getMe(user.id);
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  private getSessionMetadata(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim();

    return {
      deviceInfo: request.get('user-agent'),
      ipAddress: forwardedIp || request.ip,
    };
  }

  private getRefreshTokenCookie(request: Request): string | undefined {
    const encodedToken = request.headers.cookie
      ?.split(';')
      .map(cookie => cookie.trim())
      .find(cookie => cookie.startsWith(`${this.refreshCookieName}=`))
      ?.slice(this.refreshCookieName.length + 1);

    if (!encodedToken) {
      return undefined;
    }

    try {
      return decodeURIComponent(encodedToken);
    } catch {
      return undefined;
    }
  }

  private writeSession(
    response: Response,
    session: Awaited<ReturnType<AuthService['login']>>,
  ) {
    const { refreshToken, ...publicSession } = session;
    response.cookie(
      this.refreshCookieName,
      refreshToken,
      this.getRefreshCookieOptions(true),
    );
    return publicSession;
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(
      this.refreshCookieName,
      this.getRefreshCookieOptions(false),
    );
  }

  private getRefreshCookieOptions(includeMaxAge: boolean): CookieOptions {
    const apiPrefix = this.configService
      .get<string>('API_PREFIX', 'api/v1')
      .replace(/^\/+|\/+$/g, '');
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: `/${apiPrefix}/auth`,
    };

    if (includeMaxAge) {
      options.maxAge = this.getRefreshTokenTtlMs();
    }

    return options;
  }

  private getRefreshTokenTtlMs(): number {
    const configuredTtl = this.configService.get<string>('REFRESH_TOKEN_TTL') || '7d';
    const match = /^(\d+)(s|m|h|d)$/i.exec(configuredTtl.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const unitInMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return Number(match[1]) * unitInMs[match[2].toLowerCase()];
  }
}
