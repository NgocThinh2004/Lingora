import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PostLike } from './models/post-like.model';
import { Post } from '../posts/models/post.model';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(PostLike) private readonly postLikeModel: typeof PostLike,
    @InjectModel(Post) private readonly postModel: typeof Post,
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
}
