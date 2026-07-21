import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ADMIN_USER_ROLES = ['admin', 'member'] as const;
export const ADMIN_USER_STATUSES = ['active', 'inactive', 'banned'] as const;

export type AdminUserRole = typeof ADMIN_USER_ROLES[number];
export type AdminUserStatus = typeof ADMIN_USER_STATUSES[number];

export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(ADMIN_USER_ROLES)
  role?: AdminUserRole;

  @IsOptional()
  @IsIn(ADMIN_USER_STATUSES)
  status?: AdminUserStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(ADMIN_USER_ROLES)
  role?: AdminUserRole;

  @IsOptional()
  @IsIn(ADMIN_USER_STATUSES)
  status?: AdminUserStatus;
}
