import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'comments', timestamps: false, underscored: true, freezeTableName: true })
export class Comment extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column(DataType.BIGINT.UNSIGNED) declare parent_id: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare reply_to_comment_id: string | null;
  @Column(DataType.BIGINT.UNSIGNED) declare reply_to_user_id: string | null;
  @Column(DataType.STRING(150)) declare reply_to_username: string | null;
  @Column({ type: DataType.TEXT, allowNull: false }) declare content: string;
  @Column({ type: DataType.ENUM('pending', 'approved', 'rejected', 'hidden'), allowNull: false, defaultValue: 'approved' })
  declare status: 'pending' | 'approved' | 'rejected' | 'hidden';
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
  @Column({ type: DataType.DATE, allowNull: false }) declare updated_at: Date;
}
