import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { SettingsService, type SettingView } from './settings.service';
import { ListSettingsQuery, UpdateSettingDto } from './dto/settings.dto';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { SETTING_GROUPS } from './settings.registry';
import type { AuthenticatedUser } from '../common/types';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** What the public website reads on every render. No secrets here. */
  @Public()
  @Get('public')
  publicSnapshot(): Promise<Record<string, unknown>> {
    return this.settings.publicSnapshot();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.settingsRead)
  async list(@Query() query: ListSettingsQuery): Promise<{ groups: string[]; items: SettingView[] }> {
    return { groups: SETTING_GROUPS, items: await this.settings.list(query.group) };
  }

  @Get(':key')
  @RequirePermissions(PERMISSIONS.settingsRead)
  async getOne(@Param('key') key: string): Promise<SettingView> {
    const [item] = (await this.settings.list()).filter((s) => s.key === key);
    return item;
  }

  @Put(':key')
  @RequirePermissions(PERMISSIONS.settingsWrite)
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SettingView> {
    return this.settings.update(key, dto.value, dto.expectedVersion, user.id);
  }

  @Delete(':key')
  @RequirePermissions(PERMISSIONS.settingsWrite)
  reset(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser): Promise<SettingView> {
    return this.settings.reset(key, user.id);
  }
}
