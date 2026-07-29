import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AuthorPostsService } from '../author/author-posts.service';
import { PublicPostsService } from './public-posts.service';
import { PublicPostsQueryDto } from './dto/public-posts.dto';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';

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
  @UseGuards(OptionalJwtAuthGuard)
  listFeed(@Query() query: PublicPostsQueryDto, @Req() req: any) {
    return this.postsService.listFeed(query, undefined, req.user?.id);
  }

  @Get(':id/related')
  @UseGuards(OptionalJwtAuthGuard)
  getRelated(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    return this.postsService.getRelated(id, req.user?.id, lang);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    return this.postsService.getById(id, req.user?.id, lang);
  }
}
