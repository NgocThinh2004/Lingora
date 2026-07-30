import { Controller, Get, UseInterceptors, Query, Param } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { PublicCategoriesService } from './public-categories.service';

@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes
  findActive(
    @Query('q') q?: string,
    @Query('lang') lang?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.findActive(q, lang, limit ? Number(limit) : undefined);
  }

  @Get(':slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}
