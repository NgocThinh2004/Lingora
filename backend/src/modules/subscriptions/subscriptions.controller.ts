import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.list(userId) };
  }

  @Get('stats')
  async stats(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.stats(userId) };
  }

  @Get('followers')
  async followers(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.listFollowers(userId) };
  }

  @Get('following')
  async following(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.listFollowing(userId) };
  }

  @Post(':authorId')
  async subscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.subscribe(userId, authorId) };
  }

  @Delete(':authorId')
  async unsubscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.unsubscribe(userId, authorId) };
  }

  @Get('check/:authorId')
  async checkSubscription(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.checkSubscription(userId, authorId) };
  }
}
