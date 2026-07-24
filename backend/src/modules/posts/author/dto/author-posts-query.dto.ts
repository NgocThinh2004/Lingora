
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { POST_STATUSES, PostStatus } from '../../posts.constants';

export class AuthorPostsQueryDto {
  @IsOptional()
  @IsIn(['all', ...POST_STATUSES])
  status?: PostStatus | 'all';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  trash?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  originalLanguageId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  updatedMonth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
