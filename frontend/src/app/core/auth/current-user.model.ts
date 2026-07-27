export type UserRole = 'admin' | 'member';

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  role?: UserRole;
}
