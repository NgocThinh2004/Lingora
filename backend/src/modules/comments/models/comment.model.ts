/**
 * Comment Model - Định nghĩa cấu trúc ORM cho bảng 'comments' trong Database.
 * 
 * Chi tiết các trường DB:
 * comments.id → PK
 * comments.post_id → FK → posts.id (bài viết chứa comment này)
 * comments.user_id → FK → users.id (người viết comment)
 * comments.parent_id → FK tự tham chiếu → comments.id
 *   NULL: đây là root comment
 *   Có giá trị: đây là reply, trỏ đến root comment cha
 * comments.reply_to_comment_id → comment được reply trực tiếp (khác parent_id khi reply-of-reply)
 *   VD: Root(id=1) → Reply A(id=2, parent=1) → Reply B(id=3, parent=1, reply_to=2)
 *   parent_id=1 (luôn là root, flat-thread), reply_to_comment_id=2 (để FE hiển thị '@A')
 * comments.reply_to_user_id → user_id của người được tag (@mention)
 * comments.reply_to_username → display_name để FE hiển thị '@username' không cần JOIN users
 * comments.content → nội dung văn bản thô
 * comments.like_count → cached counter, tăng/giảm qua comment_likes table
 * comments.status → 'approved' | 'pending' | 'rejected'
 * comments.original_language_id → FK → languages.id, phát hiện ngôn ngữ bằng franc-min
 */
import { Column, DataType, Model, Table, BelongsTo, HasMany, ForeignKey } from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Post } from '../../posts/models/post.model';
import { CommentLike } from '../../likes/models/comment-like.model';
import { CommentTranslation } from './comment-translation.model';
import { Language } from '../../languages/models/language.model';

// Các trạng thái của một bình luận trong hệ thống (Hỗ trợ kiểm duyệt)
export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

@Table({
  tableName: 'comments',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Comment extends Model {
  // comments.id → PK
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  // comments.post_id → FK → posts.id (bài viết chứa comment này)
  @ForeignKey(() => Post)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare post_id: string;

  @BelongsTo(() => Post)
  declare post: Post;

  // comments.original_language_id → FK → languages.id, phát hiện ngôn ngữ bằng franc-min
  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare original_language_id: number | null;

  @BelongsTo(() => Language, 'original_language_id')
  declare originalLanguage: Language;

  // comments.user_id → FK → users.id (người viết comment)
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  @BelongsTo(() => User, 'user_id')
  declare author: User;

  // comments.parent_id → FK tự tham chiếu → comments.id
  // NULL: đây là root comment | Có giá trị: đây là reply, trỏ đến root comment cha
  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare parent_id: string | null;

  @BelongsTo(() => Comment, 'parent_id')
  declare parent: Comment;

  @HasMany(() => Comment, 'parent_id')
  declare replies: Comment[];

  // comments.reply_to_comment_id → comment được reply trực tiếp (khác parent_id khi reply-of-reply)
  // VD: Root(id=1) → Reply A(id=2, parent=1) → Reply B(id=3, parent=1, reply_to=2)
  // parent_id=1 (luôn là root, flat-thread), reply_to_comment_id=2 (để FE hiển thị '@A')
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare reply_to_comment_id: string | null;

  // comments.reply_to_user_id → user_id của người được tag (@mention)
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare reply_to_user_id: string | null;

  @BelongsTo(() => User, 'reply_to_user_id')
  declare replyToUser: User;

  // comments.reply_to_username → display_name để FE hiển thị '@username' không cần JOIN users
  @Column({ type: DataType.STRING(150), allowNull: true })
  declare reply_to_username: string | null;

  // comments.content → nội dung văn bản thô
  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  // comments.status → 'approved' | 'pending' | 'rejected' | 'hidden'
  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected', 'hidden'),
    allowNull: false,
    defaultValue: 'approved',
  })
  declare status: CommentStatus;

  /**
   * Thời gian tạo bình luận
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  /**
   * Thời gian chỉnh sửa gần nhất
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  // comments.like_count → cached counter, tăng/giảm qua comment_likes table
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare like_count: number;

  /**
   * Quan hệ (1-n) với bảng `comment_likes`
   * Dùng để query xem user hiện tại đã like comment này hay chưa.
   */
  @HasMany(() => CommentLike)
  declare likes: CommentLike[];

  /**
   * Quan hệ (1-n) với bảng `comment_translations`
   * Một bình luận có thể được dịch ra nhiều thứ tiếng khác nhau.
   */
  @HasMany(() => CommentTranslation)
  declare translations: CommentTranslation[];
}
