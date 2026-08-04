export interface AdminCategoryTranslation {
  id: string;
  languageId: number;
  languageCode: string;
  languageName: string;
  languageNativeName: string;
  flagCode: string | null;
  name: string;
  slug: string;
}

export interface AdminCategory {
  id: number;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  postCount: number;
  isSystem: boolean;
  translations: AdminCategoryTranslation[];
}

export interface AdminCategoryPost {
  id: string;
  title: string;
  slug: string | null;
  authorName: string;
  status: string;
  publishedAt: string;
}

export interface CategoryTranslationRequest {
  languageId: number;
  name: string;
  slug?: string;
}

export interface CreateAdminCategoryRequest {
  slug?: string;
  isActive?: boolean;
  translations: CategoryTranslationRequest[];
}

export interface UpdateAdminCategoryRequest {
  slug?: string;
  isActive?: boolean;
  translations?: CategoryTranslationRequest[];
}

export type CategoryStatusFilter = 'all' | 'active' | 'inactive';
export type CategoryPostFilter = 'all' | 'with-posts' | 'without-posts';
export type CategorySort = 'newest' | 'oldest' | 'name' | 'posts';

export interface AdminCategoriesQuery {
  search: string;
  status: CategoryStatusFilter;
  postFilter: CategoryPostFilter;
  sort: CategorySort;
  page: number;
  limit: number;
}
