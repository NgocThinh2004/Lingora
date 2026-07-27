import { Controller, Get, Param, ParseIntPipe, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { PublicUsersService } from './public-users.service';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: PublicUsersService) {}

  @Get('recommended')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('users_recommended')
  @CacheTTL(300000) // 5 minutes
  getRecommended() {
    return this.usersService.getRecommended();
  }

  @Get(':id/followers')
  async getFollowers(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.usersService.getFollowers(id) };
  }

  @Get(':id/following')
  async getFollowing(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.usersService.getFollowing(id) };
  }

  @Get(':id')
  async getProfile(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.usersService.getProfile(id) };
  }
}
