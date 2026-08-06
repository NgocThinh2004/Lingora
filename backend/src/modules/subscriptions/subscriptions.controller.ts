/**
 * SubscriptionsController - Quản lý các API endpoints liên quan đến chức năng theo dõi tác giả.
 * 
 * Cung cấp các API:
 * - GET /followers: Lấy danh sách những người theo dõi user hiện tại.
 * - GET /following: Lấy danh sách các tác giả mà user hiện tại đang theo dõi.
 * - GET /feed: Lấy danh sách bài viết từ các tác giả mà user đang theo dõi (Home Feed).
 * - POST /:authorId: Theo dõi một tác giả.
 * - DELETE /:authorId: Hủy theo dõi một tác giả.
 */
import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

// Yêu cầu user phải đăng nhập (có token hợp lệ) mới được sử dụng các API này
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * API: Lấy danh sách những người theo dõi user hiện tại (Followers)
   * Method: GET /subscriptions/followers
   */
  @Get('followers')
  async followers(@CurrentUser('id') userId: string) {
    return { data: await this.subscriptionsService.listFollowers(userId) };
  }

  /**
   * API: Lấy danh sách những người user hiện tại đang theo dõi (Following)
   * Hỗ trợ tìm kiếm theo từ khóa (q) và phân trang (page, limit)
   * Method: GET /subscriptions/following
   */
  @Get('following')
  async following(
    @CurrentUser('id') userId: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return { data: await this.subscriptionsService.listFollowing(userId, q, page, limit) };
  }

  /**
   * API: Lấy danh sách bài viết của những tác giả user đang theo dõi (Feed)
   * Có thể lọc theo tác giả, ngôn ngữ và phân trang.
   * Method: GET /subscriptions/feed
   */
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

  /**
   * API: Thực hiện theo dõi một tác giả (Subscribe/Follow)
   * Method: POST /subscriptions/:authorId
   */
  @Post(':authorId')
  async subscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.subscribe(userId, authorId) };
  }

  /**
   * API: Hủy theo dõi một tác giả (Unsubscribe/Unfollow)
   * Method: DELETE /subscriptions/:authorId
   */
  @Delete(':authorId')
  async unsubscribe(@CurrentUser('id') userId: string, @Param('authorId') authorId: string) {
    return { data: await this.subscriptionsService.unsubscribe(userId, authorId) };
  }
}
