import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'translation_attempts', timestamps: false, underscored: true, freezeTableName: true })
export class TranslationAttempt extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare post_translation_id: string;
  @Column({ type: DataType.STRING(50), allowNull: false }) declare provider: string;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 }) declare attempt_order: number;
  @Column({ type: DataType.ENUM('success', 'failed', 'rate_limited', 'timeout'), allowNull: false })
  declare status: 'success' | 'failed' | 'rate_limited' | 'timeout';
  @Column(DataType.TEXT) declare error_message: string | null;
  @Column(DataType.INTEGER.UNSIGNED) declare char_count: number | null;
  @Column({ type: DataType.DATE, allowNull: false }) declare started_at: Date;
  @Column(DataType.DATE) declare finished_at: Date | null;
}
