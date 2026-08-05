/**
 * PublicPostsQueryDto - Định nghĩa cấu trúc và xác thực dữ liệu query params
 * cho các API lấy danh sách bài viết public.
 * 
 * Sử dụng `class-validator` để kiểm tra tính hợp lệ của input (đầu vào) từ client.
 * Việc validate tại DTO giúp ngăn chặn bad request trước khi nó chạm đến Controller và DB,
 * chống injection và lỗi xử lý logic.
 */
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicPostsQueryDto {
  // Lọc theo ngôn ngữ bài viết.
  // Validate regex đảm bảo đúng format locale (vd: 'en', 'vi', 'en-US').
  // MaxLength(10) giới hạn chiều dài để tránh các chuỗi rác quá lớn tấn công.
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2,3}(?:-[a-z0-9]{2,6})?$/)
  @MaxLength(10)
  lang?: string;

  // Lọc theo thể loại bài viết (category slug hoặc id).
  @IsOptional()
  @IsString()
  category?: string;

  // Từ khóa tìm kiếm text (Query string).
  // Được dùng để match với title hoặc nội dung.
  @IsOptional()
  @IsString()
  q?: string;

  // Chế độ sắp xếp (ví dụ: 'trending' = nhiều lượt xem/tương tác nhất, mặc định nếu không truyền là 'newest').
  @IsOptional()
  @IsString()
  sort?: string;

  // Lọc theo ID của một tác giả cụ thể.
  // Sử dụng @Type(() => Number) để parse chuỗi (query url luôn là string) sang số (Number) để check kiểu.
  // @Min(1) đảm bảo ID hợp lệ trong Database (>0).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  authorId?: number;

  // Số trang hiện tại. 
  // Giá trị mặc định là 1 nếu client không truyền lên.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Số lượng kết quả (bài viết) lấy trên mỗi trang.
  // Mặc định là 10 bài/trang để giới hạn khối lượng dữ liệu trả về, không làm chậm backend.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
