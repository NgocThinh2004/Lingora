import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Post, PostTranslation } from '../../database/models';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Category } from '../categories/models/category.model';
import { Language } from '../languages/models/language.model';
import { UsersModule } from '../users/users.module';
import { User } from '../users/models/user.model';
import { AdminPostsController } from './admin-posts.controller';
import { AdminPostsService } from './admin-posts.service';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([Post, PostTranslation, User, Category, CategoryTranslation, Language]),
  ],
  controllers: [AdminPostsController],
  providers: [AdminPostsService, RolesGuard],
})
export class PostsModule {}
