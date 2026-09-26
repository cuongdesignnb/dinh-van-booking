import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser, Paginated } from '../common/types';
import { CreateInquiryDto, ListInquiriesQuery, UpdateInquiryDto } from './dto/inquiry.dto';
import { InquiryService, type InquiryView } from './inquiry.service';

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiries: InquiryService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateInquiryDto): Promise<{ id: string; status: 'received'; createdAt: string }> {
    return this.inquiries.createPublic(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.crmRead)
  list(@Query() query: ListInquiriesQuery): Promise<Paginated<InquiryView>> {
    return this.inquiries.list(query);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.crmWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InquiryView> {
    return this.inquiries.updateStage(id, dto.stage, dto.expectedVersion, user.id);
  }
}
