import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
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
  @MaxLength(80)
  role!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class DestinationDetailsDto {
  @IsString()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapX?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapY?: number | null;
}

export class ComboActivityDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeText?: string | null;
}

export class ComboDayDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dayNo!: number;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timeRange?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboActivityDto)
  activities!: ComboActivityDto[];
}

export class ComboDepartureDto {
  @IsISO8601()
  departureDate!: string;

  @IsISO8601()
  returnDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  adultPriceVnd!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  childPriceVnd?: number | null;

  @IsOptional()
  @IsIn(['open', 'closed', 'sold_out', 'cancelled'])
  status?: string;
}

export class ComboDetailsDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationNights!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  pricingUnit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  area?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  audienceTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  inclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  exclusions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  terms?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  destinationIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboDayDto)
  days?: ComboDayDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboDepartureDto)
  departures?: ComboDepartureDto[];
}

export class ArticleDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  authorName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readMinutes?: number | null;
}

export class ContentDetailsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DestinationDetailsDto)
  destination?: DestinationDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComboDetailsDto)
  combo?: ComboDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ArticleDetailsDto)
  article?: ArticleDetailsDto;
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

  /** Exactly the slug returned by Generate (preview); omitted = "Chưa tạo". */
  @IsOptional()
  @IsString()
  @MaxLength(120)
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

  @IsOptional()
  @ValidateNested()
  @Type(() => ContentDetailsDto)
  details?: ContentDetailsDto;
}

/**
 * Generic save. There is deliberately no `slug` field: with the global
 * `forbidNonWhitelisted` pipe a request that sends one is rejected (400).
 * Slugs change only through `POST /content/:id/slug/generate`.
 */
export class UpdateContentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

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

  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContentDetailsDto)
  details?: ContentDetailsDto;
}

export class SetStatusDto {
  @IsIn(PUBLICATION_STATUSES as unknown as string[])
  status!: string;

  @IsOptional()
  @IsISO8601()
  publishAt?: string | null;

  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class RestoreContentDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

/** Generate preview for the create form (no id yet). */
export class SlugPreviewForKindDto {
  @IsIn(CONTENT_KINDS as unknown as string[])
  kind!: string;

  @IsString()
  @MaxLength(300)
  source!: string;
}

/** Generate preview for an existing item. */
export class SlugPreviewDto {
  @IsString()
  @MaxLength(300)
  source!: string;
}

/** Generate apply: the only request that creates or changes a slug. */
export class GenerateSlugDto {
  @IsString()
  @MaxLength(300)
  source!: string;

  @IsInt()
  @Min(1)
  expectedVersion!: number;

  /** Required (true) when the item is published and already has a public URL. */
  @IsOptional()
  @IsBoolean()
  confirmPublicChange?: boolean;
}
