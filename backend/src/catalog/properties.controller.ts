import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { CreatePropertyDto, CreateRoomDto, DeletePropertyQuery, PropertyGenerateSlugDto, PropertySlugPreviewDto, UpdatePropertyDto, UpdateRoomDto } from './dto/property.dto';
import { PropertiesService, type PropertyView } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.catalogRead)
  list(): Promise<{ items: PropertyView[] }> {
    return this.properties.list();
  }

  /** Generate preview for the create form. Read-only. */
  @Post('slug/preview')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.catalogWrite)
  previewNewSlug(@Body() dto: PropertySlugPreviewDto) {
    return this.properties.previewSlug(null, dto.source);
  }

  @Post(':id/slug/preview')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.catalogWrite)
  previewSlug(@Param('id') id: string, @Body() dto: PropertySlugPreviewDto) {
    return this.properties.previewSlug(id, dto.source);
  }

  /** The only endpoint that creates or changes a stay URL. */
  @Post(':id/slug/generate')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.catalogWrite)
  generateSlug(@Param('id') id: string, @Body() dto: PropertyGenerateSlugDto, @CurrentUser() user: AuthenticatedUser) {
    return this.properties.generateSlug(id, dto, user.id);
  }

  @Get(':id/routes')
  @RequirePermissions(PERMISSIONS.catalogRead)
  routes(@Param('id') id: string) {
    return this.properties.routes(id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.catalogRead)
  getOne(@Param('id') id: string): Promise<PropertyView> {
    return this.properties.getOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.catalogWrite)
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: AuthenticatedUser): Promise<PropertyView> {
    return this.properties.create(dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.catalogWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PropertyView> {
    return this.properties.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(PERMISSIONS.catalogWrite)
  remove(
    @Param('id') id: string,
    @Query() query: DeletePropertyQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.properties.remove(id, query, user.id);
  }

  @Post(':id/rooms')
  @RequirePermissions(PERMISSIONS.catalogWrite)
  createRoom(@Param('id') id: string, @Body() dto: CreateRoomDto, @CurrentUser() user: AuthenticatedUser): Promise<PropertyView> {
    return this.properties.createRoom(id, dto, user.id);
  }

  @Patch(':id/rooms/:roomId')
  @RequirePermissions(PERMISSIONS.catalogWrite)
  updateRoom(@Param('id') id: string, @Param('roomId') roomId: string, @Body() dto: UpdateRoomDto, @CurrentUser() user: AuthenticatedUser): Promise<PropertyView> {
    return this.properties.updateRoom(id, roomId, dto, user.id);
  }
}
