import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { CreateSheetBindingDto, CreateSheetWorkbookDto, PrepareSheetDraftDto, SheetSyncDto } from './sheets.dto';
import { SheetsService } from './sheets.service';

@Controller('admin/sheets')
export class AdminSheetsController {
  constructor(private readonly sheets: SheetsService) {}

  @Get('workbooks')
  @RequirePermissions(PERMISSIONS.sheetsRead)
  list() { return this.sheets.listWorkbooks(); }

  @Post('workbooks')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  createWorkbook(@Body() dto: CreateSheetWorkbookDto, @CurrentUser() user: AuthenticatedUser) { return this.sheets.createWorkbook(dto, user); }

  @Post('workbooks/:id/bindings')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  createBinding(@Param('id') id: string, @Body() dto: CreateSheetBindingDto, @CurrentUser() user: AuthenticatedUser) { return this.sheets.createBinding(id, dto, user); }

  @Post('bindings/:id/draft-batches')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  prepareDraft(@Param('id') id: string, @Body() dto: PrepareSheetDraftDto, @CurrentUser() user: AuthenticatedUser) { return this.sheets.prepareDraft(id, dto, user); }

  @Post('draft-batches/:id/retry-projection')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  retryDraftProjection(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.sheets.retryDraftProjection(id, user); }

  @Post('workbooks/:id/sync')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  sync(@Param('id') id: string, @Body() dto: SheetSyncDto, @CurrentUser() user: AuthenticatedUser) { return this.sheets.syncNow(id, dto.direction, user); }

  @Patch('workbooks/:id/pause/:direction')
  @RequirePermissions(PERMISSIONS.sheetsManage)
  pause(@Param('id') id: string, @Param('direction') direction: 'import' | 'export', @Body() body: { paused: boolean }, @CurrentUser() user: AuthenticatedUser) {
    if (!['import', 'export'].includes(direction) || typeof body?.paused !== 'boolean') throw new BadRequestException('Chọn import/export và trạng thái pause hợp lệ.');
    return this.sheets.pause(id, direction, body.paused, user);
  }
}
