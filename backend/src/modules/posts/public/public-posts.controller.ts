/**
 * PublicPostsController - API Controller xử lý các request công khai (không cần đăng nhập) liên quan đến bài viết.
 * 
 * Mục đích: 
 * - Cung cấp các endpoint cho người dùng xem danh sách bài viết (New Feed), xem chi tiết bài viết.
 * - Cho phép truyền tùy chọn `lang` (ngôn ngữ) để lấy bản dịch tương ứng.
 * 
 * Lưu ý: Dù là public, vẫn dùng OptionalJwtAuthGuard để kiểm tra nếu user gửi Token hợp lệ, 
 * sẽ đọc ID của user đó để xác định họ "Đã Like" bài viết hay chưa.
 */
import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AuthorPostsService } from '../author/author-posts.service';
import { PublicPostsService } from './public-posts.service';
import { PublicPostsQueryDto } from './dto/public-posts.dto';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';

@Controller('posts')
export class PublicPostsController {
  constructor(
    private readonly postsService: PublicPostsService,
    private readonly authorPostsService: AuthorPostsService,
  ) {}

  /**
   * API: GET /posts/options
   * Mục đích: Lấy dữ liệu meta cần thiết để hiển thị bộ lọc (VD: danh sách categories).
   */
  @Get('options')
  async options() {
    return { data: await this.authorPostsService.getPostOptions() };
  }

  /**
   * API: GET /posts
   * Mục đích: Lấy danh sách bài viết (bảng tin / trang chủ).
   * Đầu vào: Query string (page, limit, q, category, sort, lang).
   * Đầu ra: Danh sách thông tin cơ bản của post kèm thông tin phân trang (meta).
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listFeed(@Query() query: PublicPostsQueryDto, @Req() req: any) {
    // Nếu client gửi kèm Access Token hợp lệ, guard OptionalJwtAuthGuard sẽ parse token 
    // và gán thông tin user vào req.user. Khi đó req.user?.id tồn tại.
    // Nếu là user khách (không token), req.user sẽ là undefined.
    return this.postsService.listFeed(query, undefined, req.user?.id);
  }

  /**
   * API: GET /posts/:id/related
   * Mục đích: Lấy các bài viết tương tự (related posts) của một bài viết cụ thể dựa vào id của bài viết đó.
   */
  @Get(':id/related')
  @UseGuards(OptionalJwtAuthGuard)
  getRelated(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    return this.postsService.getRelated(id, req.user?.id, lang);
  }

  /**
   * API: GET /posts/:id
   * Mục đích: Lấy chi tiết nội dung của một bài viết, tự động tăng view count.
   * Dữ liệu trả về sẽ kèm theo tất cả các relationship (tác giả, chuyên mục, bản dịch).
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('lang') lang?: string,
  ) {
    // Xử lý lấy IP thật của người dùng để chống spam view:
    // Nếu server chạy sau một Reverse Proxy (như Nginx) hoặc Load Balancer, IP thực của client sẽ nằm trong header `x-forwarded-for`.
    // Nếu kết nối trực tiếp (ví dụ môi trường dev), ta dùng `req.socket.remoteAddress`.
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Gửi ID bài viết, ID user (có thể null), lang và IP xuống tầng service xử lý.
    return this.postsService.getById(id, req.user?.id, lang, ip);
  }
}
