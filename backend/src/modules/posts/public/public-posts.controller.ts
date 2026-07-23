import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PublicPostsService } from './public-posts.service';
import { PublicPostsQueryDto } from './dto/public-posts.dto';

@Controller('posts')
export class PublicPostsController {
  constructor(private readonly postsService: PublicPostsService) {}

  @Get()
  listFeed(@Query() query: PublicPostsQueryDto) {
    return this.postsService.listFeed(query);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getById(id);
  }
}
