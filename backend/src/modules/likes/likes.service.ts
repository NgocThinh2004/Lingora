import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PostLike } from './models/post-like.model';
import { CommentLike } from './models/comment-like.model';
import { Post } from '../posts/models/post.model';
import { Comment } from '../comments/models/comment.model';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(PostLike) private readonly postLikeModel: typeof PostLike,
    @InjectModel(CommentLike) private readonly commentLikeModel: typeof CommentLike,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
  ) {}

  async togglePostLike(postId: string, userId: string) {
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingLike = await this.postLikeModel.findOne({
      where: { post_id: postId, user_id: userId },
    });

    if (existingLike) {
      await existingLike.destroy();
    } else {
      await this.postLikeModel.create({ post_id: postId, user_id: userId });
    }

    const likeCount = await this.postLikeModel.count({ where: { post_id: postId } });
    return { liked: !existingLike, likeCount };
  }

  async toggleCommentLike(commentId: string, userId: string) {
    const comment = await this.commentModel.findByPk(commentId);
    if (!comment) throw new NotFoundException('Comment not found');

    const existingLike = await this.commentLikeModel.findOne({
      where: { comment_id: commentId, user_id: userId },
    });

    if (existingLike) {
      await existingLike.destroy();
    } else {
      await this.commentLikeModel.create({
        comment_id: commentId,
        user_id: userId,
        created_at: new Date(),
      });
    }

    const likeCount = await this.commentLikeModel.count({ where: { comment_id: commentId } });
    return { liked: !existingLike, likeCount };
  }
}
