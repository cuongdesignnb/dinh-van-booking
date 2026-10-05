import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SETTINGS_BY_KEY } from '../settings/settings.registry';
import { SettingsService } from '../settings/settings.service';
import type { AuthenticatedUser } from '../common/types';
import { InventoryMutationService, availableRaw, validateInventoryInvariant } from '../inventory/inventory-mutation.service';
import type {
  CreateCouponDto, CreateFollowUpDto, CreateInteractionDto, CreateManualPaymentDto,
  CreateRefundDto, CreateQuoteDto, ListAdminQuery, ListInventoryQuery, ReportQuery,
  UpdateBookingStatusDto, UpdateCouponDto, UpdateCustomerDto, UpdateFollowUpDto,
  UpdateInventoryDto, UpdateRefundDto,
} from './dto';

type Tx = Prisma.TransactionClient;
type DateRange = { dates: Date[]; from: Date; to: Date };
type NightPrice = { stayDate: string; amountVnd: bigint; rateRuleId: string | null };
export type QuoteOwner = { userId: string | null; guestSessionId: string | null };

const HOLD_MINUTES = 15;
const QUOTE_MINUTES = 15;
const DEFAULT_PAGE_SIZE = 25;
const BOOKING_STATUSES = new Set(['pending_confirmation', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired', 'no_show']);
const ACTIVE_REFUND_STATUSES = ['requested', 'approved', 'settled'];
const BOOKING_TRANSITIONS: Record<string, string[]> = {
  pending_confirmation: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['completed'], completed: [], cancelled: [], expired: [], no_show: [],
};

export function canTransitionBookingStatus(from: string, to: string): boolean {
  return BOOKING_STATUSES.has(to) && (BOOKING_TRANSITIONS[from]?.includes(to) ?? false);
}

export function calculateCouponDiscount(
  coupon: { discountType: string; percentBps: number | null; amountVnd: bigint | null; maxDiscountVnd: bigint | null },
  subtotal: bigint,
): bigint {
  let discount = coupon.discountType === 'percent'
    ? (subtotal * BigInt(coupon.percentBps ?? 0) + 5_000n) / 10_000n
    : (coupon.amountVnd ?? 0n);
  if (coupon.maxDiscountVnd !== null && discount > coupon.maxDiscountVnd) discount = coupon.maxDiscountVnd;
  return discount > subtotal ? subtotal : discount;
}

function dateOnly(value: string): Date {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD');
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new BadRequestException('Ngày không hợp lệ');
  return date;
}

function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number): Date { const result = new Date(date); result.setUTCDate(result.getUTCDate() + days); return result; }
function localBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function localBusinessInstant(day: string): Date { return new Date(`${day}T00:00:00+07:00`); }

function range(fromValue: string, toValue: string, maxNights = 90): DateRange {
  const from = dateOnly(fromValue);
  const to = dateOnly(toValue);
  const nights = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (nights < 1 || nights > maxNights) throw new BadRequestException(`Khoảng ngày phải từ 1 đến ${maxNights} đêm`);
  return { from, to, dates: Array.from({ length: nights }, (_, index) => addDays(from, index)) };
}

function jsonSafe<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item)) as Prisma.InputJsonValue;
}

function normalizedPhone(value: string): string { return value.replace(/\D/g, ''); }
function normalizedEmail(value?: string | null): string | null { return value?.trim().toLocaleLowerCase('en-US') || null; }
function pageParams(query: ListAdminQuery): { skip: number; take: number; page: number; pageSize: number } {
  const page = query.page ?? 1;
  const pageSize = Math.min(100, query.pageSize ?? DEFAULT_PAGE_SIZE);
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
function activeDate(value: Date | null, now: Date): boolean { return !value || value <= now; }

@Injectable()
export class AdminOperationsService {
  private readonly logger = new Logger(AdminOperationsService.name);
  constructor(private readonly prisma: PrismaService, private readonly inventoryMutations: InventoryMutationService, private readonly settings: SettingsService) {}

  async dashboardSummary() {
    const now = new Date();
    const [bookings, inquiries, customers, publishedStays, publishedCombos, publishedDestinations, contentStates,
      inventoryRows, expiringHolds, payments, refunds, revenue] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['bookingStatus'], where: { isDemo: false }, _count: { _all: true } }),
      this.prisma.inquiry.count({ where: { isDemo: false, stage: 'new' } }),
      this.prisma.customer.count({ where: { isDemo: false } }),
      this.prisma.property.count({ where: { content: { publicationStatus: 'published', isDemo: false }, operatingStatus: 'active' } }),
      this.prisma.combo.count({ where: { content: { publicationStatus: 'published', isDemo: false } } }),
      this.prisma.destination.count({ where: { content: { publicationStatus: 'published', isDemo: false } } }),
      this.prisma.contentNode.groupBy({ by: ['publicationStatus'], where: { isDemo: false }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM inventory_days d
        JOIN room_types rt ON rt.id = d.room_type_id
        JOIN properties p ON p.id = rt.property_id
        JOIN content_nodes cn ON cn.id = p.content_id
        WHERE cn.is_demo = false
          AND (d.capacity <= d.blocked_count + d.held_count + d.reserved_count OR d.stop_sell = true)
      `),
      this.prisma.inventoryReservation.count({ where: { status: 'held', expiresAt: { gt: now, lte: new Date(now.getTime() + 60 * 60_000) } } }),
      this.prisma.payment.groupBy({ by: ['status'], where: { booking: { isDemo: false } }, _count: { _all: true } }),
      this.prisma.refund.groupBy({ by: ['status'], where: { payment: { booking: { isDemo: false } } }, _count: { _all: true } }),
      this.prisma.payment.aggregate({ where: { status: 'posted', booking: { isDemo: false } }, _sum: { amountVnd: true } }),
    ]);
    const byStatus = (rows: Array<{ bookingStatus: string; _count: { _all: number } }>) => Object.fromEntries(rows.map((row) => [row.bookingStatus, row._count._all]));
    const contentByStatus = Object.fromEntries(contentStates.map((row) => [row.publicationStatus, row._count._all]));
    return {
      generatedAt: now.toISOString(),
      sources: { bookings: 'PostgreSQL bookings', inquiries: 'PostgreSQL inquiries', customers: 'PostgreSQL customers', inventory: 'PostgreSQL inventory_days', finance: 'PostgreSQL payments/refunds', content: 'PostgreSQL content_nodes' },
      bookings: { total: Object.values(byStatus(bookings)).reduce((sum, count) => sum + count, 0), byStatus: byStatus(bookings) },
      newInquiries: inquiries,
      customers,
      published: { stays: publishedStays, combos: publishedCombos, destinations: publishedDestinations },
      content: { draft: contentByStatus.draft ?? 0, review: contentByStatus.review ?? 0, published: contentByStatus.published ?? 0 },
      inventoryAlerts: Number(inventoryRows[0]?.count ?? 0),
      holdsExpiringWithinHour: expiringHolds,
      payments: Object.fromEntries(payments.map((row) => [row.status, row._count._all])),
      refunds: Object.fromEntries(refunds.map((row) => [row.status, row._count._all])),
      recordedPaymentsVnd: (revenue._sum.amountVnd ?? 0n).toString(),
    };
  }

  async dashboardActivity() {
    const [events, inquiries, audit] = await Promise.all([
      this.prisma.bookingEvent.findMany({ where: { booking: { isDemo: false } }, include: { booking: { select: { publicCode: true } } }, orderBy: { createdAt: 'desc' }, take: 12 }),
      this.prisma.inquiry.findMany({ where: { isDemo: false }, include: { customer: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
      this.prisma.auditLog.findMany({ where: { AND: [{ action: { not: { contains: 'secret' } } }, { action: { not: { startsWith: 'public-bootstrap.' } } }] }, include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 12 }),
    ]);
    const ids = (type: string) => audit.filter((item) => item.entityType === type && item.entityId).map((item) => item.entityId!);
    const [properties, contents, media, menus, rooms, customers, bookings, coupons] = await Promise.all([
      this.prisma.property.findMany({ where: { id: { in: ids('property') } }, select: { id: true, content: { select: { title: true } } } }),
      this.prisma.contentNode.findMany({ where: { id: { in: ids('content_node') } }, select: { id: true, title: true } }),
      this.prisma.mediaAsset.findMany({ where: { id: { in: ids('media_asset') } }, select: { id: true, altText: true, originalFilename: true } }),
      this.prisma.navigationMenu.findMany({ where: { id: { in: ids('navigation_menu') } }, select: { id: true, name: true } }),
      this.prisma.roomType.findMany({ where: { id: { in: ids('room_type') } }, select: { id: true, name: true } }),
      this.prisma.customer.findMany({ where: { id: { in: ids('customer') } }, select: { id: true, fullName: true } }),
      this.prisma.booking.findMany({ where: { id: { in: ids('booking') } }, select: { id: true, publicCode: true } }),
      this.prisma.coupon.findMany({ where: { id: { in: ids('coupon') } }, select: { id: true, name: true } }),
    ]);
    const names = new Map<string, string>([
      ...properties.map((item) => [item.id, item.content.title] as const),
      ...contents.map((item) => [item.id, item.title] as const),
      ...media.map((item) => [item.id, item.altText || item.originalFilename] as const),
      ...menus.map((item) => [item.id, item.name] as const),
      ...rooms.map((item) => [item.id, item.name] as const),
      ...customers.map((item) => [item.id, item.fullName] as const),
      ...bookings.map((item) => [item.id, item.publicCode] as const),
      ...coupons.map((item) => [item.id, item.name] as const),
    ]);
    const actionLabels: Record<string, string> = {
      'property.create': 'Đã tạo nơi lưu trú', 'property.update': 'Đã sửa nơi lưu trú', 'property.delete': 'Đã xoá nơi lưu trú',
      'content.create': 'Đã tạo nội dung', 'content.update': 'Đã sửa nội dung', 'content.published': 'Đã xuất bản nội dung',
      'content.unpublished': 'Đã gỡ xuất bản nội dung', 'content.delete': 'Đã xoá nội dung',
      'content.draft': 'Đã đưa nội dung về bản nháp', 'content.archived': 'Đã lưu trữ nội dung', 'content.restore': 'Đã khôi phục nội dung',
      'room.create': 'Đã thêm hạng phòng', 'room.update': 'Đã sửa hạng phòng',
      'media.upload': 'Đã tải ảnh lên', 'media.update': 'Đã sửa thông tin ảnh', 'media.delete': 'Đã xoá ảnh',
      'settings.update': 'Đã cập nhật cài đặt', 'settings.reset': 'Đã đặt lại cài đặt',
      'ai.settings.update': 'Đã cập nhật cài đặt AI',
      'navigation.primary.update': 'Đã cập nhật menu chính', 'navigation.primary.reset': 'Đã đặt lại menu chính',
      'public-bootstrap.create': 'Đã khởi tạo nội dung website', 'public-bootstrap.media-meta': 'Đã bổ sung thông tin ảnh',
      'business_import.cuc_phuong': 'Đã nhập dữ liệu lưu trú Cúc Phương',
      'booking.hold_created': 'Đã giữ chỗ cho đơn', 'booking.status_changed': 'Đã đổi trạng thái đơn', 'booking.note_added': 'Đã ghi chú đơn', 'booking.hold_expired': 'Đơn giữ chỗ đã hết hạn',
      'inventory.bulk_updated': 'Đã cập nhật quỹ phòng', 'customer.updated': 'Đã sửa khách hàng', 'customer.interaction_added': 'Đã ghi nhận trao đổi với khách',
      'customer.follow_up_created': 'Đã tạo nhắc chăm sóc khách', 'customer.follow_up_updated': 'Đã cập nhật nhắc chăm sóc khách',
      'coupon.created': 'Đã tạo khuyến mãi', 'coupon.updated': 'Đã sửa khuyến mãi',
      'payment.manual_recorded': 'Đã ghi nhận thanh toán', 'refund.requested': 'Đã yêu cầu hoàn tiền', 'refund.status_changed': 'Đã cập nhật hoàn tiền',
    };
    const bookingLabels: Record<string, string> = {
      created: 'Đã tạo đơn đặt phòng', confirmed: 'Đã xác nhận đơn', checked_in: 'Khách đã nhận phòng',
      completed: 'Đã hoàn tất đơn', cancelled: 'Đã huỷ đơn', expired: 'Đơn đã hết hạn',
    };
    const stageLabels: Record<string, string> = { new: 'Mới', contacted: 'Đã liên hệ', quoted: 'Đã báo giá', won: 'Thành công', lost: 'Không tiếp tục' };
    return { items: [
      ...events.map((item) => ({ id: item.id, at: item.createdAt.toISOString(), kind: 'booking', title: `${bookingLabels[item.eventType] ?? 'Đã cập nhật đơn'} ${item.booking.publicCode}`, detail: item.detail })),
      ...inquiries.map((item) => ({ id: item.id, at: item.createdAt.toISOString(), kind: 'inquiry', title: `Yêu cầu tư vấn từ ${item.customer.fullName}`, detail: `Trạng thái: ${stageLabels[item.stage] ?? 'Đang xử lý'}` })),
      ...audit.map((item) => {
        const diff = item.diff && typeof item.diff === 'object' && !Array.isArray(item.diff) ? item.diff as Record<string, unknown> : {};
        const settingKey = typeof diff.key === 'string' ? diff.key : null;
        const objectName = item.entityId ? names.get(item.entityId) : null;
        const subject = item.action.startsWith('room.') && typeof diff.roomName === 'string' ? diff.roomName
          : objectName || (settingKey ? SETTINGS_BY_KEY.get(settingKey)?.label ?? 'Cài đặt website' : null);
        const detail = [subject, item.actor?.fullName ? `Bởi ${item.actor.fullName}` : null].filter(Boolean).join(' · ');
        return { id: item.id, at: item.createdAt.toISOString(), kind: 'admin', title: actionLabels[item.action] ?? 'Đã cập nhật hệ thống', detail: detail || null };
      }),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20) };
  }

  async createQuote(input: CreateQuoteDto, owner: QuoteOwner) {
    if (Boolean(owner.userId) === Boolean(owner.guestSessionId)) throw new BadRequestException('Chủ báo giá không hợp lệ');
    const stay = range(input.checkIn, input.checkOut, 30);
    const room = await this.prisma.roomType.findUnique({
      where: { id: input.roomTypeId },
      include: { property: { include: { content: { select: { title: true, publicationStatus: true, isDemo: true } } } }, ratePlans: { where: { active: true }, include: { rules: { where: { active: true }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!room || room.status !== 'active' || !room.capacityVerified || room.property.operatingStatus !== 'active' || room.property.content.publicationStatus !== 'published' || room.property.content.isDemo) {
      throw new NotFoundException('Hạng phòng đang không được bán công khai');
    }
    const rate = input.ratePlanId ? room.ratePlans.find((candidate) => candidate.id === input.ratePlanId) : room.ratePlans[0];
    if (!rate) throw new ConflictException('Chưa có bảng giá đang hoạt động cho hạng phòng này');
    if (rate.baseRateVnd <= 0n) throw new ConflictException('Hạng phòng này chỉ nhận yêu cầu liên hệ, chưa thể đặt trực tuyến');
    const adults = input.adults ?? 1;
    const children = input.children ?? 0;
    if (adults > room.maxAdults * input.quantity || children > room.maxChildren * input.quantity || adults + children > room.maxOccupancy * input.quantity) {
      throw new BadRequestException('Số khách vượt quá sức chứa của hạng phòng đã chọn');
    }
    if (stay.dates.length < rate.minStayNights || (rate.maxStayNights && stay.dates.length > rate.maxStayNights)) throw new BadRequestException('Số đêm không phù hợp với điều kiện bảng giá');
    await this.assertAvailability(this.prisma, room.id, stay.dates, input.quantity);

    const nights: NightPrice[] = stay.dates.map((day) => {
      const weekday = day.getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      let amount = weekend && rate.weekendRateVnd !== null ? rate.weekendRateVnd : rate.baseRateVnd;
      let usedRule: string | null = null;
      const bit = weekday === 0 ? 6 : weekday - 1; // weekday mask: Monday is bit zero.
      const rule = rate.rules.find((candidate) => candidate.dateFrom <= day && candidate.dateToExclusive > day && (candidate.weekdayMask & (1 << bit)) !== 0);
      if (rule) {
        if (rule.ruleType === 'fixed' && rule.fixedRateVnd !== null) amount = rule.fixedRateVnd;
        else if (rule.ruleType === 'adjustment' && rule.adjustmentBps !== null) amount = (amount * BigInt(10_000 + rule.adjustmentBps) + 5_000n) / 10_000n;
        else throw new ConflictException(`Quy tắc giá ${rule.name} chưa hợp lệ`);
        usedRule = rule.id;
      }
      if (amount <= 0n) throw new ConflictException('Bảng giá phải lớn hơn 0 VND');
      return { stayDate: dateKey(day), amountVnd: amount, rateRuleId: usedRule };
    });
    const perRoomSubtotal = nights.reduce((sum, night) => sum + night.amountVnd, 0n);
    const subtotal = perRoomSubtotal * BigInt(input.quantity);
    const coupon = input.couponCode ? await this.findValidCoupon(this.prisma, input.couponCode, subtotal, new Date(), null) : null;
    const discount = coupon ? this.couponDiscount(coupon, subtotal) : 0n;
    const total = subtotal - discount;
    const depositBps = rate.depositBps;
    const dueNow = (total * BigInt(depositBps) + 9_999n) / 10_000n;
    const snapshot = {
      propertyId: room.propertyId, propertyName: room.property.content.title, roomTypeId: room.id,
      roomName: room.name, ratePlanId: rate.id, ratePlanVersion: rate.version,
      quantity: input.quantity, adults: input.adults ?? 1, children: input.children ?? 0,
      maxAdultsPerRoom: room.maxAdults, maxChildrenPerRoom: room.maxChildren, maxOccupancyPerRoom: room.maxOccupancy,
      checkIn: dateKey(stay.from), checkOut: dateKey(stay.to), nights: nights.map((night) => ({ ...night, amountVnd: night.amountVnd.toString() })),
      coupon: coupon ? { id: coupon.id, code: coupon.code, discountType: coupon.discountType } : null,
      taxMode: rate.taxMode, currency: 'VND',
    };
    const now = new Date();
    const quote = await this.prisma.bookingQuote.create({ data: {
      requestSnapshot: jsonSafe(input), pricedSnapshot: jsonSafe(snapshot), pricingVersion: `${rate.id}:${rate.version}`,
      subtotalVnd: subtotal, discountVnd: discount, totalVnd: total, dueNowVnd: dueNow,
      ownerUserId: owner.userId, ownerGuestSessionId: owner.guestSessionId,
      expiresAt: new Date(now.getTime() + QUOTE_MINUTES * 60_000),
    } });
    return { id: quote.id, currency: 'VND', subtotalVnd: subtotal.toString(), discountVnd: discount.toString(), totalVnd: total.toString(), dueNowVnd: dueNow.toString(), expiresAt: quote.expiresAt.toISOString(), pricingVersion: quote.pricingVersion, snapshot };
  }

  async getQuote(id: string, owner: QuoteOwner) {
    const quote = await this.prisma.bookingQuote.findUnique({ where: { id }, include: { booking: { select: {
      id: true, publicCode: true, bookingStatus: true, expiresAt: true, totalVnd: true, dueNowVnd: true,
    } } } });
    if (!quote || (owner.userId ? quote.ownerUserId !== owner.userId : quote.ownerGuestSessionId !== owner.guestSessionId)) {
      throw new NotFoundException('Không tìm thấy báo giá');
    }
    if (quote.expiresAt <= new Date() && !quote.booking) throw new ConflictException('Báo giá đã hết hạn');
    return { id: quote.id, request: quote.requestSnapshot, pricing: quote.pricedSnapshot, subtotalVnd: quote.subtotalVnd.toString(), discountVnd: quote.discountVnd.toString(), totalVnd: quote.totalVnd.toString(), dueNowVnd: quote.dueNowVnd.toString(), expiresAt: quote.expiresAt.toISOString(), booking: quote.booking ? {
      id: quote.booking.id, publicCode: quote.booking.publicCode, bookingStatus: quote.booking.bookingStatus,
      expiresAt: quote.booking.expiresAt?.toISOString() ?? null, totalVnd: quote.booking.totalVnd.toString(), dueNowVnd: quote.booking.dueNowVnd.toString(),
    } : null };
  }

  async createBookingFromQuote(quoteId: string, contact: { fullName: string; phone: string; email?: string; city?: string; note?: string }, key: string, owner: QuoteOwner, actorId: string | null, channel: string) {
    if (Boolean(owner.userId) === Boolean(owner.guestSessionId)) throw new BadRequestException('Chủ báo giá không hợp lệ');
    const ownerId = owner.userId ?? owner.guestSessionId!;
    // Inventory nights and the quote are explicitly row-locked below. READ COMMITTED
    // lets a competing request observe the winner's committed count after it waits,
    // so sold-out contention becomes a domain 409 instead of a serialization 500.
    return this.idempotent(ownerId, 'create-booking-from-quote', key, { quoteId, contact, channel }, async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM booking_quotes WHERE id = ${quoteId}::uuid FOR UPDATE`);
      const quote = await tx.bookingQuote.findUnique({ where: { id: quoteId }, include: { booking: { select: { id: true } } } });
      if (!quote || (owner.userId ? quote.ownerUserId !== owner.userId : quote.ownerGuestSessionId !== owner.guestSessionId)) {
        throw new NotFoundException('Không tìm thấy báo giá');
      }
      if (quote.booking) return this.bookingView(tx, quote.booking.id);
      if (quote.consumedAt || quote.expiresAt <= new Date()) throw new ConflictException('Báo giá đã hết hạn hoặc đã sử dụng');
      const snapshot = quote.pricedSnapshot as Record<string, unknown>;
      const nightsInput = snapshot.nights as Array<{ stayDate: string; amountVnd: string; rateRuleId: string | null }>;
      const roomTypeId = String(snapshot.roomTypeId);
      const quantity = Number(snapshot.quantity);
      const adults = Number(snapshot.adults);
      const children = Number(snapshot.children);
      const dates = nightsInput.map((night) => dateOnly(night.stayDate)).sort((a, b) => a.getTime() - b.getTime());
      const room = await tx.roomType.findUnique({ where: { id: roomTypeId }, include: { property: { include: { content: true } }, ratePlans: { where: { id: String(snapshot.ratePlanId) }, select: { version: true } } } });
      if (!room || room.status !== 'active' || !room.capacityVerified || room.property.operatingStatus !== 'active' || room.property.content.publicationStatus !== 'published' || room.property.content.isDemo) throw new ConflictException('Nơi lưu trú không còn bán công khai');
      if (adults > room.maxAdults * quantity || children > room.maxChildren * quantity || adults + children > room.maxOccupancy * quantity) throw new ConflictException('Sức chứa hạng phòng đã thay đổi; hãy tạo báo giá mới.');
      if (room.ratePlans[0]?.version !== Number(snapshot.ratePlanVersion)) throw new ConflictException('Bảng giá đã thay đổi. Hãy tạo báo giá mới.');
      await this.lockInventory(tx, roomTypeId, dates);
      await this.assertAvailability(tx, roomTypeId, dates, quantity);

      const phone = normalizedPhone(contact.phone);
      const emailNormalized = normalizedEmail(contact.email);
      // Anonymous submissions are untrusted claims: never merge them into or overwrite an
      // existing CRM profile just because the submitted email/phone happens to match.
      // A logged-in partner/customer is not an internal CRM operator. Only
      // staff booking flows may match and update a pre-existing CRM record.
      let customer = channel === 'admin' && owner.userId
        ? await tx.customer.findFirst({ where: { OR: [{ phoneNormalized: phone }, ...(emailNormalized ? [{ emailNormalized }] : [])] } })
        : null;
      if (customer) {
        const fromVersion = customer.version;
        customer = await tx.customer.update({ where: { id: customer.id }, data: {
          fullName: contact.fullName.trim(), phone: contact.phone.trim(), phoneNormalized: phone,
          email: contact.email?.trim() || customer.email, emailNormalized: emailNormalized ?? customer.emailNormalized,
          city: contact.city?.trim() || customer.city, version: { increment: 1 },
        } });
        await this.audit(tx, actorId, 'customer.updated_via_booking', 'customer', customer.id, { changedFields: ['fullName', 'phone', ...(contact.email ? ['email'] : []), ...(contact.city ? ['city'] : [])], fromVersion, toVersion: customer.version });
      } else {
        customer = await tx.customer.create({ data: { fullName: contact.fullName.trim(), phone: contact.phone.trim(), phoneNormalized: phone, email: contact.email?.trim() || null, emailNormalized, city: contact.city?.trim() || null, source: channel, groupKind: 'family' } });
        await this.audit(tx, actorId, 'customer.created_via_booking', 'customer', customer.id, { source: channel, fields: ['fullName', 'phone', ...(contact.email ? ['email'] : []), ...(contact.city ? ['city'] : [])] });
      }

      const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
      const booking = await tx.booking.create({ data: {
        publicCode: `DV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`,
        quoteId: quote.id, customerId: customer.id, bookingStatus: 'pending_confirmation', channel,
        checkIn: dateOnly(String(snapshot.checkIn)), checkOut: dateOnly(String(snapshot.checkOut)),
        adults, children,
        subtotalVnd: quote.subtotalVnd, discountVnd: quote.discountVnd, totalVnd: quote.totalVnd, dueNowVnd: quote.dueNowVnd,
        contactSnapshot: jsonSafe({ fullName: contact.fullName.trim(), phone: contact.phone.trim(), email: contact.email?.trim() || null }),
        policySnapshot: jsonSafe(room.property.approvedPolicies), note: contact.note?.trim() || null, expiresAt,
        lines: { create: { kind: 'stay', roomTypeId, label: `${String(snapshot.propertyName)} · ${String(snapshot.roomName)}`, unit: 'room_stay', quantity, unitPriceVnd: quote.subtotalVnd / BigInt(quantity), grossVnd: quote.subtotalVnd, discountVnd: quote.discountVnd, taxVnd: 0n, netVnd: quote.totalVnd, serviceDateFrom: dateOnly(String(snapshot.checkIn)), serviceDateTo: dateOnly(String(snapshot.checkOut)), priceBreakdown: jsonSafe(snapshot.nights), serviceSnapshot: jsonSafe({ propertyId: snapshot.propertyId, roomTypeId, ratePlanId: snapshot.ratePlanId }) } },
      } });
      const line = await tx.bookingLine.findFirstOrThrow({ where: { bookingId: booking.id } });
      const reservation = await tx.inventoryReservation.create({ data: { bookingLineId: line.id, status: 'held', expiresAt, nights: { create: dates.map((stayDate) => ({ roomTypeId, stayDate, quantity })) } } });
      await this.inventoryMutations.hold(tx, booking.id, dates.map((stayDate) => ({ roomTypeId, stayDate, quantity })));

      const couponSnapshot = snapshot.coupon as { id?: string; code?: string } | null;
      if (couponSnapshot?.id) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM coupons WHERE id = ${couponSnapshot.id}::uuid FOR UPDATE`);
        const coupon = await tx.coupon.findUnique({ where: { id: couponSnapshot.id } });
        if (!coupon || !coupon.active || coupon.code !== couponSnapshot.code || coupon.startsAt && coupon.startsAt > new Date() || coupon.endsAt && coupon.endsAt <= new Date()) throw new ConflictException('Mã khuyến mãi vừa hết hiệu lực; hãy tạo báo giá mới.');
        if (coupon.minSubtotalVnd !== null && quote.subtotalVnd < coupon.minSubtotalVnd) throw new ConflictException('Đơn hàng không còn đạt giá trị tối thiểu của mã khuyến mãi.');
        if (this.couponDiscount(coupon, quote.subtotalVnd) !== quote.discountVnd) throw new ConflictException('Điều kiện hoặc mức giảm của mã vừa thay đổi; hãy tạo báo giá mới.');
        await this.assertCouponQuota(tx, coupon, customer.id);
        await tx.couponRedemption.create({ data: { couponId: coupon.id, bookingId: booking.id, status: 'reserved', savingsVnd: quote.discountVnd } });
        await tx.coupon.update({ where: { id: coupon.id }, data: { reservedUses: { increment: 1 }, version: { increment: 1 } } });
      }
      await tx.bookingQuote.update({ where: { id: quote.id }, data: { customerId: customer.id, consumedAt: new Date() } });
      await tx.bookingEvent.create({ data: { bookingId: booking.id, eventType: 'hold_created', toStatus: 'pending_confirmation', actorId: actorId ?? undefined, actorLabel: actorId ? 'Quản trị viên' : 'Khách đặt phòng', detail: `Giữ ${quantity} đơn vị phòng đến ${expiresAt.toISOString()}` } });
      await this.audit(tx, actorId, 'booking.hold_created', 'booking', booking.id, { quoteId: quote.id, inventoryReservationId: reservation.id, quantity, expiresAt: expiresAt.toISOString() });
      return this.bookingView(tx, booking.id);
    }, Prisma.TransactionIsolationLevel.ReadCommitted);
  }

  async listBookings(query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const where: Prisma.BookingWhereInput = { isDemo: false };
    if (query.status) where.bookingStatus = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.from || query.to) where.checkIn = { ...(query.from ? { gte: dateOnly(query.from) } : {}), ...(query.to ? { lt: dateOnly(query.to) } : {}) };
    if (query.propertyId) where.lines = { some: { roomType: { propertyId: query.propertyId } } };
    if (query.search) where.OR = [
      { publicCode: { contains: query.search.trim(), mode: 'insensitive' } },
      { customer: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } },
      { customer: { phone: { contains: query.search.trim() } } },
    ];
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({ where, include: { customer: { select: { fullName: true, phone: true, email: true } }, lines: true, payments: { include: { refunds: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.booking.count({ where }),
    ]);
    return { items: items.map((item) => this.serialize(item)), total, page, pageSize };
  }

  async getBooking(id: string) { return this.bookingView(this.prisma, id); }

  async transitionBooking(id: string, input: UpdateBookingStatusDto, user: AuthenticatedUser) {
    if (input.status === 'cancelled' && !input.reason?.trim()) throw new BadRequestException('Cần ghi rõ lý do huỷ đơn');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM bookings WHERE id = ${id}::uuid FOR UPDATE`);
      const booking = await tx.booking.findUnique({ where: { id }, include: { lines: { include: { reservations: { include: { nights: true } } } }, redemptions: true } });
      if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng');
      if (input.expectedVersion !== undefined && booking.version !== input.expectedVersion) throw new ConflictException('Đơn đặt phòng đã được người khác cập nhật');
      if (!this.canTransition(booking.bookingStatus, input.status)) throw new ConflictException(`Không thể chuyển đơn từ ${booking.bookingStatus} sang ${input.status}`);
      if (input.status === 'confirmed' && (!booking.expiresAt || booking.expiresAt <= new Date())) throw new ConflictException('Giữ chỗ đã hết hạn. Không thể xác nhận đơn này.');
    if (input.status === 'completed' && booking.checkOut && booking.checkOut > dateOnly(localBusinessDate())) throw new ConflictException('Chưa đến ngày trả phòng nên chưa thể hoàn tất đơn');
    if (input.status === 'no_show' && booking.checkIn && booking.checkIn > dateOnly(localBusinessDate())) throw new ConflictException('Chưa đến ngày nhận phòng nên chưa thể ghi nhận khách không đến');

      const reservations = booking.lines.flatMap((line) => line.reservations);
      const nights = reservations.flatMap((reservation) => reservation.nights).sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.getTime() - b.stayDate.getTime());
      await this.lockInventoryRows(tx, nights.map((night) => ({ roomTypeId: night.roomTypeId, stayDate: night.stayDate })));
      if (input.status === 'confirmed') {
        let confirmed = 0;
        for (const reservation of reservations) {
          const moved = await tx.inventoryReservation.updateMany({ where: { id: reservation.id, status: 'held', expiresAt: { gt: new Date() } }, data: { status: 'confirmed', expiresAt: null } });
          if (moved.count !== 1) throw new ConflictException('Một phần giữ chỗ đã hết hạn hoặc không còn hiệu lực');
          await this.inventoryMutations.confirmHold(tx, id, reservation.nights);
          confirmed++;
        }
        for (const redemption of booking.redemptions) {
          if (redemption.status !== 'reserved') continue;
          const moved = await tx.couponRedemption.updateMany({ where: { id: redemption.id, status: 'reserved' }, data: { status: 'committed', committedAt: new Date() } });
          if (moved.count === 1) await tx.coupon.update({ where: { id: redemption.couponId }, data: { reservedUses: { decrement: 1 }, committedUses: { increment: 1 }, version: { increment: 1 } } });
        }
        if (confirmed === 0) throw new ConflictException('Đơn không còn giữ chỗ để xác nhận');
      }
      if (input.status === 'cancelled' || input.status === 'expired') {
        await this.releaseReservations(tx, reservations, nights);
        await this.releaseCouponReservations(tx, booking.redemptions);
      }
      const updated = await tx.booking.update({ where: { id }, data: {
        bookingStatus: input.status, version: { increment: 1 },
        ...(input.status === 'confirmed' ? { confirmedAt: new Date() } : {}),
        ...(input.status === 'cancelled' ? { cancelledAt: new Date(), cancelReason: input.reason?.trim() || null } : {}),
        ...(input.status === 'completed' ? { completedAt: new Date() } : {}),
        ...(input.status === 'checked_in' ? { checkedInAt: new Date() } : {}),
        ...(input.status === 'expired' ? { cancelledAt: new Date(), cancelReason: 'hold_expired' } : {}),
      } });
      await tx.bookingEvent.create({ data: { bookingId: id, fromStatus: booking.bookingStatus, toStatus: input.status, eventType: `status_${input.status}`, actorId: user.id, actorLabel: user.fullName, detail: input.reason?.trim() || null } });
      await this.audit(tx, user.id, 'booking.status_changed', 'booking', id, { from: booking.bookingStatus, to: input.status, version: updated.version });
      return this.bookingView(tx, id);
    });
  }

  async addBookingNote(id: string, body: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, select: { id: true } });
    if (!booking) throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bookingNote.create({ data: { bookingId: id, authorId: userId, body: body.trim() } });
      await this.audit(tx, userId, 'booking.note_added', 'booking', id, { noteId: created.id });
      return created;
    });
    return this.serialize(note);
  }

  async listInventory(query: ListInventoryQuery) {
    const stay = range(query.from, query.to);
    const room = await this.prisma.roomType.findUnique({ where: { id: query.roomTypeId }, include: { property: { include: { content: { select: { title: true, isDemo: true } } } } } });
    if (!room || room.property.content.isDemo) throw new NotFoundException('Không tìm thấy hạng phòng');
    const rows = await this.prisma.inventoryDay.findMany({ where: { roomTypeId: room.id, stayDate: { gte: stay.from, lt: stay.to } }, orderBy: { stayDate: 'asc' } });
    const byDate = new Map(rows.map((row) => [dateKey(row.stayDate), row]));
    return { roomType: { id: room.id, code: room.code, name: room.name, propertyId: room.propertyId, propertyName: room.property.content.title }, items: stay.dates.map((date) => {
      const row = byDate.get(dateKey(date));
      return row ? { ...this.serialize(row), stayDate: dateKey(date), onSale: true, available: row.stopSell ? 0 : row.capacity - row.blockedCount - row.heldCount - row.reservedCount } : { roomTypeId: room.id, stayDate: dateKey(date), onSale: false, capacity: null, blockedCount: null, heldCount: null, reservedCount: null, stopSell: true, version: null, available: null };
    }) };
  }

  async listInventoryRoomTypes() {
    const items = await this.prisma.roomType.findMany({
      where: { status: 'active', capacityVerified: true, property: { operatingStatus: 'active', content: { isDemo: false } } },
      include: { property: { include: { content: { select: { title: true, isDemo: true } } } } },
      orderBy: [{ property: { code: 'asc' } }, { position: 'asc' }, { name: 'asc' }],
    });
    return { items: items.map((item) => ({ id: item.id, code: item.code, name: item.name, propertyId: item.propertyId, propertyCode: item.property.code, propertyName: item.property.content.title, status: item.status })) };
  }

  async inventoryProperties() {
    const items = await this.prisma.property.findMany({ where: { content: { isDemo: false } },
      select: { id: true, code: true, content: { select: { title: true } }, roomTypes: { orderBy: [{ position: 'asc' }, { code: 'asc' }], select: { id: true, name: true, code: true, status: true, capacityVerified: true, approvedPoolLimit: true } } }, orderBy: { code: 'asc' } });
    return { items: items.map(({ content, ...property }) => ({ ...property, name: content.title })) };
  }

  async inventoryMatrix(query: { propertyId: string; from: string; to: string }) {
    const stay = range(query.from, query.to, 90);
    const property = await this.prisma.property.findFirst({ where: { id: query.propertyId, content: { isDemo: false } }, select: { roomTypes: { select: { id: true } } } });
    if (!property) throw new NotFoundException('Không tìm thấy cơ sở.');
    const ids = property.roomTypes.map((room) => room.id);
    const [rows, incidents] = await Promise.all([
      this.prisma.inventoryDay.findMany({ where: { roomTypeId: { in: ids }, stayDate: { gte: stay.from, lt: stay.to } } }),
      this.prisma.inventoryIntegrityIncident.findMany({ where: { roomTypeId: { in: ids }, stayDate: { gte: stay.from, lt: stay.to }, resolvedAt: null }, select: { roomTypeId: true, stayDate: true } }),
    ]);
    const byKey = new Map(rows.map((row) => [`${row.roomTypeId}:${dateKey(row.stayDate)}`, row]));
    const incidentKeys = new Set(incidents.map((row) => `${row.roomTypeId}:${dateKey(row.stayDate)}`));
    return { items: ids.flatMap((roomTypeId) => stay.dates.map((day) => {
      const stayDate = dateKey(day), key = `${roomTypeId}:${stayDate}`, row = byKey.get(key);
      return row ? { ...this.serialize(row), stayDate, available: row.stopSell ? 0 : availableRaw(row), integrityHold: incidentKeys.has(key) } : { roomTypeId, stayDate, available: null, version: null, capacity: null };
    })) };
  }

  async setAvailable(changes: import('../inventory/inventory-mutation.service').AvailableChange[], actorId: string, key: string, preview = false) {
    return this.inventoryMutations.setAvailableBatch(changes, actorId, key, preview);
  }

  async checkAvailability(input: CreateQuoteDto) {
    const stay = range(input.checkIn, input.checkOut, 30);
    await this.assertAvailability(this.prisma, input.roomTypeId, stay.dates, input.quantity);
    return { available: true, roomTypeId: input.roomTypeId, quantity: input.quantity, checkIn: dateKey(stay.from), checkOut: dateKey(stay.to), nights: stay.dates.map(dateKey) };
  }

  async updateInventory(roomTypeId: string, input: UpdateInventoryDto, actorId: string, idempotencyKey: string) {
    return this.inventoryMutations.updateAdminRange(roomTypeId, input, actorId, idempotencyKey);
  }

  async listCustomers(query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const where: Prisma.CustomerWhereInput = { isDemo: false };
    if (query.search) where.OR = ['fullName', 'phone', 'email', 'source'].map((field) => ({ [field]: { contains: query.search!.trim(), mode: 'insensitive' } } as Prisma.CustomerWhereInput));
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({ where, include: { _count: { select: { inquiries: true, bookings: true } }, inquiries: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, stage: true, createdAt: true } }, bookings: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, publicCode: true, bookingStatus: true, createdAt: true } } }, orderBy: { updatedAt: 'desc' }, skip, take }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: items.map((item) => this.serialize(item)), total, page, pageSize };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id }, include: {
      inquiries: { include: { interactions: { orderBy: { occurredAt: 'desc' }, take: 10 }, followUps: { orderBy: { dueAt: 'asc' } } }, orderBy: { createdAt: 'desc' } },
      bookings: { include: { lines: true, payments: { include: { refunds: true } } }, orderBy: { createdAt: 'desc' } },
    } });
    if (!customer || customer.isDemo) throw new NotFoundException('Không tìm thấy khách hàng');
    return this.serialize(customer);
  }

  async updateCustomer(id: string, input: UpdateCustomerDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id } });
      if (!current || current.isDemo) throw new NotFoundException('Không tìm thấy khách hàng');
      if (current.version !== input.expectedVersion) throw new ConflictException('Hồ sơ khách đã được cập nhật ở nơi khác');
      const { expectedVersion: _expectedVersion, ...fields } = input;
      void _expectedVersion;
      const updateData: Prisma.CustomerUpdateInput = {
        ...fields,
        ...(input.phone !== undefined ? { phoneNormalized: input.phone ? normalizedPhone(input.phone) : null } : {}),
        ...(input.email !== undefined ? { emailNormalized: normalizedEmail(input.email) } : {}),
        version: { increment: 1 },
      };
      const updated = await tx.customer.update({ where: { id }, data: updateData });
      await this.audit(tx, actorId, 'customer.updated', 'customer', id, { changedFields: Object.keys(fields), fromVersion: current.version, toVersion: updated.version });
      return this.serialize(updated);
    });
  }

  async customerInteractions(customerId: string) {
    await this.requireCustomer(customerId);
    const items = await this.prisma.interaction.findMany({ where: { inquiry: { customerId } }, include: { author: { select: { fullName: true } }, inquiry: { select: { id: true, stage: true, intent: true } } }, orderBy: { occurredAt: 'desc' } });
    return { items: this.serialize(items) };
  }

  async addCustomerInteraction(customerId: string, input: CreateInteractionDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.requireCustomerTx(tx, customerId);
      const inquiryId = await this.ensureCustomerInquiry(tx, customerId, input.inquiryId, actorId);
      const item = await tx.interaction.create({ data: { inquiryId, authorUserId: actorId, channel: input.channel, visibility: 'internal', body: input.body.trim() } });
      await this.audit(tx, actorId, 'customer.interaction_added', 'customer', customerId, { interactionId: item.id, channel: input.channel });
      return this.serialize(item);
    });
  }

  async customerFollowUps(customerId: string) {
    await this.requireCustomer(customerId);
    const items = await this.prisma.followUp.findMany({ where: { inquiry: { customerId } }, include: { inquiry: { select: { id: true, stage: true, intent: true } }, assignee: { select: { fullName: true } } }, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] });
    return { items: this.serialize(items) };
  }

  async createCustomerFollowUp(customerId: string, input: CreateFollowUpDto, actorId: string) {
    const dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() < Date.now() - 60_000) throw new BadRequestException('Thời hạn nhắc việc không thể ở quá khứ');
    return this.prisma.$transaction(async (tx) => {
      await this.requireCustomerTx(tx, customerId);
      const inquiryId = await this.ensureCustomerInquiry(tx, customerId, input.inquiryId, actorId);
      const item = await tx.followUp.create({ data: { inquiryId, assignedUserId: actorId, dueAt, purpose: input.purpose.trim() } });
      await this.audit(tx, actorId, 'customer.follow_up_created', 'customer', customerId, { followUpId: item.id, dueAt: dueAt.toISOString() });
      return this.serialize(item);
    });
  }

  async updateFollowUp(id: string, input: UpdateFollowUpDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.followUp.findUnique({ where: { id }, include: { inquiry: { select: { customerId: true } } } });
      if (!current) throw new NotFoundException('Không tìm thấy lịch nhắc việc');
      if (current.status !== 'open' && input.status !== current.status) throw new ConflictException('Lịch nhắc việc đã được đóng');
      const updated = await tx.followUp.update({ where: { id }, data: { status: input.status, completedAt: input.status === 'completed' ? new Date() : null } });
      await this.audit(tx, actorId, 'customer.follow_up_updated', 'customer', current.inquiry.customerId, { followUpId: id, status: input.status });
      return this.serialize(updated);
    });
  }

  async listCoupons(query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const where: Prisma.CouponWhereInput = {};
    if (query.status === 'active') where.active = true;
    if (query.status === 'inactive') where.active = false;
    if (query.search) where.OR = [{ code: { contains: query.search.trim(), mode: 'insensitive' } }, { name: { contains: query.search.trim(), mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({ where, include: { _count: { select: { redemptions: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.coupon.count({ where }),
    ]);
    return { items: this.serialize(items), total, page, pageSize, schemaCapabilities: { productScopes: false, descriptionField: false } };
  }

  async createCoupon(input: CreateCouponDto, actorId: string) {
    this.validateCouponInput(input);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.coupon.create({ data: this.couponData(input) });
      await this.audit(tx, actorId, 'coupon.created', 'coupon', item.id, { code: item.code, discountType: item.discountType, active: item.active });
      return this.serialize(item);
    });
  }

  async updateCoupon(id: string, input: UpdateCouponDto, actorId: string) {
    this.validateCouponInput(input);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM coupons WHERE id = ${id}::uuid FOR UPDATE`);
      const current = await tx.coupon.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
      if (current.version !== input.expectedVersion) throw new ConflictException('Mã khuyến mãi đã được cập nhật ở nơi khác');
      if (input.usageLimit !== undefined && input.usageLimit !== null && input.usageLimit < current.reservedUses + current.committedUses) throw new ConflictException('Không thể đặt giới hạn thấp hơn số lượt đã giữ/đã dùng');
      const { expectedVersion: _expectedVersion, ...fields } = input;
      void _expectedVersion;
      const item = await tx.coupon.update({ where: { id }, data: { ...this.couponData(fields), version: { increment: 1 } } });
      await this.audit(tx, actorId, 'coupon.updated', 'coupon', id, { code: item.code, active: item.active, fromVersion: current.version, toVersion: item.version });
      return this.serialize(item);
    });
  }

  async couponRedemptions(couponId: string, query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const [items, total] = await Promise.all([
      this.prisma.couponRedemption.findMany({ where: { couponId, booking: { isDemo: false } }, include: { booking: { select: { id: true, publicCode: true, bookingStatus: true, customer: { select: { fullName: true } } } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.couponRedemption.count({ where: { couponId, booking: { isDemo: false } } }),
    ]);
    return { items: this.serialize(items), total, page, pageSize };
  }

  async listPayments(query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const where: Prisma.PaymentWhereInput = { booking: { isDemo: false } };
    if (query.status) where.status = query.status;
    if (query.from || query.to) where.postedAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) };
    if (query.search) where.OR = [{ externalReference: { contains: query.search.trim(), mode: 'insensitive' } }, { booking: { publicCode: { contains: query.search.trim(), mode: 'insensitive' } } }, { booking: { customer: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } } }];
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({ where, include: { verifiedBy: { select: { fullName: true } }, booking: { select: { id: true, publicCode: true, bookingStatus: true, customer: { select: { fullName: true, phone: true } } } }, refunds: true }, orderBy: { postedAt: 'desc' }, skip, take }),
      this.prisma.payment.count({ where }),
    ]);
    return { items: this.serialize(items), total, page, pageSize, liveProviderEnabled: false };
  }

  async getPayment(id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, booking: { isDemo: false } },
      include: {
        verifiedBy: { select: { fullName: true } },
        booking: { include: { customer: { select: { fullName: true, phone: true, email: true } } } },
        refunds: { orderBy: { createdAt: 'desc' }, include: { approvedBy: { select: { fullName: true } } } },
      },
    });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    return this.serialize(payment);
  }

  async createManualPayment(input: CreateManualPaymentDto, key: string, actorId: string) {
    return this.idempotent(actorId, 'manual-payment', key, input, async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM bookings WHERE id = ${input.bookingId}::uuid FOR UPDATE`);
      const booking = await tx.booking.findUnique({ where: { id: input.bookingId } });
      if (!booking || booking.isDemo) throw new NotFoundException('Không tìm thấy đơn đặt phòng');
      if (['cancelled', 'expired'].includes(booking.bookingStatus)) throw new ConflictException('Không ghi nhận thanh toán cho đơn đã huỷ/hết hạn');
      const paid = await tx.payment.aggregate({ where: { bookingId: booking.id, status: 'posted' }, _sum: { amountVnd: true } });
      const remaining = booking.totalVnd - (paid._sum.amountVnd ?? 0n);
      const amount = BigInt(input.amountVnd);
      if (amount > remaining) throw new ConflictException('Số tiền vượt quá số dư còn phải thu');
      const payment = await tx.payment.create({ data: { bookingId: booking.id, method: input.method, provider: null, externalReference: input.externalReference?.trim() || null, status: 'posted', amountVnd: amount, verifiedById: actorId, note: input.note?.trim() || null } });
      await this.audit(tx, actorId, 'payment.manual_recorded', 'payment', payment.id, { bookingId: booking.id, amountVnd: amount.toString(), method: payment.method, provider: null });
      return this.serialize(payment);
    });
  }

  async listRefunds(query: ListAdminQuery) {
    const { skip, take, page, pageSize } = pageParams(query);
    const where: Prisma.RefundWhereInput = { payment: { booking: { isDemo: false } } };
    if (query.status) where.status = query.status;
    if (query.search) where.OR = [
      { reason: { contains: query.search.trim(), mode: 'insensitive' } },
      { externalReference: { contains: query.search.trim(), mode: 'insensitive' } },
      { payment: { booking: { publicCode: { contains: query.search.trim(), mode: 'insensitive' } } } },
      { payment: { booking: { customer: { fullName: { contains: query.search.trim(), mode: 'insensitive' } } } } },
    ];
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({ where, include: { payment: { include: { booking: { select: { publicCode: true, customer: { select: { fullName: true } } } } } }, approvedBy: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.refund.count({ where }),
    ]);
    return { items: this.serialize(items), total, page, pageSize, liveProviderEnabled: false };
  }

  async createRefund(input: CreateRefundDto, key: string, actorId: string) {
    return this.idempotent(actorId, 'refund-request', key, input, async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT p.id FROM payments p WHERE p.id = ${input.paymentId}::uuid FOR UPDATE`);
      const payment = await tx.payment.findFirst({ where: { id: input.paymentId, booking: { isDemo: false } } });
      if (!payment || payment.status !== 'posted') throw new NotFoundException('Không tìm thấy khoản thanh toán đã ghi nhận');
      const [existing, completed] = await Promise.all([
        tx.refund.aggregate({ where: { paymentId: payment.id, status: { in: ACTIVE_REFUND_STATUSES } }, _sum: { amountVnd: true } }),
        tx.payment.aggregate({ where: { id: payment.id, status: 'posted' }, _sum: { amountVnd: true } }),
      ]);
      if (BigInt(input.amountVnd) + (existing._sum.amountVnd ?? 0n) > (completed._sum.amountVnd ?? 0n)) throw new ConflictException('Tổng tiền hoàn vượt quá số tiền đã thanh toán');
      const refund = await tx.refund.create({ data: { paymentId: payment.id, amountVnd: BigInt(input.amountVnd), reason: input.reason.trim(), status: 'requested' } });
      await this.audit(tx, actorId, 'refund.requested', 'refund', refund.id, { paymentId: payment.id, amountVnd: refund.amountVnd.toString() });
      return this.serialize(refund);
    });
  }

  async updateRefund(id: string, input: UpdateRefundDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT p.id FROM payments p JOIN refunds r ON r.payment_id = p.id WHERE r.id = ${id}::uuid FOR UPDATE OF p`);
      const refund = await tx.refund.findFirst({ where: { id, payment: { booking: { isDemo: false } } } });
      if (!refund) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
      const allowed = (refund.status === 'requested' && ['approved', 'rejected'].includes(input.status)) || (refund.status === 'approved' && input.status === 'settled');
      if (!allowed) throw new ConflictException(`Không thể chuyển hoàn tiền từ ${refund.status} sang ${input.status}`);
      const updated = await tx.refund.update({ where: { id }, data: { status: input.status, approvedById: actorId, externalReference: input.externalReference?.trim() || refund.externalReference, settledAt: input.status === 'settled' ? new Date() : null } });
      await this.audit(tx, actorId, 'refund.status_changed', 'refund', id, { from: refund.status, to: input.status, amountVnd: refund.amountVnd.toString() });
      return this.serialize(updated);
    });
  }

  async report(query: ReportQuery) {
    const todayKey = localBusinessDate();
    const fromLabel = query.from ? dateKey(dateOnly(query.from)) : `${todayKey.slice(0, 7)}-01`;
    const toLabel = query.to ? dateKey(addDays(dateOnly(query.to), 1)) : dateKey(addDays(dateOnly(todayKey), 1));
    const from = localBusinessInstant(fromLabel);
    const to = localBusinessInstant(toLabel);
    const fromStayDate = dateOnly(fromLabel);
    const toStayDate = dateOnly(toLabel);
    if (to <= from || (to.getTime() - from.getTime()) / 86_400_000 > 366) throw new BadRequestException('Khoảng báo cáo phải trong vòng 366 ngày');
    if (query.propertyId && query.roomTypeId) {
      const room = await this.prisma.roomType.findUnique({ where: { id: query.roomTypeId }, select: { propertyId: true } });
      if (!room || room.propertyId !== query.propertyId) throw new BadRequestException('Hạng phòng không thuộc nơi lưu trú đã chọn');
    }
    const lineScope: Prisma.BookingLineListRelationFilter | undefined = query.roomTypeId
      ? { some: { roomTypeId: query.roomTypeId, ...(query.propertyId ? { roomType: { propertyId: query.propertyId } } : {}) } }
      : query.propertyId ? { some: { roomType: { propertyId: query.propertyId } } } : undefined;
    const bookingWhere: Prisma.BookingWhereInput = {
      isDemo: false,
      createdAt: { gte: from, lt: to },
      ...(query.status ? { bookingStatus: query.status } : {}),
      ...(lineScope ? { lines: lineScope } : {}),
    };
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: 'posted', postedAt: { gte: from, lt: to },
      booking: { isDemo: false, ...(lineScope ? { lines: lineScope } : {}) },
    };
    const refundWhere: Prisma.RefundWhereInput = {
      status: 'settled', settledAt: { gte: from, lt: to },
      payment: { booking: { isDemo: false, ...(lineScope ? { lines: lineScope } : {}) } },
    };
    const inventoryRoomFilter = query.roomTypeId
      ? Prisma.sql`AND room_type_id = ${query.roomTypeId}::uuid`
      : query.propertyId
        ? Prisma.sql`AND room_type_id IN (SELECT id FROM room_types WHERE property_id = ${query.propertyId}::uuid)`
        : Prisma.empty;
    const [bookingStatus, payments, refunds, inquiries, sources, inventory, content, customerCount] = await Promise.all([
      this.prisma.booking.groupBy({ by: ['bookingStatus'], where: bookingWhere, _count: { _all: true }, _sum: { totalVnd: true } }),
      this.prisma.payment.aggregate({ where: paymentWhere, _sum: { amountVnd: true }, _count: { _all: true } }),
      this.prisma.refund.aggregate({ where: refundWhere, _sum: { amountVnd: true }, _count: { _all: true } }),
      this.prisma.inquiry.groupBy({ by: ['stage'], where: { isDemo: false, createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.customer.groupBy({ by: ['source'], where: { isDemo: false, createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.$queryRaw<Array<{ capacity: bigint; blocked: bigint; held: bigint; reserved: bigint; available: bigint; days: bigint }>>(Prisma.sql`
        SELECT COALESCE(SUM(d.capacity),0)::bigint AS capacity,
          COALESCE(SUM(d.blocked_count),0)::bigint AS blocked,
          COALESCE(SUM(d.held_count),0)::bigint AS held,
          COALESCE(SUM(d.reserved_count),0)::bigint AS reserved,
          COALESCE(SUM(CASE WHEN d.stop_sell THEN 0 ELSE GREATEST(d.capacity - d.blocked_count - d.held_count - d.reserved_count, 0) END),0)::bigint AS available,
          COUNT(*)::bigint AS days
        FROM inventory_days d
        JOIN room_types rt ON rt.id = d.room_type_id
        JOIN properties p ON p.id = rt.property_id
        JOIN content_nodes cn ON cn.id = p.content_id AND cn.is_demo = false
        WHERE d.stay_date >= ${fromStayDate}::date AND d.stay_date < ${toStayDate}::date ${inventoryRoomFilter}`),
      this.prisma.contentNode.groupBy({ by: ['publicationStatus'], where: { isDemo: false, createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      this.prisma.customer.count({ where: { isDemo: false, createdAt: { gte: from, lt: to } } }),
    ]);
    const rooms = inventory[0];
    const totalBookings = bookingStatus.reduce((sum, row) => sum + row._count._all, 0);
    const inquiryTotal = inquiries.reduce((sum, row) => sum + row._count._all, 0);
    const won = inquiries.find((row) => row.stage === 'won')?._count._all ?? 0;
    return {
      from: fromLabel, toExclusive: toLabel, timezone: 'Asia/Ho_Chi_Minh',
      bookingSummary: { total: totalBookings, byStatus: bookingStatus.map((row) => ({ status: row.bookingStatus, count: row._count._all, bookingValueVnd: (row._sum.totalVnd ?? 0n).toString() })) },
      revenueSummary: { postedPaymentsVnd: (payments._sum.amountVnd ?? 0n).toString(), settledRefundsVnd: (refunds._sum.amountVnd ?? 0n).toString(), netCashVnd: ((payments._sum.amountVnd ?? 0n) - (refunds._sum.amountVnd ?? 0n)).toString(), paymentCount: payments._count._all, refundCount: refunds._count._all },
      inquiryConversion: { total: inquiryTotal, won, conversionBps: inquiryTotal ? Math.round(won * 10_000 / inquiryTotal) : 0, byStage: inquiries.map((row) => ({ stage: row.stage, count: row._count._all })) },
      inventory: { listedRoomNights: String(rooms?.days ?? 0n), capacity: String(rooms?.capacity ?? 0n), blocked: String(rooms?.blocked ?? 0n), held: String(rooms?.held ?? 0n), reserved: String(rooms?.reserved ?? 0n), available: String(rooms?.available ?? 0n) },
      customerAcquisition: { total: customerCount, bySource: sources.map((row) => ({ source: row.source, count: row._count._all })) },
      contentPublication: Object.fromEntries(content.map((row) => [row.publicationStatus, row._count._all])),
      sources: ['bookings', 'payments', 'refunds', 'inquiries', 'customers', 'inventory_days', 'content_nodes'],
      scope: { bookingsPaymentsRefundsInventory: { propertyId: query.propertyId ?? null, roomTypeId: query.roomTypeId ?? null }, inquiryCustomerContent: 'global; these records are not linked to an individual room type/property in the current schema' },
    };
  }

  async expireHolds(): Promise<number> {
    const now = new Date();
    const run = await this.prisma.jobRun.create({ data: { jobKind: 'expire_booking_holds', status: 'running' } });
    let processed = 0;
    let errors = 0;
    const bookings = await this.prisma.booking.findMany({ where: { bookingStatus: 'pending_confirmation', isDemo: false, expiresAt: { lte: now } }, select: { id: true }, orderBy: { id: 'asc' }, take: 200 });
    for (const { id } of bookings) {
      try {
        const didExpire = await this.expireBooking(id, now);
        if (didExpire) processed++;
      } catch (error) {
        errors++;
        this.logger.error(`Could not expire hold for booking ${id}`, error instanceof Error ? error.stack : String(error));
      }
    }
    await this.prisma.jobRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: errors ? 'completed_with_errors' : 'completed', processed, errors } });
    return processed;
  }

  private async expireBooking(id: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM bookings WHERE id = ${id}::uuid FOR UPDATE`);
      const booking = await tx.booking.findUnique({ where: { id }, include: { lines: { include: { reservations: { include: { nights: true } } } }, redemptions: true } });
      if (!booking || booking.bookingStatus !== 'pending_confirmation' || !booking.expiresAt || booking.expiresAt > now) return false;
      const reservations = booking.lines.flatMap((line) => line.reservations);
      const nights = reservations.flatMap((reservation) => reservation.nights).sort((a, b) => a.roomTypeId.localeCompare(b.roomTypeId) || a.stayDate.getTime() - b.stayDate.getTime());
      await this.lockInventoryRows(tx, nights.map((night) => ({ roomTypeId: night.roomTypeId, stayDate: night.stayDate })));
      await this.releaseReservations(tx, reservations, nights);
      await this.releaseCouponReservations(tx, booking.redemptions);
      await tx.booking.update({ where: { id }, data: { bookingStatus: 'expired', cancelledAt: now, cancelReason: 'hold_expired', version: { increment: 1 } } });
      await tx.bookingEvent.create({ data: { bookingId: id, fromStatus: booking.bookingStatus, toStatus: 'expired', eventType: 'hold_expired', actorLabel: 'Tác vụ nền', detail: 'Giữ chỗ hết hạn; quỹ phòng được giải phóng một lần.' } });
      await this.audit(tx, null, 'booking.hold_expired', 'booking', id, { reservationCount: reservations.length });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async releaseReservations(tx: Tx, reservations: Array<{ id: string; status: string; nights: Array<{ roomTypeId: string; stayDate: Date; quantity: number }> }>, nights: Array<{ roomTypeId: string; stayDate: Date }>) {
    await this.inventoryMutations.releaseReservationRows(tx, reservations);
    void nights;
  }

  private async releaseCouponReservations(tx: Tx, redemptions: Array<{ id: string; couponId: string; status: string }>) {
    for (const redemption of redemptions) {
      if (redemption.status !== 'reserved') continue;
      const changed = await tx.couponRedemption.updateMany({ where: { id: redemption.id, status: 'reserved' }, data: { status: 'released', releasedAt: new Date() } });
      if (changed.count) await tx.coupon.update({ where: { id: redemption.couponId }, data: { reservedUses: { decrement: 1 }, version: { increment: 1 } } });
    }
  }

  private canTransition(from: string, to: string): boolean {
    return canTransitionBookingStatus(from, to);
  }

  private async bookingView(db: Tx | PrismaService, id: string) {
    const booking = await db.booking.findUnique({ where: { id }, include: {
      customer: true, lines: { include: { reservations: { include: { nights: true } } } },
      payments: { include: { verifiedBy: { select: { fullName: true } }, refunds: { include: { approvedBy: { select: { fullName: true } } } } }, orderBy: { postedAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, include: { actor: { select: { fullName: true } } } },
      notes: { orderBy: { createdAt: 'desc' }, include: { booking: { select: { publicCode: true } } } }, redemptions: true,
    } });
    if (!booking || booking.isDemo) throw new NotFoundException('Không tìm thấy đơn đặt phòng');
    return this.serialize(booking);
  }

  private async assertAvailability(db: Tx | PrismaService, roomTypeId: string, dates: Date[], quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new BadRequestException('Số phòng phải từ 1 đến 20');
    const rows = await db.inventoryDay.findMany({ where: { roomTypeId, stayDate: { in: dates } } });
    const byDay = new Map(rows.map((row) => [dateKey(row.stayDate), row]));
    const incidents = await db.inventoryIntegrityIncident.findMany({ where: { roomTypeId, stayDate: { in: dates }, resolvedAt: null }, select: { stayDate: true } });
    const incidentDays = new Set(incidents.map((row) => dateKey(row.stayDate)));
    const freshness = await this.settings.get<{ nearTermDays?: number; nearTermFreshHours?: number; fartherFreshDays?: number }>('inventory.freshness');
    const now = Date.now();
    for (const stayDate of dates) {
      const day = dateKey(stayDate);
      const row = byDay.get(day);
      if (!row) throw new ConflictException(`Chưa mở bán tồn phòng ngày ${dateKey(stayDate)}`);
      validateInventoryInvariant(row);
      if (incidentDays.has(day)) throw new ConflictException(`Tồn phòng ngày ${day} đang cần quản trị viên xác minh.`);
      const nearTerm = (stayDate.getTime() - now) / 86_400_000 <= (freshness.nearTermDays ?? 7);
      const maxAgeMs = (nearTerm ? freshness.nearTermFreshHours ?? 24 : (freshness.fartherFreshDays ?? 7) * 24) * 3_600_000;
      if (!row.lastConfirmedAt || now - row.lastConfirmedAt.getTime() > maxAgeMs) throw new ConflictException(`Tồn phòng ngày ${day} đã cũ hoặc chưa được cơ sở xác nhận; cần kiểm tra lại trước khi tiếp tục.`);
      const available = availableRaw(row);
      if (row.stopSell || available < quantity) throw new ConflictException(`Không đủ phòng ngày ${day}; còn ${row.stopSell ? 0 : available}`);
    }
  }

  private async lockInventory(tx: Tx, roomTypeId: string, dates: Date[]) {
    const unique = [...new Map(dates.map((date) => [`${roomTypeId}:${dateKey(date)}`, { roomTypeId, stayDate: date }])).values()];
    await this.lockInventoryRows(tx, unique);
  }

  private async lockInventoryRows(tx: Tx, rows: Array<{ roomTypeId: string; stayDate: Date }>) {
    await this.inventoryMutations.lockRows(tx, rows);
  }

  private async idempotent<T>(principal: string, operation: string, key: string, input: unknown, work: (tx: Tx) => Promise<T>, isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable): Promise<T> {
    if (!key || key.length < 8 || key.length > 160) throw new BadRequestException('Thiếu Idempotency-Key hợp lệ');
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const fetchExisting = async (): Promise<T | null> => {
      const existing = await this.prisma.idempotencyKey.findUnique({ where: { principalScope_operation_key: { principalScope: principal, operation, key } } });
      if (!existing) return null;
      if (existing.requestHash !== requestHash) throw new ConflictException('Idempotency-Key đã được dùng với dữ liệu khác');
      if (existing.responseSnapshot === null) throw new ConflictException('Yêu cầu đang được xử lý; hãy thử lại cùng Idempotency-Key');
      return existing.responseSnapshot as T;
    };
    const prior = await fetchExisting();
    if (prior !== null) return prior;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.idempotencyKey.findUnique({ where: { principalScope_operation_key: { principalScope: principal, operation, key } } });
        if (existing) {
          if (existing.requestHash !== requestHash) throw new ConflictException('Idempotency-Key đã được dùng với dữ liệu khác');
          if (existing.responseSnapshot === null) throw new ConflictException('Yêu cầu đang được xử lý; hãy thử lại cùng Idempotency-Key');
          return existing.responseSnapshot as T;
        }
        const record = await tx.idempotencyKey.create({ data: { principalScope: principal, operation, key, requestHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
        const result = await work(tx);
        await tx.idempotencyKey.update({ where: { id: record.id }, data: { responseSnapshot: jsonSafe(result) } });
        return result;
      }, { isolationLevel });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await fetchExisting();
        if (replay !== null) return replay;
      }
      throw error;
    }
  }

  private couponDiscount(coupon: { discountType: string; percentBps: number | null; amountVnd: bigint | null; maxDiscountVnd: bigint | null }, subtotal: bigint): bigint {
    return calculateCouponDiscount(coupon, subtotal);
  }

  private async findValidCoupon(db: Tx | PrismaService, code: string, subtotal: bigint, now: Date, customerId: string | null) {
    const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.active || !activeDate(coupon.startsAt, now) || coupon.endsAt && coupon.endsAt <= now) throw new BadRequestException('Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực');
    if (coupon.minSubtotalVnd !== null && subtotal < coupon.minSubtotalVnd) throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu của mã');
    if (coupon.usageLimit !== null && coupon.committedUses + coupon.reservedUses >= coupon.usageLimit) throw new ConflictException('Mã khuyến mãi đã hết lượt');
    if (customerId) await this.assertCouponQuota(db as Tx, coupon, customerId);
    return coupon;
  }

  private async assertCouponQuota(tx: Tx, coupon: { id: string; usageLimit: number | null; perCustomerLimit: number | null; reservedUses: number; committedUses: number }, customerId: string) {
    const locked = await tx.coupon.findUnique({ where: { id: coupon.id } });
    if (!locked) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
    if (locked.usageLimit !== null && locked.committedUses + locked.reservedUses >= locked.usageLimit) throw new ConflictException('Mã khuyến mãi đã hết lượt');
    if (locked.perCustomerLimit !== null) {
      const used = await tx.couponRedemption.count({ where: { couponId: locked.id, booking: { customerId }, status: { in: ['reserved', 'committed'] } } });
      if (used >= locked.perCustomerLimit) throw new ConflictException('Khách hàng đã dùng hết lượt của mã này');
    }
  }

  private validateCouponInput(input: CreateCouponDto) {
    if (input.discountType === 'percent' && (!input.percentBps || input.amountVnd)) throw new BadRequestException('Mã phần trăm cần percentBps và không nhận amountVnd');
    if (input.discountType === 'fixed' && (!input.amountVnd || input.percentBps)) throw new BadRequestException('Mã giảm tiền cần amountVnd và không nhận percentBps');
    if (input.startsAt && input.endsAt && new Date(input.startsAt) >= new Date(input.endsAt)) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
  }

  private couponData(input: Partial<CreateCouponDto>): Prisma.CouponUncheckedCreateInput {
    return {
      code: input.code!.trim().toUpperCase(), name: input.name!.trim(), discountType: input.discountType!,
      percentBps: input.percentBps ?? null, amountVnd: input.amountVnd ? BigInt(input.amountVnd) : null,
      maxDiscountVnd: input.maxDiscountVnd ? BigInt(input.maxDiscountVnd) : null,
      minSubtotalVnd: input.minSubtotalVnd ? BigInt(input.minSubtotalVnd) : null,
      usageLimit: input.usageLimit ?? null, perCustomerLimit: input.perCustomerLimit ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null, endsAt: input.endsAt ? new Date(input.endsAt) : null,
      active: input.active ?? true,
    };
  }

  private async ensureCustomerInquiry(tx: Tx, customerId: string, inquiryId: string | undefined, actorId: string) {
    if (inquiryId) {
      const inquiry = await tx.inquiry.findFirst({ where: { id: inquiryId, customerId, isDemo: false }, select: { id: true } });
      if (!inquiry) throw new NotFoundException('Không tìm thấy yêu cầu của khách này');
      return inquiry.id;
    }
    const latest = await tx.inquiry.findFirst({ where: { customerId, isDemo: false }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (latest) return latest.id;
    const inquiry = await tx.inquiry.create({ data: { customerId, ownerUserId: actorId, stage: 'new', source: 'admin_crm', intent: 'follow_up', adults: 1, children: 0, message: 'Yêu cầu nội bộ tạo để ghi nhận chăm sóc khách hàng.' } });
    await tx.inquiryStageHistory.create({ data: { inquiryId: inquiry.id, toStage: 'new', actorId, note: 'Tạo từ hồ sơ CRM.' } });
    return inquiry.id;
  }

  private async requireCustomer(customerId: string) { await this.requireCustomerTx(this.prisma, customerId); }
  private async requireCustomerTx(db: Tx | PrismaService, customerId: string) {
    const customer = await db.customer.findUnique({ where: { id: customerId }, select: { id: true, isDemo: true } });
    if (!customer || customer.isDemo) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  private async audit(tx: Tx, actorId: string | null, action: string, entityType: string, entityId: string, diff: unknown) {
    await tx.auditLog.create({ data: { actorId: actorId ?? undefined, action, entityType, entityId, diff: jsonSafe(diff) } });
  }

  private serialize<T>(value: T): T {
    return JSON.parse(JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'bigint') return item.toString();
      if (item instanceof Date) return item.toISOString();
      return item;
    })) as T;
  }
}
