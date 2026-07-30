import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('followers')
  async followers(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.listFollowers(userId) };
  }

  @Get('following')
  async following(
    @CurrentUser('id') userId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return { data: await this.subscriptionsService.listFollowing(userId, q, page, limit) };
  }

  @Get('feed')
  async feed(
    @CurrentUser('id') userId: string,
    @Query('author') author?: string,
    @Query('lang') lang?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return { data: await this.subscriptionsService.getFeed(userId, author, lang, page, limit) };
  }

  @Post(':authorId')
  async subscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.subscribe(userId, authorId) };
  }

  @Delete(':authorId')
  async unsubscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.unsubscribe(userId, authorId) };
  }
}
