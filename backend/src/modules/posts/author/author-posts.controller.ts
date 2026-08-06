
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
    return this.postsService.createAuthorPost(userId, dto);
  }

  @Post('autosave')
  async autosaveNew(@CurrentUser('id') userId: string, @Body() dto: AutosaveAuthorPostDto) {
    return this.postsService.autosaveAuthorPost(userId, dto);
  }

  @Get()
  async list(@CurrentUser('id') userId: string, @Query() query: AuthorPostsQueryDto) {
    return this.postsService.listAuthorPosts(userId, query);
  }

  @Get('options/filters')
  async filterOptions(@CurrentUser('id') userId: string) {
    return this.postsService.getAuthorPostFilterOptions(userId);
  }

  @Get(':id')
  async get(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Query('trash') trash?: string,
  ) {
    return this.postsService.getAuthorPost(userId, postId, undefined, trash === 'true');
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdateAuthorPostDto,
  ) {
    return this.postsService.updateAuthorPost(userId, postId, dto);
  }

  @Patch(':id/autosave')
  async autosaveExisting(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: AutosaveAuthorPostDto,
  ) {
    return this.postsService.autosaveAuthorPost(userId, dto, postId);
  }

  @Post(':id/submit')
  async submit(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.submitAuthorPost(userId, postId);
  }

  @Post(':id/archive')
  async archive(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.archiveAuthorPost(userId, postId);
  }

  @Post(':id/restore')
  async restore(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.restoreAuthorPost(userId, postId);
  }

  @Post(':id/trash')
  async trash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.trashAuthorPost(userId, postId);
  }

  @Post(':id/restore-trash')
  async restoreTrash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.restoreAuthorPostFromTrash(userId, postId);
  }

  @Delete(':id/draft')
  async discardDraft(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.discardAuthorDraft(userId, postId);
  }

  @Delete(':id')
  async deletePermanently(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postsService.deleteAuthorPostPermanently(userId, postId);
  }

  @Get(':id/preview')
  async preview(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Query('trash') trash?: string,
  ) {
    return this.postsService.getAuthorPreview(userId, postId, trash === 'true');
  }
}
