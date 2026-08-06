/**
 * SearchController - API Controller cho chức năng tìm kiếm toàn cục.
 *
 * Cung cấp endpoint: GET /search?q=...
 * Kết quả trả về gồm bài viết và tác giả phù hợp với từ khóa.
 *
 * Sử dụng ThrottlerGuard để giới hạn tần suất request (chống spam/DDoS).
 * Sử dụng OptionalJwtAuthGuard để nhận diện user nếu có token (giúp tùy chỉnh kết quả).
 */
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('search')
@UseGuards(ThrottlerGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * API: GET /search
   * Mục đích: Tìm kiếm toàn cục theo từ khóa (bài viết + tác giả).
   * Query params được đóng gói trong SearchQueryDto (có class-validator kiểm tra @IsNotEmpty, @MaxLength).
   *
   * @param query DTO chứa trường q (từ khóa tìm kiếm)
   * @param req Request object — chứa req.user?.id nếu user đã đăng nhập
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  globalSearch(@Query() query: SearchQueryDto, @Req() req: any) {
    return this.searchService.globalSearch(query.q, req.user?.id);
  }
}
