import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'post_translations',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class PostTranslation extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare post_id: string;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare language_id: number;

  @Column(DataType.STRING(255))
  declare title: string | null;

  @Column(DataType.STRING(200))
  declare slug: string | null;

  @Column(DataType.TEXT('long'))
  declare content: string | null;

  @Column({
    type: DataType.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'not_started',
  })
  declare translation_status: 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

  @Column(DataType.STRING(50))
  declare translation_provider: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;
}
