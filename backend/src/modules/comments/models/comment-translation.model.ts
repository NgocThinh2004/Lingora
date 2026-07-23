import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Comment } from './comment.model';
import { Language } from '../../languages/models/language.model';

export type TranslationStatus = 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

@Table({
  tableName: 'comment_translations',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class CommentTranslation extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare comment_id: string;

  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare language_id: number;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  @Column({
    type: DataType.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'not_started'
  })
  declare translation_status: TranslationStatus;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare updated_at: Date;

  @BelongsTo(() => Comment)
  declare comment: Comment;

  @BelongsTo(() => Language)
  declare language: Language;
}
