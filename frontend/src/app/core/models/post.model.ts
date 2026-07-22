import { User } from './user.model';
import { Category } from './category.model';

export interface PostTranslation {
  id: number;
  languageCode: string;
  title: string;
  contentHtml: string;
  source: 'original' | 'human' | 'machine';
}

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: number;
  authorId: number;
  categoryId: number | null;
  originalLanguage: string;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  status: PostStatus;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  author: User;
  category?: Category | null;
  translations: PostTranslation[];
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Lấy bản dịch phù hợp nhất cho ngôn ngữ hiển thị hiện tại, fallback về ngôn ngữ gốc. */
export function getPostTranslation(post: Post, lang: string): PostTranslation | undefined {
  return (
    post.translations?.find((t) => t.languageCode === lang) ??
    post.translations?.find((t) => t.languageCode === post.originalLanguage) ??
    post.translations?.[0]
  );
}
