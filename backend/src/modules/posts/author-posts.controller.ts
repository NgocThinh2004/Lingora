import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthorPostsQueryDto } from './dto/author-posts-query.dto';
import { CreateAuthorPostDto } from './dto/create-author-post.dto';
import { UpdateAuthorPostDto } from './dto/update-author-post.dto';
import { PostsService } from './posts.service';

@UseGuards(JwtAuthGuard)
@Controller('author/posts')
export class AuthorPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAuthorPostDto) {
    return { data: await this.postsService.createAuthorPost(userId, dto) };
  }

  @Get()
  async list(@CurrentUser('id') userId: string, @Query() query: AuthorPostsQueryDto) {
    const result = await this.postsService.listAuthorPosts(userId, query);
    return { data: result.items, meta: result.meta };
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.getAuthorPost(userId, postId) };
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdateAuthorPostDto,
  ) {
    return { data: await this.postsService.updateAuthorPost(userId, postId, dto) };
  }

  @Post(':id/submit')
  async submit(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.submitAuthorPost(userId, postId) };
  }

  @Post(':id/archive')
  async archive(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.archiveAuthorPost(userId, postId) };
  }

  @Post(':id/restore')
  async restore(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.restoreAuthorPost(userId, postId) };
  }

  @Post(':id/trash')
  async trash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.trashAuthorPost(userId, postId) };
  }

  @Post(':id/restore-trash')
  async restoreTrash(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.restoreAuthorPostFromTrash(userId, postId) };
  }

  @Delete(':id')
  async deletePermanently(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.deleteAuthorPostPermanently(userId, postId) };
  }

  @Get(':id/preview')
  async preview(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return { data: await this.postsService.getAuthorPreview(userId, postId) };
  }
}
