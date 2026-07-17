export interface Language {
  id: string; // usually UUID
  code: string;
  name: string;
  nativeName?: string;
  isDefault: boolean;
  isActive: boolean;
}
