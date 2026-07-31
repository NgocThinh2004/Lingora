import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class AutosaveAuthorPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsInt()
  @Min(1)
  originalLanguageId!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetLanguageIds?: number[];

  @IsOptional()
  @IsString()
  content?: string;
}
