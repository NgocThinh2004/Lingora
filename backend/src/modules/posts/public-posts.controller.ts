import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('options')
  async options() {
    return { data: await this.postsService.getPostOptions() };
  }

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.postsService.listPublicPosts({
      search,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
    return { data: result.items, meta: result.meta };
  }

  @Get(':id')
  async get(@Param('id') postId: string) {
    return { data: await this.postsService.getPublicPost(postId) };
  }
}
