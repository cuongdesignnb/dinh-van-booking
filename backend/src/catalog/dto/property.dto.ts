import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RoomGalleryDto {
  @IsUUID()
  roomTypeId!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  mediaIds!: string[];
}

export class CreatePropertyDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Mã nơi lưu trú chỉ gồm chữ, số, gạch ngang hoặc gạch dưới' })
  code!: string;

  @IsString()
  @MaxLength(60)
  kind!: string;

  @IsString()
  @MaxLength(160)
  area!: string;

  @IsString()
  @MaxLength(300)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** TipTap JSON for the formatted property description. */
  @IsOptional()
  @Allow()
  descriptionDocument?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsUUID()
  coverMediaId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  galleryMediaIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  roomGalleryMediaIds?: string[];

  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Mã loại phòng chỉ gồm chữ, số, gạch ngang hoặc gạch dưới' })
  roomCode!: string;

  @IsString()
  @MaxLength(160)
  roomName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roomDescription?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  maxAdults!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  maxChildren?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bedSummary?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  areaSqm?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  unitCount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  rateCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  rateName?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  rateVnd!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  weekendRateVnd?: number;

  @IsOptional()
  @IsBoolean()
  breakfastIncluded?: boolean;
}

export class UpdatePropertyDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  /** TipTap JSON for the formatted property description. */
  @IsOptional()
  @Allow()
  descriptionDocument?: unknown;

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
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsIn(['active', 'inactive', 'pending_verification'])
  operatingStatus?: string;

  /** null removes the cover; omitted keeps the current cover. */
  @IsOptional()
  @IsUUID()
  coverMediaId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  galleryMediaIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomGalleryDto)
  roomGalleries?: RoomGalleryDto[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedContentVersion!: number;
}

export class DeletePropertyQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}

export class CreateRoomDto {
  @IsString() @MaxLength(40) @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @IsString() @MaxLength(160)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(30)
  maxAdults!: number;

  @Type(() => Number) @IsInt() @Min(0) @Max(30)
  maxChildren!: number;

  @IsOptional() @IsString() @MaxLength(120)
  bedSummary?: string;

  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(1000)
  areaSqm?: number;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  unitCount!: number;

  @Type(() => Number) @IsInt() @Min(0)
  rateVnd!: number;

  @Type(() => Number) @IsOptional() @IsInt() @Min(0)
  weekendRateVnd?: number;

  @IsOptional() @IsBoolean()
  breakfastIncluded?: boolean;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsUUID('4', { each: true })
  galleryMediaIds?: string[];
}

export class UpdateRoomDto {
  @IsString() @MaxLength(160)
  name!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(30)
  maxAdults!: number;

  @Type(() => Number) @IsInt() @Min(0) @Max(30)
  maxChildren!: number;

  @IsOptional() @IsString() @MaxLength(120)
  bedSummary?: string;

  @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(1000)
  areaSqm?: number;

  @Type(() => Number) @IsInt() @Min(0)
  rateVnd!: number;

  @Type(() => Number) @IsOptional() @IsInt() @Min(0)
  weekendRateVnd?: number;

  @IsOptional() @IsBoolean()
  breakfastIncluded?: boolean;

  @IsIn(['active', 'inactive'])
  status!: string;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsUUID('4', { each: true })
  galleryMediaIds?: string[];

  @Type(() => Number) @IsInt() @Min(1)
  expectedVersion!: number;
}
