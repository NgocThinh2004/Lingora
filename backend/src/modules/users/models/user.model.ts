import { Column, DataType, Model, Table, HasMany } from 'sequelize-typescript';
import { Comment } from '../../comments/models/comment.model';
import { CommentLike } from '../../comments/models/comment-like.model';

export type UserStatus = 'active' | 'inactive' | 'banned';

@Table({
  tableName: 'users',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class User extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare username: string;

  @Column(DataType.STRING(150))
  declare display_name: string | null;

  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare password: string;

  @Column(DataType.STRING(255))
  declare avatar: string | null;

  @Column(DataType.TEXT)
  declare bio: string | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare role_id: number;

  @Column({
    type: DataType.ENUM('active', 'inactive', 'banned'),
    allowNull: false,
    defaultValue: 'active',
  })
  declare status: UserStatus;

  @Column(DataType.STRING(255))
  declare password_reset_otp_hash: string | null;

  @Column(DataType.DATE)
  declare password_reset_expires_at: Date | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare password_reset_attempts: number;

  @Column(DataType.DATE)
  declare password_reset_sent_at: Date | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  @Column(DataType.DATE)
  declare deleted_at: Date | null;

  @HasMany(() => Comment, 'user_id')
  declare comments: Comment[];

  @HasMany(() => CommentLike, 'user_id')
  declare comment_likes: CommentLike[];
}
