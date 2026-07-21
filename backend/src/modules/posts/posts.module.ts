import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Category, Language, Post, PostTranslation, User } from '../../database/models';
import { AdminPostsController } from './admin-posts.controller';
import { AuthorPostsController } from './author-posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [SequelizeModule.forFeature([Post, PostTranslation, Language, Category, User])],
  controllers: [AuthorPostsController, AdminPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
