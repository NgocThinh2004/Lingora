/**
 * CommentLike model - Class ánh xạ (ORM mapping) từ Code đến bảng comment_likes trong DB.
 * 
 * Mục đích: Lưu trữ dữ liệu về việc người dùng (User) đã "Thích" một bình luận (Comment) cụ thể.
 * 
 * DB: Bảng `comment_likes`.
 * Cơ chế an toàn (Data Integrity): Sử dụng Unique Index (chỉ mục duy nhất) kết hợp giữa `comment_id` và `user_id`.
 * Giống như PostLike, điều này bảo vệ DB không bị insert trùng lặp (ví dụ 1 user cố tình spam like 1 comment nhiều lần).
 */
import { Column, DataType, Model, Table, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Comment } from '../../comments/models/comment.model';

@Table({
  tableName: 'comment_likes',
  timestamps: false, // Bảng này chỉ cần thời điểm tạo (created_at), không cần updated_at nên tắt tính năng timestamps tự động của Sequelize.
  underscored: true,
  freezeTableName: true, // Giữ nguyên tên bảng là 'comment_likes' trong DB
  indexes: [
    {
      // Ngăn chặn 1 User (user_id) like 1 Bình luận (comment_id) quá 1 lần.
      // Lệnh SQL tương đương: CREATE UNIQUE INDEX comment_likes_comment_id_user_id_unique ON comment_likes (comment_id, user_id);
      unique: true,
      fields: ['comment_id', 'user_id'],
      name: 'comment_likes_comment_id_user_id_unique',
    },
  ],
})
export class CommentLike extends Model {
  // Định nghĩa khóa chính, kiểu BIGINT, không dấu, tự tăng tự động
  // SQL: id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  // Cột liên kết với bảng comments để biết đang like bình luận nào
  // SQL: comment_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (comment_id) REFERENCES comments(id)
  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare comment_id: string;

  // Khai báo ORM relation (JOIN) với model Comment.
  @BelongsTo(() => Comment)
  declare comment: Comment;

  // Cột liên kết với bảng users để biết ai là người bấm like
  // SQL: user_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id)
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  // Khai báo ORM relation (JOIN) với model User.
  @BelongsTo(() => User)
  declare user: User;

  // Lưu lại ngày giờ lúc bấm like
  // SQL: created_at DATETIME NOT NULL
  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;
}
