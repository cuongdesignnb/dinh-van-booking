import { Allow, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSettingDto {
  // The shape is merged against the registry default; class-validator only has
  // to let the property through the whitelist.
  @Allow()
  value!: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number;
}

export class ListSettingsQuery {
  @IsOptional()
  @IsString()
  group?: string;
}
