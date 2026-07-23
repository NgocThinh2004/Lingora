import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PostLike } from './models/post-like.model';
import { CommentLike } from './models/comment-like.model';
import { Post } from '../posts/models/post.model';
import { Comment } from '../comments/models/comment.model';

@Module({
  imports: [SequelizeModule.forFeature([PostLike, CommentLike, Post, Comment])],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
