export interface AdminLanguage {
  id: string;
  code: string;
  name: string;
  nativeName?: string;
  flagCode?: string;
  isDefault: boolean;
  isActive: boolean;
}
