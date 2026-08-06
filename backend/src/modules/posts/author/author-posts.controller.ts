
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AuthorPostsQueryDto } from './dto/author-posts-query.dto';
import { AutosaveAuthorPostDto } from './dto/autosave-author-post.dto';
import { CreateAuthorPostDto } from './dto/create-author-post.dto';
import { UpdateAuthorPostDto } from './dto/update-author-post.dto';
import { AuthorPostsService } from './author-posts.service';

@UseGuards(JwtAuthGuard)
@Controller('author/posts')
export class AuthorPostsController {
  constructor(private readonly postsService: AuthorPostsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAuthorPostDto) {
    return ;
  }

  @Post('autosave')
  async autosaveNew(@CurrentUser('id') userId: string, @Body() dto: AutosaveAuthorPostDto) {
    return ;
  }

  @Get()
  async list(@CurrentUser('id') userId: string, @Query() query: AuthorPostsQueryDto) {
    const result = await this.postsService.listAuthorPosts(userId, query);
    return ;
  }

  @Get('options/filters')
  async filterOptions(@CurrentUser('id') userId: string) {
    return ;
  }

  @Get(':id')
  async get(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Query('trash') trash?: string,
  ) {
    return {
      data: await this.postsService.getAuthorPost(userId, postId, undefined, trash === 'true'),
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdateAuthorPostDto,
  ) {
    return ;
  }

  @Patch(':id/autosave')
  async autosaveExisting(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: AutosaveAuthorPostDto,
  ) {
    return ;
  }

  @Post(':id/submit')
  async submit(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Post(':id/archive')
  async archive(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Post(':id/restore')
  async restore(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Post(':id/trash')
  async trash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Post(':id/restore-trash')
  async restoreTrash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Delete(':id/draft')
  async discardDraft(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Delete(':id')
  async deletePermanently(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ;
  }

  @Get(':id/preview')
  async preview(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Query('trash') trash?: string,
  ) {
    return {
      data: await this.postsService.getAuthorPreview(userId, postId, trash === 'true'),
    };
  }
}
