import { Column, DataType, Model, Table, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Comment } from './comment.model';

@Table({
  tableName: 'comment_likes',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class CommentLike extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare comment_id: string;

  @BelongsTo(() => Comment)
  declare comment: Comment;

  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  @BelongsTo(() => User)
  declare user: User;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;
}
