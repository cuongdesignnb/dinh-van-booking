import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CONTENT_KINDS, PUBLICATION_STATUSES } from '../content.service';

export class ContentMediaDto {
  @IsUUID()
  mediaId!: string;

  @IsString()
  @MaxLength(40)
  role!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class ListContentQuery {
  @IsOptional()
  @IsIn(CONTENT_KINDS as unknown as string[])
  kind?: string;

  @IsOptional()
  @IsIn(PUBLICATION_STATUSES as unknown as string[])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

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
}

export class CreateContentDto {
  @IsIn(CONTENT_KINDS as unknown as string[])
  kind!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  /** TipTap JSON; rebuilt against a whitelist server-side. */
  @Allow()
  body?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  @IsOptional()
  @IsUUID()
  ogMediaId?: string | null;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentMediaDto)
  media?: ContentMediaDto[];
}

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @Allow()
  body?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;

  @IsOptional()
  @IsBoolean()
  noindex?: boolean;

  @IsOptional()
  @IsUUID()
  ogMediaId?: string | null;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentMediaDto)
  media?: ContentMediaDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class SetStatusDto {
  @IsIn(PUBLICATION_STATUSES as unknown as string[])
  status!: string;

  @IsOptional()
  @IsISO8601()
  publishAt?: string | null;
}
