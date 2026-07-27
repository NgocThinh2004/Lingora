import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PostLike } from './models/post-like.model';
import { CommentLike } from './models/comment-like.model';
import { Post } from '../posts/models/post.model';
import { Comment } from '../comments/models/comment.model';

@Injectable()
export class LikesService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(PostLike) private readonly postLikeModel: typeof PostLike,
    @InjectModel(CommentLike) private readonly commentLikeModel: typeof CommentLike,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
  ) {}

  async togglePostLike(postId: string, userId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const post = await this.postModel.findByPk(postId, { transaction });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Optimistic delete: check if it exists
      const existingLike = await this.postLikeModel.findOne({
        where: { post_id: postId, user_id: userId },
        transaction,
      });

      let liked = false;
      if (existingLike) {
        await existingLike.destroy({ transaction });
        await this.postModel.decrement('like_count', { by: 1, where: { id: postId }, transaction });
        liked = false;
      } else {
        await this.postLikeModel.findOrCreate({
          where: { post_id: postId, user_id: userId },
          defaults: { post_id: postId, user_id: userId },
          transaction,
        });
        await this.postModel.increment('like_count', { by: 1, where: { id: postId }, transaction });
        liked = true;
      }

      await post.reload({ transaction });
      return { liked, likeCount: post.like_count };
    });
  }

  async toggleCommentLike(commentId: string, userId: string) {
    return this.sequelize.transaction(async (transaction) => {
      const comment = await this.commentModel.findByPk(commentId, { transaction });
      if (!comment) throw new NotFoundException('Comment not found');

      const existingLike = await this.commentLikeModel.findOne({
        where: { comment_id: commentId, user_id: userId },
        transaction,
      });

      let liked = false;
      if (existingLike) {
        await existingLike.destroy({ transaction });
        await this.commentModel.decrement('like_count', { by: 1, where: { id: commentId }, transaction });
        liked = false;
      } else {
        await this.commentLikeModel.findOrCreate({
          where: { comment_id: commentId, user_id: userId },
          defaults: { comment_id: commentId, user_id: userId, created_at: new Date() },
          transaction,
        });
        await this.commentModel.increment('like_count', { by: 1, where: { id: commentId }, transaction });
        liked = true;
      }

      await comment.reload({ transaction });
      return { liked, likeCount: comment.like_count };
    });
  }
}
