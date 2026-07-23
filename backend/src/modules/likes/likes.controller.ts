import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/like')
  togglePostLike(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.likesService.togglePostLike(postId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments/:commentId/like')
  toggleCommentLike(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.likesService.toggleCommentLike(commentId, userId);
  }
}
