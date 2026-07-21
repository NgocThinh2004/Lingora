import { ArrayUnique, IsArray, IsInt, IsString, Min } from 'class-validator';

export class QueueTranslationDto {
  @IsString()
  postId!: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetLanguageIds!: number[];
}
