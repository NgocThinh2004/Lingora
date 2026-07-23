import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Category, CategoryTranslation, Comment, Language, Post, PostLike, PostTranslation, User } from '../../database/models';
import { AuthorPostsController } from './author-posts.controller';
import { AdminPostsController } from './admin-posts.controller';
import { PublicPostsController } from './public-posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [SequelizeModule.forFeature([Post, PostTranslation, Language, Category, CategoryTranslation, User, PostLike, Comment])],
  controllers: [AuthorPostsController, AdminPostsController, PublicPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
