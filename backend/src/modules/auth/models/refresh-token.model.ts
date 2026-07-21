import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'refresh_tokens',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class RefreshToken extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare user_id: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  declare token_hash: string;

  @Column(DataType.STRING(255))
  declare device_info: string | null;

  @Column(DataType.STRING(45))
  declare ip_address: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expires_at: Date;

  @Column(DataType.DATE)
  declare last_used_at: Date | null;

  @Column(DataType.DATE)
  declare revoked_at: Date | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;
}
