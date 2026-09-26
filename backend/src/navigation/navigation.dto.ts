import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

export class NavigationItemInputDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsUUID()
  contentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  externalUrl?: string | null;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateNavigationMenuDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavigationItemInputDto)
  items!: NavigationItemInputDto[];
}
