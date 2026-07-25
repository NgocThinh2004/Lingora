import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { PublicCategoriesService } from './public-categories.service';

@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('categories_active')
  @CacheTTL(300000) // 5 minutes
  findActive() {
    return this.categoriesService.findActive();
  }
}
