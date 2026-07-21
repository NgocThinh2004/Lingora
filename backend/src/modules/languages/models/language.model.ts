import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'languages',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Language extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(10), allowNull: false, unique: true })
  declare code: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare native_name: string;

  @Column(DataType.STRING(5))
  declare flag_code: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare is_default: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare is_active: boolean;
}
