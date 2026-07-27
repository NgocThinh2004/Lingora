import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'subscriptions',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true,
      fields: ['subscriber_id', 'author_id'],
      name: 'subscriptions_subscriber_id_author_id_unique',
    },
  ],
})
export class Subscription extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare subscriber_id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare author_id: string;
  @Column(DataType.DATE) declare last_viewed_at: Date | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}
