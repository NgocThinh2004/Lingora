/**
 * CommentsController - Quản lý các API endpoint liên quan đến tính năng bình luận.
 * 
 * Controller này định tuyến (route) các HTTP request (POST, GET, PUT, DELETE)
 * từ client (frontend/mobile) đến `CommentsService` để xử lý logic.
 * Tất cả các endpoints đều có tiền tố prefix là `/posts/:postId/comments`.
 */
import { Controller, Post, Get, Put, Delete, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Tạo bình luận mới cho một bài viết.
   * 
   * - Endpoint: POST /posts/:postId/comments
   * - Yêu cầu xác thực: Bắt buộc đăng nhập (JwtAuthGuard). Nếu không có token, trả về 401 Unauthorized.
   * - Data: Nội dung bình luận được đóng gói trong `CreateCommentDto` (có class-validator kiểm tra logic).
   * 
   * Quá trình: Lấy `userId` từ token (`req.user.id`) truyền vào service để gắn FK người dùng vào DB.
   * 
   * @param postId ID của bài viết (lấy từ params URL)
   * @param req Request object của Express/NestJS (đã được đính user payload từ AuthGuard)
   * @param createCommentDto Dữ liệu bình luận được client gửi lên
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('postId') postId: string,
    @Req() req: any,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    // Lấy ID người dùng được verify từ JWT Token
    const userId = req.user.id;
    return this.commentsService.create(postId, userId, createCommentDto);
  }

  /**
   * Lấy danh sách bình luận của bài viết.
   * 
   * - Endpoint: GET /posts/:postId/comments?page=1&limit=20
   * - Yêu cầu xác thực: Không bắt buộc (OptionalJwtAuthGuard). 
   *   + Nếu có token hợp lệ -> sẽ gắn `req.user`, có thể dùng để highlight nút Like bình luận.
   *   + Nếu không có token -> Vẫn xem được bình luận bình thường, `req.user` = undefined.
   * 
   * @param postId ID bài viết
   * @param page Số trang hiện tại (Mặc định 1, dùng ParseIntPipe để ép kiểu string thành number)
   * @param limit Số lượng hiển thị mỗi trang (Mặc định 20)
   * @param req Request object
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Param('postId') postId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: any,
  ) {
    // Gọi service lấy dữ liệu bình luận, truyền thêm userId/role nếu có đăng nhập
    return this.commentsService.getCommentsByPost(postId, page, limit, req.user?.id, req.user?.role);
  }

  /**
   * Chỉnh sửa nội dung bình luận.
   * 
   * - Endpoint: PUT /posts/:postId/comments/:commentId
   * - Yêu cầu xác thực: Bắt buộc đăng nhập (JwtAuthGuard).
   * - Ủy quyền (Authorization): Logic kiểm tra (chỉ tác giả được phép sửa) sẽ được thực hiện trong service.
   * 
   * @param commentId ID bình luận cần sửa
   * @param req Request object
   * @param content Nội dung mới của bình luận
   */
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

  /**
   * Xóa một bình luận.
   * 
   * - Endpoint: DELETE /posts/:postId/comments/:commentId
   * - Yêu cầu xác thực: Bắt buộc đăng nhập.
   * - Quyền hạn: Service sẽ kiểm tra - user phải là Tác giả bình luận HOẶC Chủ bài viết HOẶC Admin.
   * 
   * @param commentId ID bình luận cần xóa
   * @param req Request object
   */
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

  /**
   * Dịch một bình luận sang ngôn ngữ đích.
   * 
   * - Endpoint: POST /posts/:postId/comments/:commentId/translate
   * - Bất kì ai cũng có thể gọi (không yêu cầu Auth).
   * - Service sẽ kiểm tra trong DB có chưa, nếu chưa có sẽ dùng API ngoài để dịch.
   * 
   * @param commentId ID bình luận cần dịch
   * @param languageCode Mã ngôn ngữ đích muốn chuyển sang (ví dụ: 'vi', 'en')
   */
  @Post(':commentId/translate')
  translate(
    @Param('commentId') commentId: string,
    @Body('languageCode') languageCode: string,
  ) {
    return this.commentsService.translate(commentId, languageCode);
  }
}
