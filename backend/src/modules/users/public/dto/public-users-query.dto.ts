/**
 * PublicUsersQueryDto - Xác thực query params cho API lấy danh sách tác giả gợi ý.
 *
 * Được sử dụng bởi endpoint: GET /users/recommended?q=...&page=1&limit=10
 *
 * Endpoint này phục vụ trang Explore và component Tooltip (gợi ý tác giả).
 * Hỗ trợ tìm kiếm theo tên (q) và phân trang (page, limit).
 *
 * Lý do dùng DTO thay vì @Query() rời rạc:
 * - Tập trung validation tại 1 nơi, dễ bảo trì.
 * - Swagger tự nhận diện và sinh tài liệu.
 * - Type-safe: @Type(() => Number) chuyển đổi string → number tự động,
 *   không cần viết `Number(limit)` thủ công ở Controller.
 */
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicUsersQueryDto {
  /** Từ khóa tìm kiếm tên tác giả hoặc handle (tùy chọn). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  /** Số trang hiện tại. Mặc định 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Số lượng kết quả mỗi trang. Mặc định 10. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
