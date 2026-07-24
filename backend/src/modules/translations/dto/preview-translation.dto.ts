import { IsInt, IsString, Min } from 'class-validator';

export class PreviewTranslationDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsInt()
  @Min(1)
  sourceLanguageId!: number;

  @IsInt()
  @Min(1)
  targetLanguageId!: number;
}
