/**
 * Post Model - Định nghĩa cấu trúc ORM cho bảng 'posts' trong Database.
 * 
 * Bảng này là thực thể trung tâm của hệ thống, lưu trữ dữ liệu cốt lõi (meta-data) của mỗi bài viết.
 * Lưu ý: Tiêu đề và nội dung bài viết KHÔNG lưu ở bảng này mà lưu ở bảng `post_translations`
 * để phục vụ hệ thống đa ngôn ngữ (i18n).
 */
import { Column, DataType, Model, Table, HasMany, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { Comment } from '../../comments/models/comment.model';
// import { User } from '../../users/models/user.model'; // Giả định import để map association (nếu cần thiết ở file gốc)

@Table({
  tableName: 'posts',       // Tên bảng chính xác trong hệ quản trị CSDL
  timestamps: false,        // Tắt tính năng tự quản lý createdAt/updatedAt mặc định của Sequelize
  underscored: true,        // Chuyển đối tên cột dạng camelCase thành snake_case
  freezeTableName: true,    // Chặn Sequelize tự ý thay đổi tên bảng sang số nhiều
})
export class Post extends Model {
  /**
   * DB Column: `id` (BIGINT UNSIGNED, AUTO_INCREMENT)
   * ĐỌC: PublicPostsService.listFeed() → map sang response.id để định danh bài viết
   * GHI: DB tự động sinh ra khi gọi hàm tạo bài viết mới.
   */
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  /**
   * DB Column: `author_id` (BIGINT UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → dùng để build Set authorIds, sau đó JOIN sang bảng users để lấy thông tin tác giả
   * GHI: Gắn id của user thực hiện request khi tạo bài viết (từ token/session)
   */
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare author_id: string;

  /**
   * DB Column: `category_id` (INTEGER UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → dùng để build Set categoryIds, JOIN sang bảng categories và category_translations để lấy tên, slug
   * GHI: Gắn id của chuyên mục khi người dùng hoặc admin chọn lúc đăng bài
   */
  @Column(DataType.INTEGER.UNSIGNED)
  declare category_id: number | null;

  /**
   * DB Column: `original_language_id` (INTEGER UNSIGNED)
   * ĐỌC: PublicPostsService.listFeed() → tra trong languageMap để biết mã ngôn ngữ gốc (ví dụ 'vi', 'en'), từ đó xác định bản dịch gốc
   * GHI: Gắn id của ngôn ngữ dựa trên lựa chọn của tác giả khi bắt đầu viết bài
   */
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare original_language_id: number;

  /**
   * DB Column: `view_count` (INT UNSIGNED, DEFAULT 0)
   * ĐỌC: PublicPostsService.listFeed() → map sang response.viewCount để FE hiển thị, cũng dùng để tính điểm trending trong ORDER BY
   * GHI: PublicPostsService.getById() → post.increment('view_count') khi user xem bài (sau khi check Redis cache chống spam)
   * KHÔNG dùng JOIN/subquery để đếm, lưu thẳng để đọc O(1)
   */
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare view_count: number;

  /**
   * DB Column: `like_count` (INT UNSIGNED, DEFAULT 0)
   * ĐỌC: PublicPostsService.listFeed() → map sang response.likeCount để hiển thị và tính điểm trending
   * GHI: LikesService (giả định) → post.increment hoặc post.decrement khi user bấm like/unlike
   */
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare like_count: number;

  /**
   * DB Column: `comment_count` (INT UNSIGNED, DEFAULT 0)
   * ĐỌC: PublicPostsService.listFeed() → map sang response.commentCount để hiển thị và tính điểm trending
   * GHI: CommentsService → cập nhật đồng bộ thông qua DB Transaction khi có comment mới được tạo hoặc xóa
   */
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 })
  declare comment_count: number;

  /**
   * DB Column: `status` (ENUM)
   * ĐỌC: PublicPostsService.listFeed() → map sang response.status (thường filter cố định 'approved', 'published')
   * GHI: Admin/Mod duyệt bài viết (chuyển từ 'pending_review' sang 'approved' hoặc 'rejected') hoặc tác giả đổi trạng thái
   */
  @Column({
    type: DataType.ENUM('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
  })
  declare status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';

  /**
   * DB Column: `review_note` (TEXT)
   * ĐỌC: Phía Admin/Tác giả đọc để biết vì sao bài viết bị từ chối
   * GHI: Admin/Mod nhập vào khi đổi status bài viết thành 'rejected'
   */
  @Column(DataType.TEXT)
  declare review_note: string | null;

  /**
   * DB Column: `published_at` (DATETIME)
   * ĐỌC: PublicPostsService.listFeed() → dùng làm createdAt trong response (ưu tiên hơn posts.created_at) và dùng để sắp xếp ORDER BY
   * GHI: Cập nhật khi bài viết chính thức chuyển sang trạng thái published
   */
  @Column(DataType.DATE)
  declare published_at: Date | null;

  /**
   * DB Column: `created_at` (DATETIME)
   * ĐỌC: PublicPostsService.listFeed() → dùng làm createdAt dự phòng trong response nếu published_at bị null
   * GHI: Tự động ghi nhận lúc bản ghi được tạo
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare created_at: Date;

  /**
   * DB Column: `updated_at` (DATETIME)
   * ĐỌC: Lấy ra để biết thời điểm chỉnh sửa cuối cùng
   * GHI: Tự động cập nhật mỗi khi bản ghi có thay đổi
   */
  @Column({ type: DataType.DATE, allowNull: false })
  declare updated_at: Date;

  /**
   * DB Column: `deleted_at` (DATETIME)
   * ĐỌC: PublicPostsService.listFeed() → nằm trong điều kiện WHERE deleted_at IS NULL (bỏ qua bài đã bị xóa mềm)
   * GHI: Khi gọi hàm xóa mềm (soft delete), lưu thời điểm xóa thay vì xóa cứng khỏi DB
   */
  @Column(DataType.DATE)
  declare deleted_at: Date | null;

  /**
   * Quan hệ (1-n): Một Bài viết có thể có nhiều Bình luận.
   * Việc định nghĩa HasMany ở đây giúp Sequelize hiểu cách sinh lệnh SQL JOIN `posts` với `comments` 
   * dựa trên cột `post_id` trong bảng `comments`.
   */
  @HasMany(() => Comment, 'post_id')
  declare comments: Comment[];
}
