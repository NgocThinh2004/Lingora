import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'categories',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Category extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare slug: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'active' })
  declare status: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare is_system: boolean;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;
}
