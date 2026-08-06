import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { EditorMediaType } from '../uploads.constants';

export type MediaAssetStatus = 'temporary' | 'attached' | 'deleted';
export type MediaAssetPurpose = 'avatar' | 'post';

@Table({
  tableName: 'media_assets',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
})
export class MediaAsset extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  @Column(DataType.BIGINT.UNSIGNED)
  declare owner_id: string | null;

  @Column({ type: DataType.ENUM('avatar', 'post'), allowNull: false })
  declare purpose: MediaAssetPurpose;

  @Column(DataType.BIGINT.UNSIGNED)
  declare post_id: string | null;

  @Column({ type: DataType.STRING(500), allowNull: false, unique: true })
  declare object_key: string;

  @Column({ type: DataType.ENUM('image', 'audio', 'video'), allowNull: false })
  declare media_type: EditorMediaType;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare mime_type: string;

  @Column(DataType.STRING(255))
  declare original_name: string | null;

  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare size_bytes: string;

  @Column(DataType.INTEGER.UNSIGNED)
  declare width: number | null;

  @Column(DataType.INTEGER.UNSIGNED)
  declare height: number | null;

  @Column(DataType.DECIMAL(10, 2))
  declare duration_seconds: string | null;

  @Column({
    type: DataType.ENUM('temporary', 'attached', 'deleted'),
    allowNull: false,
    defaultValue: 'temporary',
  })
  declare status: MediaAssetStatus;

  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  @Column(DataType.DATE)
  declare deleted_at: Date | null;
}
