import { Category } from '../../categories/models/category.model';
import { User } from '../../users/models/user.model';

/** Trạng thái duyệt của bài viết (DB: tương ứng cột status trong bảng posts) */
export type PostStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';

/** Trạng thái tiến trình dịch của một ngôn ngữ (DB: cột status trong bảng post_translations) */
export type TranslationStatus =
  | 'not_started'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

/** Thông tin về tiến độ/trạng thái dịch thuật cho một ngôn ngữ của bài viết (Hiển thị UI quản lý dịch thuật) */
export interface TranslationMatrixItem {
  id?: string;
  postId?: string;
  languageId: number;
  title?: string | null;
  slug?: string | null;
  content?: string | null;
  status: TranslationStatus;
  provider: string | null; // Provider thực hiện dịch: Google, DeepL, v.v...
  updatedAt?: string;
}

export interface TranslationPreview {
  title: string;
  content: string;
  provider: string;
}

/** Thông tin chi tiết của một bản dịch (DB: đại diện một dòng trong bảng post_translations) */
export interface PostTranslation {
  id: string;
  languageId: number;
  title: string | null;
  slug: string | null;
  content: string | null;
  translationStatus: TranslationStatus;
  translationProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Interface đầy đủ cho một bài viết dành cho trang quản lý tác giả (Studio/Dashboard) */
export interface AuthorPost {
  id: string;
  authorId: string;
  categoryId: number | null;
  originalLanguageId: number;
  status: PostStatus;
  reviewNote: string | null;
  viewCount: number; // DB: Số lượt xem được Backend tích luỹ/cập nhật từ bảng `post_views` để tránh đếm trùng từ 1 IP/User
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  translations: PostTranslation[];
  translationMatrix: TranslationMatrixItem[];
}

/** Kế thừa từ AuthorPost, bổ sung thêm thông tin author, likes, comments cho hiển thị công khai ở Feed (public facing) */
export interface PublicPost extends AuthorPost {
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  likeCount: number; // DB: Tổng số lượt thích, được Backend đếm (COUNT) từ bảng trung gian `post_likes`
  commentCount: number; // DB: Tổng bình luận, được Backend đếm từ bảng `comments` với điều kiện post_id trùng khớp
}

export interface CreatePostPayload {
  title: string;
  categoryId?: number;
  originalLanguageId: number;
  targetLanguageIds?: number[];
  content: string;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;

/** Các tham số truyền lên server để lọc và tìm kiếm bài viết ở trang quản lý */
export interface PostListParams {
  status?: PostStatus | 'all' | 'public';
  search?: string;
  authorId?: string;
  categoryId?: number;
  originalLanguageId?: number;
  updatedMonth?: string;
  trash?: boolean;
  page?: number;
  limit?: number;
}

export interface PostOptions {
  languages: Array<{ id: number; code: string; label: string; nativeLabel: string; flagCode: string | null }>;
  categories: Array<{ id: number; label: string }>;
  updatedMonths?: string[];
}

/** Nội dung bài viết cho Feed người dùng đọc thông thường */
export interface FeedPostTranslation {
  id: number;
  languageCode: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  source: 'original' | 'human' | 'machine';
}

/** 
 * Model Post chung sử dụng trên các feed, trang chủ (Front-end format).
 * Mapping chi tiết các trường từ API:
 * 
 * Post.id -> từ posts.id (BE)
 * Post.authorId -> từ posts.author_id
 * Post.categoryId -> từ posts.category_id
 * Post.originalLanguage -> ngôn ngữ gốc của bài
 * Post.viewCount -> từ posts.view_count (cached trong DB, không cần đếm lại)
 * Post.likeCount -> từ posts.like_count (cached)
 * Post.commentCount -> từ posts.comment_count (cached)
 * Post.liked -> từ API check post_likes WHERE post_id+user_id (true/false)
 * 
 * Post.translations[].title -> từ post_translations.title theo language_id
 * Post.translations[].contentHtml -> từ post_translations.content
 * Post.translations[].source -> 'original'|'machine'|'human' (dựa vào translation_provider)
 * 
 * Post.author.name -> từ users.display_name ?? users.username
 * Post.author.avatarUrl -> từ users.avatar
 * 
 * Post.category.slug -> từ categories.slug
 * Post.category.translations[].name -> từ category_translations.name
 */
export interface Post {
  id: number;
  authorId: number;
  categoryId: number | null;
  originalLanguage: string;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  status: 'draft' | 'published';
  viewCount: number; 
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  
  // Biến cờ (flag) state phía UI: dùng để khóa thao tác nút Like tạm thời trong lúc API chạy, 
  // giúp thực hiện "Optimistic update" và chặn người dùng bấm liên tiếp gây spam lỗi mạng.
  isLiking?: boolean; 
  
  author: User;
  category?: Category | null;
  translations: FeedPostTranslation[]; // Mảng chứa sẵn nội dung các thứ tiếng
  createdAt: string;
}

/** Định dạng trả về cơ bản cho tất cả các API phân trang */
export interface PaginatedResult<T> {
  items: T[]; // Mảng dữ liệu hiện tại
  meta: {
    page: number; // Trang hiện tại
    limit: number; // Kích thước một trang
    total: number; // Tổng số bản ghi trong DB
    totalPages: number; // Tổng số trang
  };
}

/** 
 * Hàm tiện ích (Utility function): Lấy bản dịch phù hợp nhất để hiển thị.
 * Cố gắng lấy theo ngôn ngữ yêu cầu (lang), nếu không có thì fallback (lùi) về ngôn ngữ gốc của bài,
 * hoặc cuối cùng nếu vẫn không có thì lấy phần tử dịch đầu tiên có sẵn trong mảng. 
 */
export function getPostTranslation(post: Post, lang: string): FeedPostTranslation | undefined {
  const availableTranslations = post.translations?.filter(translation =>
    Boolean(translation.title?.trim() || translation.contentHtml?.trim()),
  ) ?? [];
  return availableTranslations.find(translation => translation.languageCode === lang)
    ?? availableTranslations.find(translation => translation.languageCode === post.originalLanguage)
    ?? availableTranslations[0];
}
