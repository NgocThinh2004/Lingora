import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Comment } from './comment.model';
import { Language } from '../../languages/models/language.model';

/**
 * TranslationStatus - Enum mô tả vòng đời (lifecycle) của một bản dịch bình luận.
 *
 * - 'not_started' : Chưa có yêu cầu dịch nào được gửi đi.
 * - 'queued'      : Đã có yêu cầu dịch, đang nằm trong hàng chờ (thường xảy ra khi nội dung gốc vừa được cập nhật).
 * - 'processing'  : Đang gọi API dịch thuật bên ngoài (TranslationProviderService), chưa có kết quả.
 * - 'completed'   : Dịch thành công, cột `content` đã chứa bản dịch hoàn chỉnh sẵn sàng hiển thị.
 * - 'failed'      : Dịch thất bại (lỗi API hoặc timeout), sẽ được thử lại ở lần request tiếp theo.
 *
 * Trong CommentsService.translate():
 *   - Nếu status là 'failed' | 'not_started' | 'queued' → gọi lại API dịch.
 *   - Nếu status là 'completed' → trả về bản dịch đã có, không gọi API thêm.
 *   - Nếu status là 'processing' → đang xử lý, cũng không gọi thêm để tránh duplicate.
 */
export type TranslationStatus = 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

/**
 * CommentTranslation Model - Bảng `comment_translations` trong Database.
 *
 * Mục đích: Lưu trữ nội dung bình luận đã được dịch sang các ngôn ngữ khác nhau.
 * Hệ thống đa ngôn ngữ (i18n) của bình luận hoạt động tương tự bảng `post_translations`,
 * nhưng đơn giản hơn vì bình luận không có title, chỉ có content.
 *
 * Quan hệ DB:
 *   comment_translations.comment_id → comments.id  (N-1: nhiều bản dịch thuộc 1 bình luận)
 *   comment_translations.language_id → languages.id (N-1: nhiều bản dịch thuộc 1 ngôn ngữ)
 *
 * Ví dụ thực tế:
 *   Bình luận gốc (comment.id = 5, tiếng Việt): "Bài viết rất hay!"
 *   → comment_translations: { comment_id: 5, language_id: 2 (EN), content: "Great article!", status: 'completed' }
 *   → comment_translations: { comment_id: 5, language_id: 3 (ZH), content: "文章很好！",    status: 'completed' }
 *
 * Khi nào tạo bản ghi mới?
 *   CommentsService.translate() được gọi khi FE yêu cầu dịch bình luận sang ngôn ngữ X.
 *   Nếu chưa có record (comment_id + language_id) → INSERT mới với status = 'queued'.
 *   Nếu đã có → kiểm tra status để quyết định có gọi lại API dịch không.
 *
 * Khi nào reset về 'queued'?
 *   CommentsService.update() → khi nội dung bình luận gốc bị sửa, tất cả bản dịch cũ
 *   đều bị đặt lại về 'queued' để buộc hệ thống dịch lại với nội dung mới.
 *   SQL: UPDATE comment_translations SET translation_status = 'queued' WHERE comment_id = ?
 */
@Table({
  tableName: 'comment_translations', // Tên bảng thực tế trong DB
  timestamps: false,                 // Tắt auto-manage createdAt/updatedAt của Sequelize
  underscored: true,                 // Tự động map camelCase → snake_case cho tên cột
  freezeTableName: true,             // Không tự plural hóa tên bảng
})
export class CommentTranslation extends Model {
  /**
   * DB Column: `id` — BIGINT UNSIGNED, Primary Key, Auto Increment.
   * Khóa chính định danh duy nhất mỗi bản dịch.
   */
  @Column({ type: DataType.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true })
  declare id: string;

  /**
   * DB Column: `comment_id` — BIGINT UNSIGNED, NOT NULL, Foreign Key → comments.id
   *
   * Xác định bình luận gốc mà bản dịch này thuộc về.
   * ĐỌC: CommentsService.translate() → WHERE comment_id = commentId
   * ĐỌC: CommentsService.getCommentsByPost() → include translations để kèm bản dịch vào response
   * GHI: CommentsService.create() không tạo translation ngay, chỉ tạo khi user yêu cầu dịch
   */
  @ForeignKey(() => Comment)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false })
  declare comment_id: string;

  /**
   * DB Column: `language_id` — INT UNSIGNED, NOT NULL, Foreign Key → languages.id
   *
   * Xác định ngôn ngữ của bản dịch này (vd: id=1 → 'vi', id=2 → 'en', id=3 → 'zh').
   * Cặp (comment_id + language_id) thường là duy nhất trong thực tế (mỗi bình luận
   * chỉ có một bản dịch cho mỗi ngôn ngữ).
   * ĐỌC: CommentsService.translate() → tìm bản dịch theo language_id
   * ĐỌC: CommentsService.getCommentsByPost() → include Language để lấy language.code ('vi', 'en')
   */
  @ForeignKey(() => Language)
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false })
  declare language_id: number;

  /**
   * DB Column: `content` — TEXT, NOT NULL
   *
   * Nội dung bình luận đã được dịch sang ngôn ngữ tương ứng với language_id.
   * Ban đầu khi tạo record mới, content được copy từ comment.content gốc (chưa dịch).
   * Sau khi API dịch thuật trả về → content được cập nhật bằng bản dịch thực sự.
   * Lưu ý: Content chỉ là plain text (không phải HTML), vì bình luận không hỗ trợ rich text.
   *
   * GHI (lần đầu): INSERT với content = comment.content gốc (placeholder), status = 'queued'
   * GHI (sau dịch): UPDATE SET content = translatedText, translation_status = 'completed'
   * GHI (khi sửa bình luận gốc): Không thay đổi content ngay, chỉ reset status = 'queued'
   *                               để lần sau dịch lại sẽ ghi đè content mới
   */
  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string;

  /**
   * DB Column: `translation_status` — ENUM, NOT NULL, DEFAULT 'not_started'
   *
   * Trạng thái hiện tại của tiến trình dịch thuật bản dịch này.
   * Xem type TranslationStatus ở trên để biết ý nghĩa từng giá trị.
   *
   * Flow trạng thái điển hình:
   *   not_started → queued → processing → completed
   *                                     → failed → queued (thử lại) → processing → completed
   *
   * ĐỌC: CommentsService.translate() kiểm tra status để quyết định có gọi API dịch không
   * GHI: CommentsService.translate() → cập nhật qua từng bước: 'processing' → 'completed'/'failed'
   * GHI: CommentsService.update() → reset toàn bộ về 'queued' khi nội dung gốc thay đổi
   */
  @Column({
    type: DataType.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'not_started'
  })
  declare translation_status: TranslationStatus;

  /**
   * DB Column: `created_at` — DATETIME, NOT NULL, DEFAULT NOW()
   * Thời điểm bản ghi translation này được tạo lần đầu (tức lần đầu user yêu cầu dịch bình luận).
   */
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare created_at: Date;

  /**
   * DB Column: `updated_at` — DATETIME, NOT NULL, DEFAULT NOW()
   * Thời điểm bản ghi được cập nhật lần cuối (khi translation_status hoặc content thay đổi).
   */
  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare updated_at: Date;

  /**
   * Association: N-1 với bảng `comments`
   * Cho phép eager load bình luận gốc khi cần: include: [{ model: Comment }]
   * SQL tương đương: JOIN comments ON comment_translations.comment_id = comments.id
   */
  @BelongsTo(() => Comment)
  declare comment: Comment;

  /**
   * Association: N-1 với bảng `languages`
   * Cho phép eager load thông tin ngôn ngữ (code, name) khi trả về cho client.
   * SQL tương đương: JOIN languages ON comment_translations.language_id = languages.id
   * Dùng trong: CommentsService.getCommentsByPost() → include Language để lấy language.code
   */
  @BelongsTo(() => Language)
  declare language: Language;
}
