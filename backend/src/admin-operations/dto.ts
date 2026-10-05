import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min, MinLength, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested,
} from 'class-validator';

export class ListAdminQuery {
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsUUID() propertyId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class CreateQuoteDto {
  @IsUUID() roomTypeId!: string;
  @IsDateString() checkIn!: string;
  @IsDateString() checkOut!: string;
  @IsInt() @Min(1) @Max(20) quantity!: number;
  @IsOptional() @IsInt() @Min(1) @Max(30) adults?: number;
  @IsOptional() @IsInt() @Min(0) @Max(30) children?: number;
  @IsOptional() @IsUUID() ratePlanId?: string;
  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;
}

export class CreateBookingFromQuoteDto {
  @IsUUID() quoteId!: string;
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsString() @MinLength(8) @MaxLength(40) phone!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class HoldQuoteDto {
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsString() @MinLength(8) @MaxLength(40) phone!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class UpdateBookingStatusDto {
  @IsString() @IsIn(['pending_confirmation', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show']) status!: string;
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateBookingNoteDto {
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
}

export class ListInventoryQuery {
  @IsUUID() roomTypeId!: string;
  @IsDateString() from!: string;
  @IsDateString() to!: string;
}
export class InventoryMatrixQuery {
  @IsUUID() propertyId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string;
}
export class SetAvailableDto {
  @IsUUID() roomTypeId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) stayDate!: string;
  @IsInt() @Min(0) @Max(5000) available!: number;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsBoolean() reopen?: boolean;
}
export class BulkAvailableDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(90) @ValidateNested({ each: true }) @Type(() => SetAvailableDto) changes!: SetAvailableDto[];
}

export class UpdateInventoryDto {
  @IsDateString() from!: string;
  @IsDateString() to!: string;
  @IsInt() @Min(0) @Max(5000) capacity!: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) blockedCount?: number;
  @IsOptional() @IsBoolean() stopSell?: boolean;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsObject() expectedVersions!: Record<string, number>;
}

export class UpdateCustomerDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) fullName?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(40) phone?: string | null;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string | null;
  @IsOptional() @IsString() @MaxLength(120) city?: string | null;
  @IsOptional() @IsString() @MaxLength(40) groupKind?: string;
  @IsOptional() @IsString() @MaxLength(2000) need?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) note?: string | null;
}

export class CreateInteractionDto {
  @IsOptional() @IsUUID() inquiryId?: string;
  @IsString() @IsIn(['phone', 'email', 'zalo', 'in_person', 'internal']) channel!: string;
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
}

export class CreateFollowUpDto {
  @IsOptional() @IsUUID() inquiryId?: string;
  @IsDateString() dueAt!: string;
  @IsString() @MinLength(2) @MaxLength(500) purpose!: string;
}

export class UpdateFollowUpDto {
  @IsString() @IsIn(['open', 'completed', 'cancelled']) status!: string;
}

export class CreateCouponDto {
  @IsString() @MinLength(2) @MaxLength(40) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @IsIn(['percent', 'fixed']) discountType!: string;
  @IsOptional() @IsInt() @Min(1) @Max(10000) percentBps?: number;
  @IsOptional() @Matches(/^\d{1,15}$/) amountVnd?: string;
  @IsOptional() @Matches(/^\d{1,15}$/) maxDiscountVnd?: string;
  @IsOptional() @Matches(/^\d{1,15}$/) minSubtotalVnd?: string;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsInt() @Min(1) perCustomerLimit?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateCouponDto extends CreateCouponDto {
  @IsInt() @Min(1) expectedVersion!: number;
}

export class CreateManualPaymentDto {
  @IsUUID() bookingId!: string;
  @Matches(/^[1-9]\d{0,14}$/) amountVnd!: string;
  @IsString() @IsIn(['cash', 'bank_transfer', 'offline_pos', 'other']) method!: string;
  @IsOptional() @IsString() @MaxLength(160) externalReference?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class CreateRefundDto {
  @IsUUID() paymentId!: string;
  @Matches(/^[1-9]\d{0,14}$/) amountVnd!: string;
  @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}

export class UpdateRefundDto {
  @IsString() @IsIn(['approved', 'settled', 'rejected']) status!: string;
  @IsOptional() @IsString() @MaxLength(160) externalReference?: string;
}

export class ReportQuery {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() propertyId?: string;
  @IsOptional() @IsUUID() roomTypeId?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
}
