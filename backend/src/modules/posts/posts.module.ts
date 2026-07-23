import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  Category,
  CategoryTranslation,
  Comment,
  Language,
  Post,
  PostLike,
  PostTranslation,
  User,
} from '../../database/models';
import { UsersModule } from '../users/users.module';
import { AdminPostsController } from './admin/admin-posts.controller';
import { AdminPostsService } from './admin/admin-posts.service';
import { AuthorPostsController } from './author-posts.controller';
import { PostsService } from './posts.service';
import { PublicPostsController } from './public/public-posts.controller';
import { PublicPostsService } from './public/public-posts.service';

@Module({
  imports: [
    UsersModule,
    SequelizeModule.forFeature([
      Post,
      PostTranslation,
      User,
      Category,
      CategoryTranslation,
      Language,
      PostLike,
      Comment,
    ]),
  ],
  controllers: [
    AuthorPostsController,
    AdminPostsController,
    PublicPostsController,
  ],
  providers: [
    PostsService,
    AdminPostsService,
    PublicPostsService,
    RolesGuard,
  ],
  exports: [PostsService, PublicPostsService],
})
export class PostsModule {}
