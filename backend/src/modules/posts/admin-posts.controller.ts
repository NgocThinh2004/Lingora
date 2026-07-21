import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { AdminPostsQueryDto } from './dto/admin-posts-query.dto';
import { ApprovePostDto, RejectPostDto } from './dto/review-post.dto';
import { PostsService } from './posts.service';

@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async list(@Headers('x-user-role') role: string | undefined, @Query() query: AdminPostsQueryDto) {
    this.assertAdmin(role);
    const result = await this.postsService.listAdminPosts(query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @Get('metrics')
  async metrics(@Headers('x-user-role') role: string | undefined) {
    this.assertAdmin(role);

    return {
      data: await this.postsService.getAdminPostMetrics(),
    };
  }

  @Get(':id')
  async get(@Headers('x-user-role') role: string | undefined, @Param('id') postId: string) {
    this.assertAdmin(role);

    return {
      data: await this.postsService.getAdminPost(postId),
    };
  }

  @Post(':id/approve')
  async approve(
    @Headers('x-user-role') role: string | undefined,
    @Param('id') postId: string,
    @Body() dto: ApprovePostDto,
  ) {
    this.assertAdmin(role);

    return {
      data: await this.postsService.approveAdminPost(postId, dto),
    };
  }

  @Post(':id/reject')
  async reject(
    @Headers('x-user-role') role: string | undefined,
    @Param('id') postId: string,
    @Body() dto: RejectPostDto,
  ) {
    this.assertAdmin(role);

    return {
      data: await this.postsService.rejectAdminPost(postId, dto),
    };
  }

  @Post(':id/publish')
  async publish(@Headers('x-user-role') role: string | undefined, @Param('id') postId: string) {
    this.assertAdmin(role);

    return {
      data: await this.postsService.publishAdminPost(postId),
    };
  }

  private assertAdmin(role: string | undefined): void {
    if (role?.trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('x-user-role: admin header is required until the role guard is available');
    }
  }
}
