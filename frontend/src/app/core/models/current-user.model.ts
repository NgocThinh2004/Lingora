export type UserRole = 'admin' | 'member';

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role?: UserRole;
}
