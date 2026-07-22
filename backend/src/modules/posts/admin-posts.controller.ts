import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminPostsService } from './admin-posts.service';
import { AdminPostsQueryDto, ReviewAdminPostDto } from './dto/admin-posts.dto';

@Controller('admin/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPostsController {
  constructor(private readonly postsService: AdminPostsService) {}

  @Get()
  findAll(@Query() query: AdminPostsQueryDto) {
    return this.postsService.findAll(query);
  }

  @Get(':id')
  findOne(
    @Param('id') postId: string,
    @Query('language') language?: string,
  ) {
    return this.postsService.findOne(postId, language);
  }

  @Patch(':id/review')
  review(
    @Param('id') postId: string,
    @Body() dto: ReviewAdminPostDto,
    @Query('language') language?: string,
  ) {
    return this.postsService.review(postId, dto, language);
  }
}
