/**
 * PostTranslation Model - Định nghĩa cấu trúc ORM cho bảng 'post_translations'
 * 
 * Bảng này đóng vai trò quan trọng trong việc hỗ trợ Đa ngôn ngữ (i18n).
 * Thay vì lưu nội dung (content) trực tiếp ở bảng `posts`, nội dung được bóc tách ra bảng này.
 * Một bài viết (Post) có thể có nhiều bản dịch (PostTranslation), mỗi bản tương ứng với 1 ngôn ngữ.
 */
import { BeforeSave, BeforeUpdate, Column, DataType, Model, Table } from 'sequelize-typescript';
import { removeAccents } from '../../../utils/string.util';

@Table({
  tableName: 'post_translations', // Tên bảng lưu trữ trong CSDL
  timestamps: false,              // Tắt tính năng tự sinh timestamp, quản lý thủ công (created_at, updated_at)
  underscored: true,              // Map snake_case ở DB sang camelCase ở Nodejs
  freezeTableName: true,          // Không thêm 's' vào tên bảng
})
export class PostTranslation extends Model {
  /**
   * DB Column: `id` (BIGINT UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → map sang translation.id ở response
   * GHI: Tự động sinh ra (auto increment) khi tạo mới một bản dịch
   */
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  /**
   * DB Column: `post_id` (BIGINT UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → FK để group translations theo bài viết (so sánh với posts.id)
   * GHI: Gắn id của bài viết gốc khi tạo bản dịch mới
   */
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare post_id: string;

  /**
   * DB Column: `language_id` (INTEGER UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → tra languageMap lấy code ngôn ngữ ('vi', 'en', ...) để gắn vào translation.languageCode
   * GHI: Gắn id của ngôn ngữ tương ứng với bản dịch khi tạo
   */
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare language_id: number;

  /**
   * DB Column: `title` (VARCHAR(255))
   * ĐỌC: PublicPostsService.listFeed() → map sang translation.title
   * GHI: User hoặc tiến trình dịch tự động lưu tiêu đề mới vào khi tạo/cập nhật
   */
  @Column(DataType.STRING(255))
  declare title: string | null;

  /**
   * DB Column: `slug` (VARCHAR(200))
   * ĐỌC: Các API cần lấy đường dẫn bài viết hoặc search theo đường dẫn SEO
   * GHI: Tự sinh dựa trên title khi lưu
   */
  @Column(DataType.STRING(200))
  declare slug: string | null;

  /**
   * DB Column: `content` (LONGTEXT)
   * ĐỌC: PublicPostsService.listFeed() → parse HTML lấy excerpt, tìm coverImageUrl / coverVideoUrl và trả về contentHtml
   * GHI: User sử dụng Rich Text Editor soạn thảo bài viết rồi đẩy lên server lưu
   */
  @Column(DataType.TEXT('long'))
  declare content: string | null;

  /**
   * DB Column: `translation_status` (ENUM)
   * ĐỌC: PublicPostsService.listFeed() → filter WHERE = 'completed', bỏ qua bản dịch đang xử lý hoặc lỗi
   * GHI: Tiến trình dịch tự động hoặc User chuyển trạng thái khi bản dịch thay đổi (queued, processing, completed...)
   */
  @Column({
    type: DataType.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'not_started',
  })
  declare translation_status: 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

  /**
   * DB Column: `translation_provider` (VARCHAR(50))
   * ĐỌC: PublicPostsService.listFeed() → xác định source: null='human', có giá trị='machine' (nếu không phải original_language)
   * GHI: Hệ thống tự ghi nhận nhà cung cấp (VD: 'google', 'openai') khi gọi API dịch máy thành công
   */
  @Column(DataType.STRING(50))
  declare translation_provider: string | null;

  /**
   * DB Column: `created_at` (DATETIME)
   * ĐỌC: Dùng để tham chiếu lúc thống kê
   * GHI: DB tự ghi thời gian insert
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  /**
   * DB Column: `updated_at` (DATETIME)
   * ĐỌC: Tham chiếu cache hoặc sync
   * GHI: Tự cập nhật khi content hay title bị chỉnh sửa
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  /**
   * DB Column: `unaccented_title` (VARCHAR(255))
   * ĐỌC: PublicPostsService.listFeed() → CHỈ dùng khi search (query.q có giá trị), LIKE '%keyword%' để tìm kiếm full text không dấu
   * GHI: Hàm generateUnaccented (hook) chạy BeforeSave/BeforeUpdate tự động xóa dấu của title rồi lưu vào đây
   */
  @Column({ type: DataType.STRING(255), allowNull: true })
  declare unaccented_title: string | null;

  /**
   * generateUnaccented() - Sequelize Lifecycle Hook
   * 
   * Hành vi: Tự động kích hoạt TRƯỚC KHI lưu (BeforeSave) bản ghi mới 
   * hoặc TRƯỚC KHI cập nhật (BeforeUpdate) bản ghi hiện có vào DB.
   * 
   * Mục đích: Lắng nghe sự thay đổi của cột `title`. 
   * Nếu `title` bị thay đổi, tự động tính toán lại cột `unaccented_title` thông qua hàm `removeAccents`
   * trước khi INSERT/UPDATE vào database.
   * Điều này giúp ứng dụng không bao giờ quên đồng bộ 2 cột này.
   */
  @BeforeSave
  @BeforeUpdate
  static generateUnaccented(instance: PostTranslation) {
    if (instance.changed('title') && instance.title) {
      instance.unaccented_title = removeAccents(instance.title);
    }
  }
}
