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
  languageId: number;
  status: TranslationStatus;
  provider: string | null;
}

export interface PostTranslation {
  id: number;
  languageId: number;
  title: string | null;
  slug: string | null;
  summary: string | null;
  content: string | null;
  translationStatus: TranslationStatus;
  translationProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorPost {
  id: number;
  authorId: number;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiCollectionResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface CreatePostPayload {
  title: string;
  summary?: string;
  categoryId?: number;
  originalLanguageId: number;
  targetLanguageIds?: number[];
  content: string;
}

export type UpdatePostPayload = Partial<CreatePostPayload>;

export interface PostListParams {
  status?: PostStatus | 'all';
  search?: string;
  authorId?: string;
  categoryId?: number;
  originalLanguageId?: number;
  trash?: boolean;
  page?: number;
  limit?: number;
}
