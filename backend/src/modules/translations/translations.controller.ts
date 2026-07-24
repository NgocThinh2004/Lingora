import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { User } from '../../database/models';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { PreviewTranslationDto } from './dto/preview-translation.dto';
import { QueueTranslationDto } from './dto/queue-translation.dto';
import { RetryTranslationDto } from './dto/retry-translation.dto';
import { TranslationsService } from './translations.service';

@UseGuards(JwtAuthGuard)
@Controller('translations')
export class TranslationsController {
  constructor(
    private readonly translationsService: TranslationsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('posts/:postId/matrix')
  async getPostMatrix(@CurrentUser() user: User, @Param('postId') postId: string) {
    return {
      data: await this.translationsService.getPostMatrix(postId, user.id, await this.isAdmin(user)),
    };
  }

  @Get('posts/:postId/preview/:languageId')
  async getStoredPreview(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Param('languageId', ParseIntPipe) languageId: number,
  ) {
    return {
      data: await this.translationsService.getTranslationPreview(
        postId,
        languageId,
        user.id,
        await this.isAdmin(user),
      ),
    };
  }

  @Post('preview')
  async preview(@Body() dto: PreviewTranslationDto) {
    return { data: await this.translationsService.preview(dto) };
  }

  @Post('queue')
  async queue(@CurrentUser() user: User, @Body() dto: QueueTranslationDto) {
    return {
      data: await this.translationsService.queueTranslations(dto, user.id, await this.isAdmin(user)),
    };
  }

  @Get(':id/attempts')
  async getAttempts(@CurrentUser() user: User, @Param('id') postTranslationId: string) {
    return {
      data: await this.translationsService.getAttempts(
        postTranslationId,
        user.id,
        await this.isAdmin(user),
      ),
    };
  }

  @Post('retry')
  async retry(@CurrentUser() user: User, @Body() dto: RetryTranslationDto) {
    return {
      data: await this.translationsService.retryTranslation(
        dto.postTranslationId,
        user.id,
        await this.isAdmin(user),
      ),
    };
  }

  @Post('worker/run-once')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async runWorkerOnce() {
    return { data: await this.translationsService.processNextQueuedTranslation() };
  }

  @Get('metrics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getMetrics() {
    return { data: await this.translationsService.getMetrics() };
  }

  private async isAdmin(user: User): Promise<boolean> {
    const role = await this.usersService.getRoleById(user.role_id);
    return role?.name === 'admin';
  }
}
