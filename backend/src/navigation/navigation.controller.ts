import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { UpdateNavigationMenuDto } from './navigation.dto';
import { NavigationService } from './navigation.service';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigation: NavigationService) {}

  @Get('primary')
  @RequirePermissions(PERMISSIONS.contentRead)
  getPrimary() {
    return this.navigation.adminPrimaryMenu();
  }

  @Put('primary')
  @RequirePermissions(PERMISSIONS.contentWrite)
  updatePrimary(@Body() dto: UpdateNavigationMenuDto, @CurrentUser() user: AuthenticatedUser) {
    return this.navigation.updatePrimaryMenu(dto.items, user);
  }

  @Delete('primary')
  @RequirePermissions(PERMISSIONS.contentWrite)
  resetPrimaryMenu(@CurrentUser() user: AuthenticatedUser) {
    return this.navigation.resetPrimaryMenu(user);
  }
}
