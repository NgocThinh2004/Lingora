import { BeforeSave, BeforeUpdate, Column, DataType, Model, Table } from 'sequelize-typescript';
import { removeAccents } from '../../../utils/string.util';

@Table({
  tableName: 'category_translations',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class CategoryTranslation extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare category_id: number;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare language_id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare slug: string;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare unaccented_name: string | null;

  @BeforeSave
  @BeforeUpdate
  static generateUnaccented(instance: CategoryTranslation) {
    if (instance.changed('name') && instance.name) {
      instance.unaccented_name = removeAccents(instance.name);
    }
  }
}
