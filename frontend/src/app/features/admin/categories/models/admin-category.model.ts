export interface AdminCategory {
  id: string;
  slug: string;
  isActive: boolean;
  order: number;
  translations: CategoryTranslation[];
  postCount?: number;
}

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  languageId: string;
  name: string;
  description?: string;
}
