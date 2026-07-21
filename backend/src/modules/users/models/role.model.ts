import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'roles',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class Role extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(50), allowNull: false, unique: true })
  declare name: string;
}
