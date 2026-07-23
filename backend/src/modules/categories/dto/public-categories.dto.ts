import { IsOptional, IsString } from 'class-validator';

export class PublicCategoriesQueryDto {
  @IsOptional()
  @IsString()
  lang?: string;
}
