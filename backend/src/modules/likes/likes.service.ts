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

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "LIKE BÀI VIẾT" / "UNLIKE BÀI VIẾT"
   * ═══════════════════════════════════════════════════════════════════════════
   * LUỒNG XỬ LÝ CHI TIẾT TỪ REQUEST XUỐNG DB VÀ CHỐNG RACE CONDITION
   *
   * 1. Bắt đầu Transaction (Mở giao dịch):
   *    - Hành động: Bắt đầu 1 transaction để gộp nhiều truy vấn.
   *    - Mục đích: Đảm bảo tính toàn vẹn dữ liệu (Nếu lỗi ở bất kỳ bước nào, toàn bộ thay đổi sẽ bị hủy - Rollback).
   *
   * 2. Tìm bài viết và Khóa dòng (LOCK.UPDATE):
   *    - Hành động: Tìm xem user này đã like bài viết này chưa. Kèm theo cơ chế LOCK.UPDATE (SELECT ... FOR UPDATE).
   *    - Mục đích: Giải quyết vấn đề Race Condition khi user spam click liên tục (ví dụ click 3 lần trong 1ms).
   *    - Giải thích RACE CONDITION: 
   *      + Nếu không khóa: Cả 3 request cùng đọc DB và thấy "Chưa Like", sau đó cả 3 cùng Insert vào bảng post_likes và tăng like_count lên +3 (Sai).
   *      + Có khóa (LOCK.UPDATE): Request đầu tiên đến sẽ KHÓA dòng dữ liệu này. 2 request sau đến phải ĐỨNG ĐỢI cho đến khi Request 1 xử lý xong và nhả khóa. Khi nhả khóa, Request 2 sẽ đọc lại và thấy "Đã Like" (do Req 1 vừa tạo), lúc này Req 2 sẽ thực hiện hành động Bỏ Like.
   *
   * 3. Xử lý Toggle Like / Unlike:
   *    - Nếu ĐÃ LIKE (Tồn tại bản ghi):
   *      + Xóa bản ghi trong `post_likes` (DELETE).
   *      + Giảm `like_count` của bài viết đi 1 (UPDATE posts SET like_count = like_count - 1).
   *    - Nếu CHƯA LIKE (Chưa có bản ghi):
   *      + Tạo bản ghi mới trong `post_likes` (INSERT).
   *      + Tăng `like_count` của bài viết lên 1 (UPDATE posts SET like_count = like_count + 1).
   *
   * 4. Reload bài viết và Commit Transaction:
   *    - Lấy lại số lượng `like_count` mới nhất và lưu DB.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async togglePostLike(postId: string, userId: string) {
    return this.sequelize.transaction(async (transaction) => {
      // BƯỚC 1: Kiểm tra xem Bài viết có tồn tại hay không.
      const post = await this.postModel.findByPk(postId, { transaction });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // BƯỚC 2: Kiểm tra trạng thái LIKE hiện tại và áp dụng KHÓA (LOCK.UPDATE)
      // SQL: SELECT * FROM post_likes WHERE post_id = ... AND user_id = ... FOR UPDATE;
      const existingLike = await this.postLikeModel.findOne({
        where: { post_id: postId, user_id: userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      let liked = false;
      
      // BƯỚC 3: Xử lý logic Thêm / Xóa Like
      if (existingLike) {
        // [User ĐÃ LIKE] -> Thực hiện hành động: BỎ LIKE (UNLIKE)
        
        // 1. Xóa record khỏi bảng post_likes
        // SQL: DELETE FROM post_likes WHERE id = ...
        await existingLike.destroy({ transaction });
        
        // 2. Giảm biến đếm số lượt like của bài viết
        // SQL: UPDATE posts SET like_count = like_count - 1 WHERE id = ...
        await this.postModel.decrement('like_count', { by: 1, where: { id: postId }, transaction });
        liked = false;
      } else {
        // [User CHƯA LIKE] -> Thực hiện hành động: LIKE BÀI VIẾT
        
        // 1. Thêm 1 record mới vào bảng post_likes
        // SQL: INSERT INTO post_likes (post_id, user_id) VALUES (...)
        await this.postLikeModel.create(
          { post_id: postId, user_id: userId },
          { transaction },
        );
        
        // 2. Tăng biến đếm số lượt like của bài viết
        // SQL: UPDATE posts SET like_count = like_count + 1 WHERE id = ...
        await this.postModel.increment('like_count', { by: 1, where: { id: postId }, transaction });
        liked = true;
      }

      // BƯỚC 4: Load lại entity Post để lấy ra like_count thực tế sau update
      // SQL: SELECT * FROM posts WHERE id = ...
      await post.reload({ transaction });
      
      // Hoàn tất Transaction (Tự động COMMIT ngầm định)
      return { liked, likeCount: post.like_count };
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "LIKE BÌNH LUẬN" / "UNLIKE BÌNH LUẬN"
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý tương tự như Thích Bài Viết:
   * 1. Transaction được mở để đóng gói nhóm truy vấn.
   * 2. Tìm comment và check tồn tại.
   * 3. SELECT ... FOR UPDATE (Khóa dòng ở bảng comment_likes) để chống Race Condition khi spam click.
   * 4. Toggle Like:
   *    - Nếu có (Đã Like): Xóa (DELETE) + Trừ số like của comment (UPDATE ... SET like_count = like_count - 1).
   *    - Nếu chưa (Chưa Like): Thêm (INSERT) + Cộng số like của comment (UPDATE ... SET like_count = like_count + 1).
   * 5. Reload lại comment lấy số đếm mới nhất để trả về cho UI cập nhật.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async toggleCommentLike(commentId: string, userId: string) {
    return this.sequelize.transaction(async (transaction) => {
      // 1. Kiểm tra tồn tại của comment
      const comment = await this.commentModel.findByPk(commentId, { transaction });
      if (!comment) throw new NotFoundException('Comment not found');

      // 2. Tìm kiếm và áp dụng Lock dòng cho record like của user lên comment này
      const existingLike = await this.commentLikeModel.findOne({
        where: { comment_id: commentId, user_id: userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      let liked = false;
      if (existingLike) {
        // [ĐÃ LIKE] -> User hủy like
        // SQL: DELETE FROM comment_likes WHERE id = ...
        await existingLike.destroy({ transaction });
        
        // SQL: UPDATE comments SET like_count = like_count - 1 WHERE id = ...
        await this.commentModel.decrement('like_count', { by: 1, where: { id: commentId }, transaction });
        liked = false;
      } else {
        // [CHƯA LIKE] -> User tiến hành like
        // SQL: INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES (...)
        await this.commentLikeModel.create(
          { comment_id: commentId, user_id: userId, created_at: new Date() },
          { transaction },
        );
        
        // SQL: UPDATE comments SET like_count = like_count + 1 WHERE id = ...
        await this.commentModel.increment('like_count', { by: 1, where: { id: commentId }, transaction });
        liked = true;
      }

      // 3. Lấy ra số lượng like mới nhất
      await comment.reload({ transaction });
      return { liked, likeCount: comment.like_count };
    });
  }

  /**
   * Lấy chỉ số tổng quan (Dashboad Metrics) về lượt Like toàn hệ thống.
   */
  async getDashboardMetrics() {
    const [postLikes, commentLikes] = await Promise.all([
      this.postLikeModel.count(),
      this.commentLikeModel.count(),
    ]);
    return { postLikes, commentLikes, total: postLikes + commentLikes };
  }
}
