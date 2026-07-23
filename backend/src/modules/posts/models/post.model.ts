import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'posts',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Post extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare author_id: string;

  @Column(DataType.INTEGER.UNSIGNED)
  declare category_id: number | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare original_language_id: number;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare view_count: number;

  @Column(DataType.STRING(500))
  declare image_url: string | null;

  @Column({
    type: DataType.ENUM('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  })
  declare status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';

  @Column(DataType.TEXT)
  declare review_note: string | null;

  @Column(DataType.DATE)
  declare published_at: Date | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  @Column(DataType.DATE)
  declare deleted_at: Date | null;
}
