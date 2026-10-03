import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RequirePermissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import type { AuthenticatedUser } from '../common/types';
import {
  CreateBookingFromQuoteDto, CreateBookingNoteDto, CreateFollowUpDto, CreateInteractionDto,
  CreateManualPaymentDto, CreateQuoteDto, CreateRefundDto, HoldQuoteDto, ListAdminQuery,
  ListInventoryQuery, ReportQuery, UpdateBookingStatusDto, UpdateCouponDto, UpdateCustomerDto,
  UpdateFollowUpDto, UpdateInventoryDto, UpdateRefundDto, CreateCouponDto,
} from './dto';
import { AdminOperationsService, type QuoteOwner } from './admin-operations.service';
import { loadConfig } from '../common/config/env';
import type { GuestSessionContext } from '../auth/auth.service';

@Controller('admin')
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('dashboard/summary') @RequirePermissions(PERMISSIONS.dashboardRead)
  dashboardSummary() { return this.operations.dashboardSummary(); }

  @Get('dashboard/activity') @RequirePermissions(PERMISSIONS.dashboardRead)
  dashboardActivity() { return this.operations.dashboardActivity(); }

  @Get('bookings') @RequirePermissions(PERMISSIONS.bookingRead)
  bookings(@Query() query: ListAdminQuery) { return this.operations.listBookings(query); }

  @Get('bookings/:id') @RequirePermissions(PERMISSIONS.bookingRead)
  booking(@Param('id') id: string) { return this.operations.getBooking(id); }

  @Post('bookings') @RequirePermissions(PERMISSIONS.bookingWrite)
  createBooking(@Body() dto: CreateBookingFromQuoteDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.createBookingFromQuote(dto.quoteId, dto, key, { userId: user.id, guestSessionId: null }, user.id, 'admin');
  }

  @Patch('bookings/:id/status') @RequirePermissions(PERMISSIONS.bookingWrite)
  updateBookingStatus(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto, @CurrentUser() user: AuthenticatedUser) {
    if (dto.status === 'cancelled') throw new ForbiddenException('Huỷ đơn cần quyền booking.cancel; dùng tác vụ Huỷ đơn.');
    return this.operations.transitionBooking(id, dto, user);
  }

  @Post('bookings/:id/cancel') @RequirePermissions(PERMISSIONS.bookingCancel)
  cancelBooking(@Param('id') id: string, @Body() dto: UpdateBookingStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.transitionBooking(id, { ...dto, status: 'cancelled' }, user);
  }

  @Post('bookings/:id/notes') @RequirePermissions(PERMISSIONS.bookingWrite)
  addBookingNote(@Param('id') id: string, @Body() dto: CreateBookingNoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.addBookingNote(id, dto.body, user.id);
  }

  @Get('inventory') @RequirePermissions(PERMISSIONS.inventoryRead)
  inventory(@Query() query: ListInventoryQuery) { return this.operations.listInventory(query); }

  @Get('inventory/room-types') @RequirePermissions(PERMISSIONS.inventoryRead)
  inventoryRoomTypes() { return this.operations.listInventoryRoomTypes(); }

  @Post('inventory/availability') @RequirePermissions(PERMISSIONS.inventoryRead)
  inventoryAvailability(@Body() dto: CreateQuoteDto) { return this.operations.checkAvailability(dto); }

  @Put('inventory/:roomTypeId') @RequirePermissions(PERMISSIONS.inventoryWrite)
  updateInventory(@Param('roomTypeId') id: string, @Body() dto: UpdateInventoryDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.updateInventory(id, dto, user.id, key);
  }

  @Get('customers') @RequirePermissions(PERMISSIONS.crmRead)
  customers(@Query() query: ListAdminQuery) { return this.operations.listCustomers(query); }

  @Get('customers/:id') @RequirePermissions(PERMISSIONS.crmRead)
  customer(@Param('id') id: string) { return this.operations.getCustomer(id); }

  @Patch('customers/:id') @RequirePermissions(PERMISSIONS.crmWrite)
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.updateCustomer(id, dto, user.id);
  }

  @Get('customers/:id/interactions') @RequirePermissions(PERMISSIONS.crmRead)
  interactions(@Param('id') id: string) { return this.operations.customerInteractions(id); }

  @Post('customers/:id/interactions') @RequirePermissions(PERMISSIONS.crmWrite)
  addInteraction(@Param('id') id: string, @Body() dto: CreateInteractionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.addCustomerInteraction(id, dto, user.id);
  }

  @Get('customers/:id/follow-ups') @RequirePermissions(PERMISSIONS.crmRead)
  followUps(@Param('id') id: string) { return this.operations.customerFollowUps(id); }

  @Post('customers/:id/follow-ups') @RequirePermissions(PERMISSIONS.crmWrite)
  createFollowUp(@Param('id') id: string, @Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.createCustomerFollowUp(id, dto, user.id);
  }

  @Patch('follow-ups/:id') @RequirePermissions(PERMISSIONS.crmWrite)
  updateFollowUp(@Param('id') id: string, @Body() dto: UpdateFollowUpDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.updateFollowUp(id, dto, user.id);
  }

  @Get('coupons') @RequirePermissions(PERMISSIONS.couponRead)
  coupons(@Query() query: ListAdminQuery) { return this.operations.listCoupons(query); }

  @Post('coupons') @RequirePermissions(PERMISSIONS.couponWrite)
  createCoupon(@Body() dto: CreateCouponDto, @CurrentUser() user: AuthenticatedUser) { return this.operations.createCoupon(dto, user.id); }

  @Patch('coupons/:id') @RequirePermissions(PERMISSIONS.couponWrite)
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto, @CurrentUser() user: AuthenticatedUser) { return this.operations.updateCoupon(id, dto, user.id); }

  @Get('coupons/:id/redemptions') @RequirePermissions(PERMISSIONS.couponRead)
  couponRedemptions(@Param('id') id: string, @Query() query: ListAdminQuery) { return this.operations.couponRedemptions(id, query); }

  @Get('payments') @RequirePermissions(PERMISSIONS.financeRead)
  payments(@Query() query: ListAdminQuery) { return this.operations.listPayments(query); }

  @Get('payments/:id') @RequirePermissions(PERMISSIONS.financeRead)
  payment(@Param('id') id: string) { return this.operations.getPayment(id); }

  @Post('payments') @RequirePermissions(PERMISSIONS.financeWrite)
  createPayment(@Body() dto: CreateManualPaymentDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.createManualPayment(dto, key, user.id);
  }

  @Get('refunds') @RequirePermissions(PERMISSIONS.financeRead)
  refunds(@Query() query: ListAdminQuery) { return this.operations.listRefunds(query); }

  @Post('refunds') @RequirePermissions(PERMISSIONS.financeWrite)
  createRefund(@Body() dto: CreateRefundDto, @Headers('idempotency-key') key: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.createRefund(dto, key, user.id);
  }

  @Patch('refunds/:id/status') @RequirePermissions(PERMISSIONS.refundApprove)
  updateRefund(@Param('id') id: string, @Body() dto: UpdateRefundDto, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.updateRefund(id, dto, user.id);
  }

  @Get('reports/summary') @RequirePermissions(PERMISSIONS.reportRead)
  report(@Query() query: ReportQuery) { return this.operations.report(query); }
}

@Controller('quotes')
export class PublicQuotesController {
  constructor(private readonly operations: AdminOperationsService) {}

  private owner(request: FastifyRequest): QuoteOwner {
    const scoped = request as FastifyRequest & { user?: AuthenticatedUser; guestSession?: GuestSessionContext | null };
    if (scoped.user) return { userId: scoped.user.id, guestSessionId: null };
    if (scoped.guestSession) return { userId: null, guestSessionId: scoped.guestSession.id };
    throw new ForbiddenException('Phiên đặt phòng đã hết hạn; vui lòng tải lại trang.');
  }

  private assertOrigin(origin?: string) {
    const allowed = loadConfig().publicOrigins;
    if (origin && allowed.length > 0 && !allowed.includes(origin)) throw new ForbiddenException('Nguồn đặt phòng không được phép');
  }

  @Post() @Public()
  create(@Body() dto: CreateQuoteDto, @Req() request: FastifyRequest, @Headers('origin') origin?: string) {
    this.assertOrigin(origin);
    return this.operations.createQuote(dto, this.owner(request));
  }

  @Get(':id') @Public()
  get(@Param('id') id: string, @Req() request: FastifyRequest) { return this.operations.getQuote(id, this.owner(request)); }

  @Post(':id/hold') @Public()
  async hold(@Param('id') id: string, @Body() dto: HoldQuoteDto, @Headers('idempotency-key') key: string, @Req() request: FastifyRequest, @Headers('origin') origin?: string) {
    this.assertOrigin(origin);
    const bookingResult = await this.operations.createBookingFromQuote(id, dto, key, this.owner(request), null, 'website');
    const booking = bookingResult as unknown as {
      id: string; publicCode: string; bookingStatus: string; checkIn: string; checkOut: string;
      adults: number; children: number; subtotalVnd: string; discountVnd: string;
      totalVnd: string; dueNowVnd: string; expiresAt: string;
    };
    // The public browser needs only a receipt and hold state, never CRM, payment, refund,
    // internal-note, or event-log data from bookingView().
    return {
      id: booking.id,
      publicCode: booking.publicCode,
      bookingStatus: booking.bookingStatus,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      subtotalVnd: booking.subtotalVnd,
      discountVnd: booking.discountVnd,
      totalVnd: booking.totalVnd,
      dueNowVnd: booking.dueNowVnd,
      expiresAt: booking.expiresAt,
    };
  }
}
