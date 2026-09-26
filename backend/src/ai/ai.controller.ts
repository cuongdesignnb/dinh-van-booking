import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { AiService } from './ai.service';
import { GenerateContentDto, SaveAiSettingsDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('settings')
  @RequirePermissions(PERMISSIONS.settingsRead)
  getSettings() {
    return this.ai.getSettings();
  }

  @Put('settings')
  @RequirePermissions(PERMISSIONS.settingsWrite)
  saveSettings(@Body() dto: SaveAiSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.saveSettings(dto, user.id);
  }

  @Post('generate')
  @RequirePermissions(PERMISSIONS.contentWrite)
  generate(@Body() dto: GenerateContentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ai.generate(dto, user);
  }
}
