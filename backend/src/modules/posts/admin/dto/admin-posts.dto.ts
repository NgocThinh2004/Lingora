import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminPostsQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  search = '';

  @IsOptional()
  @IsIn(['all', 'pending', 'approved', 'rejected'])
  status: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  language?: string;

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
  limit = 8;
}

export class ReviewAdminPostDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  @ValidateIf(value => value.decision === 'reject')
  @IsNotEmpty({ message: 'A review note is required when rejecting a post' })
  note?: string;
}
