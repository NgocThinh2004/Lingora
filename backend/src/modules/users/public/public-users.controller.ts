/**
 * PublicUsersController - API Controller cho các thao tác công khai liên quan đến user.
 *
 * Cung cấp các endpoint:
 * - GET /users/recommended: Lấy danh sách tác giả gợi ý (Explore, Tooltip).
 * - GET /users/:id/followers: Lấy danh sách người theo dõi một user.
 * - GET /users/:id/following: Lấy danh sách người mà user đang theo dõi.
 * - GET /users/:id: Lấy thông tin hồ sơ cá nhân (Profile) của một user.
 *
 * Sử dụng OptionalJwtAuthGuard để nhận diện user nếu có token (giúp xác định trạng thái "Đang theo dõi").
 */
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { PublicUsersService } from './public-users.service';
import { PublicUsersQueryDto } from './dto/public-users-query.dto';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: PublicUsersService) {}

  /**
   * API: GET /users/recommended
   * Mục đích: Lấy danh sách tác giả gợi ý, hỗ trợ tìm kiếm và phân trang.
   * Query params được đóng gói trong PublicUsersQueryDto (có class-validator kiểm tra).
   *
   * @param req Request object — chứa req.user?.id nếu user đã đăng nhập
   * @param query DTO chứa các trường q, page, limit (đã tự động chuyển đổi kiểu từ string → number)
   */
  @Get('recommended')
  @UseGuards(OptionalJwtAuthGuard)
  getRecommended(
    @Req() req: any,
    @Query() query: PublicUsersQueryDto,
  ) {
    return this.usersService.getRecommended(req.user?.id, query.q, query.limit, query.page);
  }

  /**
   * API: GET /users/:id/followers
   * Mục đích: Lấy danh sách người theo dõi của một user cụ thể.
   */
  @Get(':id/followers')
  getFollowers(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getFollowers(id);
  }

  /**
   * API: GET /users/:id/following
   * Mục đích: Lấy danh sách những user mà user cụ thể đang theo dõi.
   */
  @Get(':id/following')
  getFollowing(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getFollowing(id);
  }

  /**
   * API: GET /users/:id
   * Mục đích: Lấy thông tin hồ sơ cá nhân (Profile) của một user.
   * Nếu user đã đăng nhập, kết quả sẽ bao gồm trạng thái "Đang theo dõi" (isFollowing).
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getProfile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.usersService.getProfile(id, req.user?.id);
  }
}
