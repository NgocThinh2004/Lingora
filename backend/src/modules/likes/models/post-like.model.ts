import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'post_likes', timestamps: false, underscored: true, freezeTableName: true })
export class PostLike extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare user_id: string;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}
