export interface Category {
  id: string; // usually UUID
  slug: string;
  isActive: boolean;
  order: number;
  translations?: CategoryTranslation[];
  // Transient property often used in UI
  name?: string; 
}

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  languageId: string;
  name: string;
  description?: string;
}
