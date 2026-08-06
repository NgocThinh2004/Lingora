/**
 * UpdateCommentDto - Xác thực dữ liệu khi chỉnh sửa nội dung bình luận.
 *
 * Được sử dụng bởi endpoint: PUT /posts/:postId/comments/:commentId
 * Chứa duy nhất trường `content` (nội dung mới của bình luận).
 *
 * Lý do tách riêng thay vì dùng @Body('content'):
 * - Cho phép class-validator kiểm tra ràng buộc (@IsNotEmpty, @MaxLength).
 * - Swagger có thể tự động sinh tài liệu API từ DTO.
 * - Dễ mở rộng thêm trường trong tương lai mà không phải sửa Controller.
 */
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  /**
   * Nội dung mới của bình luận sau khi chỉnh sửa.
   * - Bắt buộc không được rỗng (@IsNotEmpty).
   * - Phải là chuỗi ký tự (@IsString).
   * - Tối đa 5000 ký tự (@MaxLength) — giống ràng buộc của CreateCommentDto.
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content!: string;
}
