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
import { AuthorPostsController } from './author/author-posts.controller';
import { AuthorPostsService } from './author/author-posts.service';
import { PublicPostsController } from './public/public-posts.controller';
import { PublicPostsService } from './public/public-posts.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    UsersModule,
    UploadsModule,
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
    AuthorPostsService,
    AdminPostsService,
    PublicPostsService,
    RolesGuard,
  ],
  exports: [PublicPostsService, AdminPostsService],
})
export class PostsModule {}
