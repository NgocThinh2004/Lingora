import { Controller, Get, Query, Param } from '@nestjs/common';
import { PublicCategoriesService } from './public-categories.service';

@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  findActive(
    @Query('q') q?: string,
    @Query('lang') lang?: string,
    @Query('limit') limit?: string,
  ) {
    return this.categoriesService.findActive(q, lang, limit ? Number(limit) : undefined);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Query('lang') lang?: string) {
    return this.categoriesService.findBySlug(slug, lang);
  }
}
