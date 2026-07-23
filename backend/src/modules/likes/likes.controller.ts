import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts/:postId/like')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  togglePostLike(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user.id;
    return this.likesService.togglePostLike(postId, userId);
  }
}
