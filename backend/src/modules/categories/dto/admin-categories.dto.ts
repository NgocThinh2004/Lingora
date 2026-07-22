import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const normalizeSlug = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export class AdminCategoriesQueryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  search = '';

  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status: 'all' | 'active' | 'inactive' = 'all';

  @IsOptional()
  @IsIn(['all', 'with-posts', 'without-posts'])
  postFilter: 'all' | 'with-posts' | 'without-posts' = 'all';

  @IsOptional()
  @IsIn(['newest', 'oldest', 'name', 'posts'])
  sort: 'newest' | 'oldest' | 'name' | 'posts' = 'newest';

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

export class CategoryTranslationInputDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  languageId!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @Transform(normalizeSlug)
  @IsString()
  @Matches(slugPattern)
  @MaxLength(150)
  slug?: string;
}

export class CreateAdminCategoryDto {
  @IsOptional()
  @Transform(normalizeSlug)
  @IsString()
  @Matches(slugPattern)
  @MaxLength(150)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique(item => item.languageId)
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationInputDto)
  translations!: CategoryTranslationInputDto[];
}

export class UpdateAdminCategoryDto {
  @IsOptional()
  @Transform(normalizeSlug)
  @IsString()
  @Matches(slugPattern)
  @MaxLength(150)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique(item => item.languageId)
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationInputDto)
  translations?: CategoryTranslationInputDto[];
}
