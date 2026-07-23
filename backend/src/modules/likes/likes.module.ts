import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PostLike } from './models/post-like.model';
import { Post } from '../posts/models/post.model';

@Module({
  imports: [SequelizeModule.forFeature([PostLike, Post])],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
