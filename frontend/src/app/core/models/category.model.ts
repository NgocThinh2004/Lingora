export interface CategoryTranslation {
  id: number;
  languageCode: string;
  name: string;
  description?: string;
}

export interface Category {
  id: number;
  slug: string;
  icon?: string;
  isActive: boolean;
  translations: CategoryTranslation[];
}

export function translateCategory(category: Category | undefined | null, lang: string): string {
  if (!category) return '';
  const t = category.translations?.find((tr) => tr.languageCode === lang);
  return t?.name ?? category.translations?.[0]?.name ?? category.slug;
}
