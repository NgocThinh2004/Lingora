/**
 * PostLangQueryDto - Xác thực query param `lang` cho các endpoint lấy chi tiết / bài liên quan.
 *
 * Được sử dụng bởi:
 * - GET /posts/:id          (getById)
 * - GET /posts/:id/related  (getRelated)
 *
 * Lý do tách riêng thay vì dùng @Query('lang') trực tiếp:
 * - Cho phép class-validator kiểm tra format locale (regex + maxLength).
 * - Đồng nhất cách validate `lang` với PublicPostsQueryDto (listFeed cũng có trường lang).
 * - Swagger tự động sinh tài liệu API mô tả rõ ràng tham số.
 */
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PostLangQueryDto {
  /**
   * Mã ngôn ngữ để lấy bản dịch tương ứng (ISO 639 format).
   * - Ví dụ hợp lệ: 'vi', 'en', 'ja', 'en-US'.
   * - Regex giống hệt trường `lang` trong PublicPostsQueryDto để đảm bảo tính nhất quán.
   * - Tùy chọn: nếu không truyền, Backend sẽ trả bản dịch gốc (original language).
   */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,3}(?:-[a-z0-9]{2,6})?$/)
  @MaxLength(10)
  lang?: string;
}
