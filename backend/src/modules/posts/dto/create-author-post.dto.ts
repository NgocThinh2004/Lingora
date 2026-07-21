import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateAuthorPostDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsInt()
  @Min(1)
  originalLanguageId!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetLanguageIds?: number[];

  @IsString()
  content!: string;
}
