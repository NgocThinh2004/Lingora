import { IsString } from 'class-validator';

export class RetryTranslationDto {
  @IsString()
  postTranslationId!: string;
}
