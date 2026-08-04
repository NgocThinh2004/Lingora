/**
 * PostLike model - Class ánh xạ (ORM mapping) từ Code đến bảng post_likes trong DB.
 * 
 * Mục đích: Lưu trữ thông tin sự kiện một User đã "Thích" một Post cụ thể.
 * 
 * Thiết kế index cực kỳ quan trọng: 
 * - Sử dụng Composite Unique Index (indexes: unique kết hợp post_id và user_id) với tên 'post_likes_post_id_user_id_unique'.
 * Giải thích: Index duy nhất này là chốt chặn cuối cùng tại tầng Database. Nếu có 1 lỗi logic nào đó (hoặc race condition bị lọt) cố tình tạo ra 2 bản ghi like của cùng 1 user cho 1 bài viết, DB sẽ văng lỗi (Duplicate Key), ngăn chặn dữ liệu rác, đếm sai số lượng like.
 */
import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Post } from '../../posts/models/post.model';
import { User } from '../../users/models/user.model';

@Table({
  tableName: 'post_likes',
  timestamps: false, // Tắt timestamps tự động (updatedAt) do bảng này chỉ ghi log hành động khởi tạo (created_at)
  underscored: true,
  freezeTableName: true, // Không tự động chuyển đổi tên bảng (class PostLike) thành dạng số nhiều khi render SQL
  indexes: [
    {
      // Index đảm bảo (post_id, user_id) là duy nhất trên toàn bảng.
      // Cú pháp SQL ngầm định: CREATE UNIQUE INDEX post_likes_post_id_user_id_unique ON post_likes (post_id, user_id);
      unique: true,
      fields: ['post_id', 'user_id'],
      name: 'post_likes_post_id_user_id_unique',
    },
  ],
})
export class PostLike extends Model {
  // @Column định nghĩa cột này trong DB. Khóa chính (Primary Key), tự tăng.
  // SQL: id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  // @ForeignKey chỉ định cột post_id tham chiếu đến ID bảng posts.
  // SQL: post_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (post_id) REFERENCES posts(id)
  @ForeignKey(() => Post)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare post_id: string;

  // Khóa ngoại tham chiếu bảng users, lưu thông tin ai là người ấn Like.
  // SQL: user_id BIGINT UNSIGNED NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id)
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  // Lưu trữ mốc thời gian thực hiện Like. Mặc định là giờ hiện tại.
  // SQL: created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare created_at: Date;

  // @BelongsTo là các định nghĩa Relationship (ORM). Giúp lúc truy vấn bằng Sequelize (ví dụ findOne) có thể include để tự động JOIN sinh ra SQL gộp.
  @BelongsTo(() => Post)
  declare post: Post;

  @BelongsTo(() => User)
  declare user: User;
}
