import { Controller, Get } from '@nestjs/common';
import { PublicCategoriesService } from './public-categories.service';

@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: PublicCategoriesService) {}

  @Get()
  findActive() {
    return this.categoriesService.findActive();
  }
}
