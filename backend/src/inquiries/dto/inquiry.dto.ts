import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rooms?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsIn(['stay', 'combo', 'destination'])
  intent?: 'stay' | 'combo' | 'destination';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  relatedSlug?: string;

  @IsOptional()
  @IsUUID('4')
  roomTypeId?: string;
}

export class ListInquiriesQuery {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
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

export class UpdateInquiryDto {
  @IsString()
  @IsIn(['new', 'contacted', 'quoted', 'won', 'lost'])
  stage!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}
