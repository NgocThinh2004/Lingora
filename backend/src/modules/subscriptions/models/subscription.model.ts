/**
 * Subscription model - Đại diện cho bảng subscriptions trong DB.
 * 
 * Bảng này lưu trữ quan hệ nhiều - nhiều (N-N) một chiều: người dùng (subscriber) theo dõi tác giả (author).
 * 
 * DB: Bảng `subscriptions`. 
 * Ý nghĩa của index `subscriptions_subscriber_id_author_id_unique`:
 * - UNIQUE INDEX (subscriber_id, author_id):
 *   -> DB-level: không thể INSERT 2 dòng cùng subscriber_id+author_id (ngăn chặn tình trạng 1 người follow 2 lần).
 *   -> findOrCreate an toàn: nếu đã follow rồi chỉ SELECT, không INSERT thêm.
 */
import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'subscriptions',
  timestamps: false,
  underscored: true,
  freezeTableName: true,
  indexes: [
    {
      unique: true, // Không cho phép trùng lặp cặp (subscriber_id, author_id)
      fields: ['subscriber_id', 'author_id'],
      name: 'subscriptions_subscriber_id_author_id_unique',
    },
  ],
})
export class Subscription extends Model {
  // subscriptions.id -> PK. ID chính tự động tăng của bảng
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true }) declare id: string;
  
  // subscriptions.subscriber_id -> FK -> users.id (người đang follow)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare subscriber_id: string;
  
  // subscriptions.author_id -> FK -> users.id (người được follow)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false }) declare author_id: string;
  
  // Thời gian lần cuối user xem bài của tác giả (để làm tính năng thông báo có bài mới)
  @Column(DataType.DATE) declare last_viewed_at: Date | null;
  
  // subscriptions.created_at -> thời điểm bắt đầu follow
  @Column({ type: DataType.DATE, allowNull: false }) declare created_at: Date;
}
