import { Category } from '../../categories/models/category.model';
import { User } from '../../users/models/user.model';

export type PostStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';

export type TranslationStatus =
  | 'not_started'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export interface TranslationMatrixItem {
  id?: string;
  postId?: string;
  languageId: number;
  title?: string | null;
  slug?: string | null;
  content?: string | null;
  status: TranslationStatus;
  provider: string | null;
  updatedAt?: string;
}

export interface TranslationPreview {
  title: string;
  content: string;
  provider: string;
}

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

export interface AuthorPost {
  id: string;
  authorId: string;
  categoryId: number | null;
  originalLanguageId: number;
  status: PostStatus;
  reviewNote: string | null;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  translations: PostTranslation[];
  translationMatrix: TranslationMatrixItem[];
}

export interface PublicPost extends AuthorPost {
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
  };
  likeCount: number;
  commentCount: number;
}

export interface CreatePostPayload {
  title: string;
  categoryId?: number;
  originalLanguageId: number;
  targetLanguageIds?: number[];
  content: string;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;

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
}

export interface FeedPostTranslation {
  id: number;
  languageCode: string;
  title: string;
  contentHtml: string;
  source: 'original' | 'human' | 'machine';
}

export interface Post {
  id: number;
  authorId: number;
  categoryId: number | null;
  originalLanguage: string;
  coverImageUrl?: string | null;
  status: 'draft' | 'published';
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  isLiking?: boolean;
  author: User;
  category?: Category | null;
  translations: FeedPostTranslation[];
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

/** Select the requested display translation, then fall back to the original language. */
export function getPostTranslation(post: Post, lang: string): FeedPostTranslation | undefined {
  return (
    post.translations?.find(translation => translation.languageCode === lang)
    ?? post.translations?.find(translation => translation.languageCode === post.originalLanguage)
    ?? post.translations?.[0]
  );
}
