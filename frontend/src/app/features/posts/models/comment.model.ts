import { User } from '../../users/models/user.model';

/**
 * Model đại diện cho một bình luận trong bài viết.
 * 
 * Mục đích: Sử dụng để parse dữ liệu bình luận từ API trả về cho phía Frontend hiển thị.
 * DB Mapping chi tiết:
 * 
 * Comment.id -> comments.id
 * Comment.post_id -> comments.post_id
 * Comment.user_id -> comments.user_id
 * Comment.parentId -> comments.parent_id (null = root)
 * Comment.replyToCommentId -> comments.reply_to_comment_id
 * Comment.replyToUsername -> comments.reply_to_username (thường cached, không JOIN trực tiếp mỗi lần)
 * Comment.content -> comments.content
 * Comment.likeCount -> comments.like_count (đếm từ comment_likes)
 * Comment.isLiked -> từ bảng comment_likes WHERE comment_id+user_id
 * Comment.replies -> mảng Comment con, được build từ comments WHERE parent_id = id
 * Comment.isLiking -> trạng thái loading FE khi đang gọi API like (không có trong DB)
 */
export interface Comment {
  id: string; // Khóa chính của bình luận
  post_id: string; // Khóa ngoại liên kết với bảng `posts` (xác định bình luận thuộc bài viết nào)
  user_id: string; // Khóa ngoại liên kết với bảng `users` (xác định người viết comment)
  
  // Dùng cho cấu trúc bình luận phân cấp (nested / thread):
  // parent_id lưu id của comment GỐC cao nhất trong nhánh (tree)
  parent_id: string | null; 
  // reply_to_comment_id lưu id của comment trực tiếp mà người này bấm "Trả lời"
  reply_to_comment_id: string | null;
  
  reply_to_user_id: string | null;
  reply_to_username: string | null;
  
  content: string; // Nội dung bình luận
  original_language_id: number | null; // Ngôn ngữ mà người dùng gõ
  status: string; // Trạng thái bình luận (ví dụ public, hidden)
  created_at: string;
  updated_at?: string;
  
  // THÔNG TIN MỞ RỘNG (thường được map thêm từ backend hoặc service để tiện hiển thị trên UI):
  author: User; // Object chứa thông tin người tạo comment (Avatar, tên...)
  replies?: Comment[]; // Mảng chứa các bình luận con (những comment có parent_id chỉ vào id của comment này)
  
  // DB: likeCount được đếm từ bảng `comment_likes`. liked là cờ cho biết user hiện tại đã like chưa (dựa vào session userId)
  likeCount?: number; 
  liked?: boolean; 
  
  // isLiking: Cờ (flag) trên UI để khóa nút Like (disabled) trong khi API đang chờ phản hồi,
  // phục vụ việc cập nhật giao diện ngay lập tức (optimistic update) và chống người dùng bấm like/unlike liên tục.
  isLiking?: boolean; 
  
  translations?: any[]; // Các bản dịch nếu người dùng chọn tính năng dịch comment sang tiếng mẹ đẻ
  originalLanguage?: { code: string };
  permissions?: {
    canEdit: boolean; // Có quyền sửa (nếu là chủ sở hữu hoặc admin)
    canDelete: boolean; // Có quyền xóa
  };
}
