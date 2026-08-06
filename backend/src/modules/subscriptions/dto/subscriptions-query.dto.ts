/**
 * SubscriptionsQueryDto - Các DTO xác thực query params cho module Subscriptions.
 *
 * Module này phục vụ 3 endpoint chính:
 * - GET /subscriptions/following  → FollowingQueryDto
 * - GET /subscriptions/feed       → FeedQueryDto
 * - GET /subscriptions/followers  → Không cần query params
 *
 * Lý do gom chung 1 file: Các DTO này đều nhỏ, cùng phục vụ 1 module,
 * và chia sẻ các trường giống nhau (page, limit). Gom lại giúp dễ quản lý
 * mà không sinh ra quá nhiều file lẻ.
 */
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * FollowingQueryDto - Query params cho danh sách "Đang theo dõi".
 *
 * Endpoint: GET /subscriptions/following?q=...&page=1&limit=20
 * Hỗ trợ tìm kiếm theo tên tác giả (q) và phân trang.
 */
export class FollowingQueryDto {
  /** Từ khóa tìm kiếm tên tác giả (tùy chọn). */
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

  /** Số lượng kết quả mỗi trang. Mặc định 20. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

/**
 * FeedQueryDto - Query params cho "Feed bài viết từ tác giả đang theo dõi".
 *
 * Endpoint: GET /subscriptions/feed?author=...&lang=vi&page=1&limit=10
 * Hỗ trợ lọc theo tác giả cụ thể, ngôn ngữ, và phân trang.
 */
export class FeedQueryDto {
  /** Lọc bài viết theo ID hoặc handle của tác giả (tùy chọn). */
  @IsOptional()
  @IsString()
  author?: string;

  /** Lọc theo ngôn ngữ bài viết. Phải đúng format locale (vd: 'vi', 'en', 'en-US'). */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  lang?: string;

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
