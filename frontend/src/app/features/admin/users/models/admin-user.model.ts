export type AdminUserRole = 'admin' | 'member';
export type AdminUserStatus = 'active' | 'inactive' | 'banned';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: AdminUserRole | null;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersFilters {
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  page: number;
  limit: number;
}

export interface UpdateAdminUserRequest {
  displayName?: string;
  bio?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
}
