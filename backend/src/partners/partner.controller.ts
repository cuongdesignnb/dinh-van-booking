import { BadRequestException, Body, Controller, Get, Header, Headers, HttpCode, Param, Patch, Post, Put, Query, Req, Sse } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import { PublicCatalogService } from '../public/public-catalog.service';
import {
  BulkPartnerInventoryDto, ConfirmPartnerInventoryDto, CreatePartnerPropertyDto, CreatePartnerRoomTypeDto, CreatePropertyClaimDto, PartnerInventoryQuery,
  AddPartnerMembershipDto, AddPartnerStaffDto, QuickSetPartnerInventoryDto, RegisterPartnerDto, ResubmitPartnerApplicationDto, ReviewPartnerApplicationDto,
  ReviewPartnerRevisionDto, ReviewPropertyClaimDto, SubmitPartnerRevisionDto,
  UpdatePartnerGrantDto, UpdatePartnerMembershipDto, UpdatePartnerOrganizationDto, UpdatePartnerStaffDto,
  CreateManualPartnerGrantDto, CreateManualPartnerOrganizationDto,
} from './partner.dto';
import { PartnerService } from './partner.service';

@Controller('partners')
export class PartnerController {
  constructor(private readonly partners: PartnerService, private readonly catalog: PublicCatalogService) {}

  @Public()
  @Post('registrations')
  @HttpCode(202)
  register(@Body() dto: RegisterPartnerDto, @Req() request: FastifyRequest) {
    return this.partners.register(dto, { ip: request.ip });
  }

  @Get('context')
  context(@CurrentUser() user: AuthenticatedUser) { return this.partners.context(user); }

  @Get('availability')
  @Header('Cache-Control', 'private, no-store')
  async availability(@Query() query: Record<string, string>, @CurrentUser() user: AuthenticatedUser) {
    await this.partners.assertCanSearchAvailability(user);
    return this.catalog.availability(query);
  }

  @Sse('events')
  events(@CurrentUser() user: AuthenticatedUser) { return this.partners.inventoryEventStream(user); }

  @Get('members')
  members(@Query('organizationId') organizationId: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.organizationMembers(user, organizationId); }

  @Post('members')
  addMember(@Body() dto: AddPartnerStaffDto, @Query('organizationId') organizationId: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.addOrganizationMember(user, organizationId, dto); }

  @Patch('members/:userId')
  updateMember(@Param('userId') userId: string, @Query('organizationId') organizationId: string, @Body() dto: UpdatePartnerStaffDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.updateOrganizationMember(user, organizationId, userId, dto); }

  @Put('applications/:id/resubmit')
  resubmitApplication(@Param('id') id: string, @Body() dto: ResubmitPartnerApplicationDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.resubmitApplication(user, id, dto); }

  @Get('properties')
  properties(@CurrentUser() user: AuthenticatedUser) { return this.partners.properties(user); }

  @Post('properties')
  createProperty(@Body() dto: CreatePartnerPropertyDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.createPropertyDraft(user, dto); }

  @Post('properties/:propertyId/room-types')
  createRoomType(@Param('propertyId') propertyId: string, @Body() dto: CreatePartnerRoomTypeDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.createRoomTypeDraft(user, propertyId, dto); }

  @Get('profile-revisions')
  profileRevisions(@Query('organizationId') organizationId: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.myRevisions(user, organizationId); }

  @Get('media')
  mediaLibrary(@Query('organizationId') organizationId: string, @Query('page') page: string, @CurrentUser() user: AuthenticatedUser) {
    return this.partners.mediaLibrary(user, organizationId, Number(page) || 1);
  }

  @Post('media/upload')
  async uploadMedia(@Req() request: FastifyRequest, @CurrentUser() user: AuthenticatedUser) {
    if (!request.isMultipart()) throw new BadRequestException('Yêu cầu phải là multipart/form-data');
    const file = await request.file();
    if (!file) throw new BadRequestException('Không có ảnh tải lên.');
    const fields = file.fields as Record<string, { value?: string } | undefined>;
    const organizationId = fields.organizationId?.value ?? '';
    const propertyId = fields.propertyId?.value ?? '';
    const altText = fields.altText?.value ?? '';
    const caption = fields.caption?.value;
    if (![organizationId, propertyId].every((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) {
      throw new BadRequestException('Thiếu phạm vi cơ sở hợp lệ cho ảnh.');
    }
    return this.partners.uploadMedia(user, organizationId, propertyId, { buffer: await file.toBuffer(), filename: file.filename, mimetype: file.mimetype }, altText, caption);
  }

  @Post('property-access-claims')
  createClaim(@Body() dto: CreatePropertyClaimDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.createClaim(user, dto); }

  @Get('property-access-claims/candidates')
  claimCandidates(@Query('organizationId') organizationId: string, @Query('search') search: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.claimCandidates(user, organizationId, search); }

  @Get('inventory')
  inventory(@Query() query: PartnerInventoryQuery, @CurrentUser() user: AuthenticatedUser) { return this.partners.inventoryRows(user, query); }

  @Post('inventory/bulk/preview')
  previewInventory(@Body() dto: BulkPartnerInventoryDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.previewBulkInventory(user, dto); }

  @Put('inventory/bulk')
  bulkInventory(@Body() dto: BulkPartnerInventoryDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.bulkInventory(user, dto, key); }

  @Post('inventory/available')
  updateAvailable(@Body() dto: QuickSetPartnerInventoryDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.partners.quickSetInventory(user, dto, key);
  }

  @Post('inventory/confirm')
  confirmInventory(@Body() dto: ConfirmPartnerInventoryDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.partners.confirmInventory(user, dto, key);
  }

  @Post('profile-revisions')
  submitRevision(@Body() dto: SubmitPartnerRevisionDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.submitRevision(user, dto, key); }

  @Get('notifications')
  notifications(@CurrentUser() user: AuthenticatedUser) { return this.partners.notifications(user); }

  @Patch('notifications/:id/read')
  readNotification(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.partners.markNotificationRead(user, id); }
}

@Controller('admin')
export class AdminPartnerController {
  constructor(private readonly partners: PartnerService) {}

  @Get('partner-user-candidates')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  userCandidates(@Query('search') search?: string) { return this.partners.adminUserCandidates(search); }

  @Get('partner-property-candidates')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  propertyCandidates(@Query('search') search?: string) { return this.partners.adminPropertyCandidates(search); }

  @Post('partner-organizations/manual')
  @RequirePermissions(PERMISSIONS.partnerReview, PERMISSIONS.partnerGrant)
  createManualOrganization(@Body() dto: CreateManualPartnerOrganizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.partners.createManualOrganization(dto, user);
  }

  @Post('partner-grants')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  createManualGrant(@Body() dto: CreateManualPartnerGrantDto, @CurrentUser() user: AuthenticatedUser) {
    return this.partners.createManualGrant(dto, user);
  }

  @Get('partner-applications')
  @RequirePermissions(PERMISSIONS.partnerRead)
  applications(@Query('status') status?: string) { return this.partners.adminApplications(status ?? 'pending'); }

  @Get('partner-organizations')
  @RequirePermissions(PERMISSIONS.partnerRead)
  organizations(@Query('status') status?: string) { return this.partners.adminOrganizations(status ?? 'all'); }

  @Patch('partner-organizations/:id')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  updateOrganization(@Param('id') id: string, @Body() dto: UpdatePartnerOrganizationDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.updateOrganization(id, dto, user); }

  @Post('partner-organizations/:id/memberships')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  addMembership(@Param('id') id: string, @Body() dto: AddPartnerMembershipDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.addMembership(id, dto, user); }

  @Patch('partner-organizations/:id/memberships/:userId')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  updateMembership(@Param('id') id: string, @Param('userId') userId: string, @Body() dto: UpdatePartnerMembershipDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.updateMembership(id, userId, dto, user); }

  @Post('partner-applications/:id/review')
  @RequirePermissions(PERMISSIONS.partnerReview)
  reviewApplication(@Param('id') id: string, @Body() dto: ReviewPartnerApplicationDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.reviewApplication(id, dto, user); }

  @Get('property-access-claims')
  @RequirePermissions(PERMISSIONS.partnerRead)
  claims(@Query('status') status?: string) { return this.partners.adminClaims(status ?? 'pending'); }

  @Post('property-access-claims/:id/review')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  reviewClaim(@Param('id') id: string, @Body() dto: ReviewPropertyClaimDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.reviewClaim(id, dto, user); }

  @Get('partner-grants')
  @RequirePermissions(PERMISSIONS.partnerRead)
  grants(@Query('status') status?: string) { return this.partners.listGrants(status ?? 'all'); }

  @Patch('partner-grants/:id')
  @RequirePermissions(PERMISSIONS.partnerGrant)
  updateGrant(@Param('id') id: string, @Body() dto: UpdatePartnerGrantDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.updateGrant(id, dto, user); }

  @Get('partner-revisions')
  @RequirePermissions(PERMISSIONS.partnerRead)
  revisions(@Query('status') status?: string) { return this.partners.adminRevisions(status ?? 'pending'); }

  @Post('partner-revisions/:id/review')
  @RequirePermissions(PERMISSIONS.partnerReview)
  reviewRevision(@Param('id') id: string, @Body() dto: ReviewPartnerRevisionDto, @CurrentUser() user: AuthenticatedUser) { return this.partners.reviewRevision(id, dto, user); }
}
