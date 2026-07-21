export interface TranslationCoverage {
  translatedPosts: number;
  totalPosts: number;
  percent: number;
  available: boolean;
}

export interface AdminLanguage {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  flagCode: string | null;
  isDefault: boolean;
  isActive: boolean;
  translationCoverage: TranslationCoverage;
}

export interface CreateAdminLanguageRequest {
  code: string;
  name: string;
  nativeName: string;
  flagCode?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateAdminLanguageRequest {
  name?: string;
  nativeName?: string;
  flagCode?: string;
  isDefault?: boolean;
  isActive?: boolean;
}
