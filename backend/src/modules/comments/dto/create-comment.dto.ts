import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  content!: string;

  @IsOptional()
  @IsString()
  reply_to_comment_id?: string;

  @IsOptional()
  @IsString()
  languageCode?: string;
}
