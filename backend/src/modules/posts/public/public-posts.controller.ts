import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { AuthorPostsService } from '../author/author-posts.service';
import { PublicPostsService } from './public-posts.service';
import { PublicPostsQueryDto } from './dto/public-posts.dto';

@Controller('posts')
export class PublicPostsController {
  constructor(
    private readonly postsService: PublicPostsService,
    private readonly authorPostsService: AuthorPostsService,
  ) {}

  @Get('options')
  async options() {
    return { data: await this.authorPostsService.getPostOptions() };
  }

  @Get()
  listFeed(@Query() query: PublicPostsQueryDto) {
    return this.postsService.listFeed(query);
  }

  @Get(':id/related')
  getRelated(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getRelated(id);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getById(id);
  }
}
