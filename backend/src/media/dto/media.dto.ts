import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListMediaQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string | null;
}
