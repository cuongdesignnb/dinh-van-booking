import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser, Paginated } from '../common/types';
import type { GuestSessionContext } from '../auth/auth.service';
import { CreateInquiryDto, ListInquiriesQuery, UpdateInquiryDto } from './dto/inquiry.dto';
import { InquiryService, type InquiryView } from './inquiry.service';

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiries: InquiryService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateInquiryDto, @Headers('idempotency-key') key: string, @Req() request: FastifyRequest): Promise<{ id: string; status: 'received'; createdAt: string }> {
    const scoped = request as FastifyRequest & { user?: AuthenticatedUser; guestSession?: GuestSessionContext | null };
    const principal = scoped.user ? `user:${scoped.user.id}` : scoped.guestSession ? `guest:${scoped.guestSession.id}` : null;
    if (!principal) throw new ForbiddenException('Cần phiên bảo mật trước khi gửi yêu cầu');
    return this.inquiries.createPublic(dto, key, principal);
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
