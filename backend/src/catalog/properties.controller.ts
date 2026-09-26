import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { CreatePropertyDto, DeletePropertyQuery, UpdatePropertyDto } from './dto/property.dto';
import { PropertiesService, type PropertyView } from './properties.service';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.catalogRead)
  list(): Promise<{ items: PropertyView[] }> {
    return this.properties.list();
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
}
