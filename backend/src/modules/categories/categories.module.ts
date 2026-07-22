import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Post, PostTranslation } from '../../database/models';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Language } from '../languages/models/language.model';
import { UsersModule } from '../users/users.module';
import { User } from '../users/models/user.model';
import { AdminCategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([Category, CategoryTranslation, Language, Post, PostTranslation, User]),
  ],
  controllers: [AdminCategoriesController],
  providers: [CategoriesService, RolesGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
