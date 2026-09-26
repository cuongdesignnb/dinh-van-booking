import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ContentService, type ContentView } from './content.service';
import {
  CreateContentDto,
  ListContentQuery,
  SetStatusDto,
  RestoreContentDto,
  UpdateContentDto,
} from './dto/content.dto';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser, Paginated } from '../common/types';

@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.contentRead)
  list(@Query() query: ListContentQuery): Promise<Paginated<ContentView>> {
    return this.content.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.contentRead)
  getOne(@Param('id') id: string): Promise<ContentView> {
    return this.content.getOne(id);
  }

  @Get(':id/revisions')
  @RequirePermissions(PERMISSIONS.contentRead)
  revisions(@Param('id') id: string) {
    return this.content.revisions(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.contentWrite)
  create(@Body() dto: CreateContentDto, @CurrentUser() user: AuthenticatedUser): Promise<ContentView> {
    return this.content.create(dto, user.id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.contentWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentView> {
    return this.content.update(id, dto, user.id);
  }

  /** Publishing is a separate permission from editing. */
  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.contentPublish)
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentView> {
    return this.content.setStatus(id, dto.status, dto.publishAt ?? null, dto.expectedVersion, user.id);
  }

  @Post(':id/revisions/:revisionId/restore')
  @RequirePermissions(PERMISSIONS.contentWrite)
  restore(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Body() dto: RestoreContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ContentView> {
    return this.content.restoreRevision(id, revisionId, dto.expectedVersion, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.contentWrite)
  remove(
    @Param('id') id: string,
    @Query('expectedVersion', ParseIntPipe) expectedVersion: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.content.remove(id, expectedVersion, user.id);
  }
}
