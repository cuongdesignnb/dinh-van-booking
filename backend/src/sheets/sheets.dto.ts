import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSheetWorkbookDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{20,120}$/) spreadsheetId!: string;
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) periodEndExclusive!: string;
}

export class CreateSheetBindingDto {
  @IsString() organizationId!: string;
  @IsString() propertyId!: string;
  @IsString() @Matches(/^\d{1,12}$/) sheetId!: string;
  @IsString() @MinLength(1) @MaxLength(100) sheetTitle!: string;
  @IsString() @Matches(/^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/i) outputRange!: string;
  @IsString() @Matches(/^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/i) inputRange!: string;
  @IsString() @Matches(/^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+$/i) resultRange!: string;
}

export class PrepareSheetDraftDto {
  @IsString() roomTypeId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) toExclusive!: string;
}

export class SheetSyncDto {
  @IsIn(['import', 'export']) direction!: 'import' | 'export';
}
