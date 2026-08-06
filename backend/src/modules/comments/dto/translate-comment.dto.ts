/**
 * TranslateCommentDto - Xác thực dữ liệu khi dịch bình luận sang ngôn ngữ khác.
 *
 * Được sử dụng bởi endpoint: POST /posts/:postId/comments/:commentId/translate
 * Chứa duy nhất trường `languageCode` (mã ngôn ngữ đích, ví dụ: 'vi', 'en', 'ja').
 *
 * Lý do tách riêng thay vì dùng @Body('languageCode'):
 * - class-validator kiểm tra đúng format locale (regex).
 * - Swagger tự động sinh tài liệu API.
 * - Ngăn chặn client gửi chuỗi rác hoặc quá dài gây lỗi dịch thuật.
 */
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class TranslateCommentDto {
  /**
   * Mã ngôn ngữ đích muốn dịch sang (ISO 639 format).
   * - Ví dụ hợp lệ: 'vi', 'en', 'ja', 'en-US'.
   * - Regex đảm bảo đúng định dạng locale chuẩn.
   * - MaxLength(10) chặn chuỗi quá dài tấn công.
   */
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z]{2,3}(?:-[a-z0-9]{2,6})?$/)
  @MaxLength(10)
  languageCode!: string;
}
