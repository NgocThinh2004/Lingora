import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { Category } from '../categories/models/category.model';
import { Language } from '../languages/models/language.model';
import { UsersModule } from '../users/users.module';
import { User } from '../users/models/user.model';
import { AdminPostsController } from './admin/admin-posts.controller';
import { AdminPostsService } from './admin/admin-posts.service';
import { PostTranslation } from './models/post-translation.model';
import { Post } from './models/post.model';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([Post, PostTranslation, User, Category, CategoryTranslation, Language]),
  ],
  controllers: [AdminPostsController],
  providers: [AdminPostsService, RolesGuard],
})
export class PostsModule {}
