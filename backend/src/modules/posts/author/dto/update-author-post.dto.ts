
import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateAuthorPostDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  originalLanguageId?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetLanguageIds?: number[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;
}
