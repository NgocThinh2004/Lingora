import { Controller, Get, UseInterceptors } from '@nestjs/common';
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
}
