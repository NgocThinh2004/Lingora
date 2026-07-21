import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthorPostsQueryDto } from './dto/author-posts-query.dto';
import { CreateAuthorPostDto } from './dto/create-author-post.dto';
import { UpdateAuthorPostDto } from './dto/update-author-post.dto';
import { PostsService } from './posts.service';

@Controller('author/posts')
export class AuthorPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  async create(@Headers('x-user-id') userId: string | undefined, @Body() dto: CreateAuthorPostDto) {
    return {
      data: await this.postsService.createAuthorPost(this.getCurrentUserId(userId), dto),
    };
  }

  @Get()
  async list(@Headers('x-user-id') userId: string | undefined, @Query() query: AuthorPostsQueryDto) {
    const result = await this.postsService.listAuthorPosts(this.getCurrentUserId(userId), query);

    return {
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  async get(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.getAuthorPost(this.getCurrentUserId(userId), postId),
    };
  }

  @Patch(':id')
  async update(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') postId: string,
    @Body() dto: UpdateAuthorPostDto,
  ) {
    return {
      data: await this.postsService.updateAuthorPost(this.getCurrentUserId(userId), postId, dto),
    };
  }

  @Post(':id/submit')
  async submit(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.submitAuthorPost(this.getCurrentUserId(userId), postId),
    };
  }

  @Post(':id/archive')
  async archive(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.archiveAuthorPost(this.getCurrentUserId(userId), postId),
    };
  }

  @Post(':id/restore')
  async restore(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.restoreAuthorPost(this.getCurrentUserId(userId), postId),
    };
  }

  @Post(':id/trash')
  async trash(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.trashAuthorPost(this.getCurrentUserId(userId), postId),
    };
  }

  @Post(':id/restore-trash')
  async restoreTrash(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.restoreAuthorPostFromTrash(this.getCurrentUserId(userId), postId),
    };
  }

  @Get(':id/preview')
  async preview(@Headers('x-user-id') userId: string | undefined, @Param('id') postId: string) {
    return {
      data: await this.postsService.getAuthorPreview(this.getCurrentUserId(userId), postId),
    };
  }

  private getCurrentUserId(userId: string | undefined): string {
    if (!userId?.trim()) {
      throw new UnauthorizedException('x-user-id header is required until the auth guard is available');
    }

    return userId.trim();
  }
}
