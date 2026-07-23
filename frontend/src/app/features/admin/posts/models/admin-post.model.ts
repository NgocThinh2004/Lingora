export type AdminPostStatus = 'pending' | 'approved' | 'rejected';
export type TranslationStatus = 'not_started' | 'queued' | 'processing' | 'completed' | 'failed';

export interface AdminPostLanguage {
  languageId: number;
  code: string;
  name: string;
  nativeName: string;
  flagCode: string | null;
}

export interface AdminPostTranslation extends AdminPostLanguage {
  id: string;
  status: TranslationStatus;
  isOriginal: boolean;
}

export interface AdminPost {
  id: string;
  title: string;
  content?: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
  category: { id: number; name: string; status: string } | null;
  submittedAt: string;
  originalLanguage: AdminPostLanguage | null;
  translations: AdminPostTranslation[];
  status: AdminPostStatus;
  workflowStatus: string;
  reviewNote?: string | null;
}

export interface AdminPostsQuery {
  search: string;
  status: AdminPostStatus | 'all';
  categoryId?: number;
  language: string;
  page: number;
  limit: number;
}

export interface ReviewAdminPostRequest {
  decision: 'approve' | 'reject';
  note?: string;
}
