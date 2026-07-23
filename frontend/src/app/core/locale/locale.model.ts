export interface PublicLanguage {
  code: string;
  name: string;
  nativeName: string;
  flagCode: string | null;
  isDefault: boolean;
}

export interface LocaleOption {
  code: string;
  label: string;
  flagUrl: string;
  isDefault: boolean;
}
