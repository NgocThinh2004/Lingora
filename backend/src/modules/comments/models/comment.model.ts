import { Column, DataType, Model, Table, BelongsTo, HasMany, ForeignKey } from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Post } from '../../posts/models/post.model';
import { CommentLike } from '../../likes/models/comment-like.model';
import { CommentTranslation } from './comment-translation.model';
import { Language } from '../../languages/models/language.model';

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

@Table({
  tableName: 'comments',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Comment extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @ForeignKey(() => Post)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare post_id: string;

  @BelongsTo(() => Post)
  declare post: Post;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: true })
  declare original_language_id: number | null;

  @BelongsTo(() => Language, 'original_language_id')
  declare originalLanguage: Language;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  @BelongsTo(() => User, 'user_id')
  declare author: User;

  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare parent_id: string | null;

  @BelongsTo(() => Comment, 'parent_id')
  declare parent: Comment;

  @HasMany(() => Comment, 'parent_id')
  declare replies: Comment[];

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare reply_to_comment_id: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true })
  declare reply_to_user_id: string | null;

  @BelongsTo(() => User, 'reply_to_user_id')
  declare replyToUser: User;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare reply_to_username: string | null;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  @Column({
    type: DataType.ENUM('pending', 'approved', 'rejected', 'hidden'),
    allowNull: false,
    defaultValue: 'approved',
  })
  declare status: CommentStatus;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare like_count: number;

  @HasMany(() => CommentLike)
  declare likes: CommentLike[];

  @HasMany(() => CommentTranslation)
  declare translations: CommentTranslation[];
}
