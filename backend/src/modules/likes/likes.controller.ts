/**
 * LikesController - Quản lý API endpoint cho tính năng Thích (Like/Reaction) bài viết và bình luận.
 * 
 * Cung cấp API:
 * - POST /posts/:postId/like: Toggle (thích / bỏ thích) một bài viết.
 * - POST /posts/:postId/comments/:commentId/like: Toggle (thích / bỏ thích) một bình luận.
 * 
 * Tất cả các API đều yêu cầu JwtAuthGuard (phải đăng nhập, có Access Token hợp lệ) để định danh được UserID.
 */
import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  /**
   * API: POST /posts/:postId/like
   * Mục đích: Xử lý hành động bấm Like/Unlike bài viết.
   * Dữ liệu trả về gồm trạng thái hiện tại (liked = true/false) và tổng số Like sau khi update (likeCount).
   */
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/like')
  togglePostLike(@Param('postId') postId: string, @Req() req: any) {
    // req.user được Inject bởi JwtAuthGuard sau khi verify token của client gửi lên thành công.
    // Lấy ID người dùng để đưa xuống Service.
    const userId = req.user.id;
    return this.likesService.togglePostLike(postId, userId);
  }

  /**
   * API: POST /posts/:postId/comments/:commentId/like
   * Mục đích: Xử lý hành động bấm Like/Unlike cho bình luận cụ thể nằm trong 1 bài viết.
   */
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments/:commentId/like')
  toggleCommentLike(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    // Lấy ID người dùng thực hiện like từ access token
    const userId = req.user.id;
    return this.likesService.toggleCommentLike(commentId, userId);
  }
}
