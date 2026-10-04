import { Type } from 'class-transformer';
import { Allow, ArrayMaxSize, ArrayUnique, Equals, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateManualPartnerOrganizationDto {
  @IsUUID() userId!: string;
  @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsIn(['property_owner', 'agency']) organizationType!: string;
  @IsString() @MinLength(2) @MaxLength(120) contactName!: string;
  @IsString() @Matches(/^[+\d][\d ()-]{7,24}$/) phone!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsIn(['owner', 'manager']) membershipRole!: string;
  @Equals(true) manuallyVerified!: boolean;
}

export class CreateManualPartnerGrantDto {
  @IsUUID() userId!: string;
  @IsUUID() organizationId!: string;
  @IsUUID() propertyId!: string;
  @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID(undefined, { each: true }) roomTypeScope!: string[];
  @IsOptional() @IsBoolean() canReadInventory?: boolean;
  @IsOptional() @IsBoolean() canWriteInventory?: boolean;
  @IsOptional() @IsBoolean() canEditRates?: boolean;
  @IsOptional() @IsBoolean() canEditProfile?: boolean;
  @IsOptional() @IsBoolean() canUploadMedia?: boolean;
  @IsOptional() @IsDateString() expiresAt?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RegisterPartnerDto {
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsString() @MinLength(2) @MaxLength(180) organizationName!: string;
  @IsString() @Matches(/^[+\d][\d ()-]{7,24}$/) phone!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
  @IsOptional() @IsIn(['property_owner', 'agency']) organizationType?: string;
}

export class ResubmitPartnerApplicationDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsString() @MinLength(2) @MaxLength(120) fullName!: string;
  @IsString() @MinLength(2) @MaxLength(180) organizationName!: string;
  @IsString() @Matches(/^[+\d][\d ()-]{7,24}$/) phone!: string;
  @IsOptional() @IsString() @MaxLength(240) address?: string;
}

export class CreatePartnerPropertyDto {
  @IsString() organizationId!: string;
  @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @IsIn(['homestay', 'hotel', 'resort', 'villa', 'guesthouse', 'bungalow']) kind!: string;
  @IsString() @MinLength(2) @MaxLength(160) area!: string;
  @IsString() @MinLength(5) @MaxLength(300) address!: string;
  @IsOptional() @IsString() @MaxLength(500) excerpt?: string;
  @IsOptional() @Allow() descriptionDocument?: unknown;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true }) mediaIds?: string[];
}

export class CreatePartnerRoomTypeDto {
  @IsString() organizationId!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(24) code?: string;
  @IsOptional() @IsString() @MaxLength(3000) description?: string;
  @IsOptional() @IsString() @MaxLength(300) bedSummary?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) bedroomCount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) bathroomCount?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) areaSqm?: number;
}

export class CreatePropertyClaimDto {
  @IsString() propertyId!: string;
  @IsString() organizationId!: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class SubmitPartnerRevisionDto {
  @IsString() organizationId!: string;
  @IsString() propertyId!: string;
  @IsOptional() @IsString() roomTypeId?: string;
  @IsOptional() @IsString() ratePlanId?: string;
  @IsInt() @Min(1) baseVersion!: number;
  @IsOptional() @IsInt() @Min(1) contentBaseVersion?: number;
  @Allow() proposed!: unknown;
}

export class PartnerInventoryQuery {
  @IsString() organizationId!: string;
  @IsString() propertyId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) toExclusive!: string;
}

export class QuickSetPartnerInventoryDto {
  @IsString() organizationId!: string;
  @IsString() roomTypeId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) stayDate!: string;
  @IsInt() @Min(0) @Max(5000) available!: number;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsBoolean() reopen?: boolean;
}

export class PartnerInventoryChangeDto {
  @IsUUID() roomTypeId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) stayDate!: string;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) externalSoldCount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) maintenanceCount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(5000) ownerWithheldCount?: number;
  @IsOptional() @IsBoolean() stopSell?: boolean;
}

export class BulkPartnerInventoryDto {
  @IsString() organizationId!: string;
  @IsArray() @ArrayMaxSize(250) @ValidateNested({ each: true }) @Type(() => PartnerInventoryChangeDto)
  changes!: PartnerInventoryChangeDto[];
}

export class ConfirmPartnerInventoryDto {
  @IsString() organizationId!: string;
  @IsString() roomTypeId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) toExclusive!: string;
  @Allow() expectedVersions!: Record<string, number>;
}

export class ReviewPartnerApplicationDto {
  @IsIn(['approve', 'request_info', 'reject']) action!: string;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ReviewPropertyClaimDto {
  @IsIn(['approve', 'reject']) action!: string;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsBoolean() canReadInventory?: boolean;
  @IsOptional() @IsBoolean() canWriteInventory?: boolean;
  @IsOptional() @IsBoolean() canEditRates?: boolean;
  @IsOptional() @IsBoolean() canEditProfile?: boolean;
  @IsOptional() @IsBoolean() canUploadMedia?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) roomTypeScope?: string[];
  @IsOptional() @IsString() @MaxLength(120) expiresAt?: string;
}

export class UpdatePartnerGrantDto {
  @IsOptional() @IsIn(['revoke', 'restore']) action?: 'revoke' | 'restore';
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsBoolean() canReadInventory?: boolean;
  @IsOptional() @IsBoolean() canWriteInventory?: boolean;
  @IsOptional() @IsBoolean() canEditRates?: boolean;
  @IsOptional() @IsBoolean() canEditProfile?: boolean;
  @IsOptional() @IsBoolean() canUploadMedia?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) roomTypeScope?: string[];
  @IsOptional() @IsString() @MaxLength(120) expiresAt?: string;
}

export class UpdatePartnerOrganizationDto {
  @IsIn(['suspend', 'restore']) action!: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class AddPartnerMembershipDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['owner', 'manager', 'viewer']) role!: string;
}

export class AddPartnerStaffDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['manager', 'viewer']) role!: 'manager' | 'viewer';
}

export class UpdatePartnerStaffDto {
  @IsIn(['revoke', 'restore']) action!: 'revoke' | 'restore';
  @IsInt() @Min(1) expectedVersion!: number;
}

export class UpdatePartnerMembershipDto {
  @IsIn(['revoke', 'restore']) action!: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class ReviewPartnerRevisionDto {
  @IsIn(['approve', 'request_changes', 'reject']) action!: string;
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class MarkNotificationReadDto {
  @IsOptional() @IsBoolean() read?: boolean;
}

export class PartnerProfilePatchDto {
  @Allow() expectedVersion!: number;
  @Allow() patch!: unknown;
}
