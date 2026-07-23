import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AdminCategoriesQueryDto,
  CreateAdminCategoryDto,
  UpdateAdminCategoryDto,
} from './dto/admin-categories.dto';
import { CategoriesService } from './categories.service';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query() query: AdminCategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) categoryId: number) {
    return this.categoriesService.findOne(categoryId);
  }

  @Get(':id/posts')
  findPosts(
    @Param('id', ParseIntPipe) categoryId: number,
    @Query('language') languageCode?: string,
  ) {
    return this.categoriesService.findPosts(categoryId, languageCode);
  }

  @Post()
  create(@Body() dto: CreateAdminCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.categoriesService.update(categoryId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) categoryId: number): Promise<void> {
    await this.categoriesService.remove(categoryId);
  }
}
