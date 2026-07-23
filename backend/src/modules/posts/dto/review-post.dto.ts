import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ApprovePostDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  targetLanguageIds?: number[];
}

export class RejectPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reviewNote!: string;
}
