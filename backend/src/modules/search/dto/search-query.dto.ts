/**
 * SearchQueryDto - Xác thực dữ liệu query params cho API tìm kiếm toàn cục.
 *
 * Được sử dụng bởi endpoint: GET /search?q=...
 *
 * Lý do tách riêng thay vì dùng @Query('q'):
 * - class-validator kiểm tra chuỗi rỗng, giới hạn độ dài.
 * - Dễ mở rộng thêm tham số tìm kiếm (page, limit, type) trong tương lai.
 * - Swagger tự động sinh tài liệu API mô tả rõ ràng từng tham số.
 */
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  /**
   * Từ khóa tìm kiếm do người dùng nhập.
   * - Bắt buộc phải có (@IsNotEmpty) — không cho phép request rỗng.
   * - MaxLength(200) chặn truy vấn quá dài gây tải nặng cho DB.
   */
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  q!: string;
}
