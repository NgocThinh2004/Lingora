import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('postId') postId: string,
    @Req() req: any,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const userId = req.user.id;
    return this.commentsService.create(postId, userId, createCommentDto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Param('postId') postId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    return this.commentsService.getCommentsByPost(postId, page, limit, req.user?.id, req.user?.role);
  }



  @UseGuards(JwtAuthGuard)
  @Put(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Req() req: any,
    @Body('content') content: string,
  ) {
    const userId = req.user.id;
    return this.commentsService.update(commentId, userId, content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  remove(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.commentsService.remove(commentId, userId, role);
  }

  @Post(':commentId/translate')
  translate(
    @Param('commentId') commentId: string,
    @Body('languageCode') languageCode: string,
  ) {
    return this.commentsService.translate(commentId, languageCode);
  }
}
