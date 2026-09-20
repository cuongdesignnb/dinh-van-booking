/**
 * Every number shown in the admin comes from these selectors, so a count in a
 * KPI card, a chart, a calendar and a table can never drift apart.
 */
import { addDays, coversNight, DEMO_TODAY, diffDays, eachDay, fromKey } from '@/data/admin/fixture-clock';
import type {
  AdminData,
  Booking,
  BookingStatus,
  InquiryStage,
  RateSettings,
  RoomType,
} from './types';

export interface Range {
  from: string;
  to: string;
}

export const bookingTotal = (b: Booking) => b.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

export const ACTIVE_STATUSES: BookingStatus[] = ['pending_confirmation', 'confirmed', 'checked_in', 'completed'];
/** A booking holds inventory unless it was cancelled. */
export const holdsInventory = (b: Booking) => b.status !== 'cancelled' && Boolean(b.roomTypeId);

export const inStayRange = (b: Booking, r: Range) => b.checkIn >= r.from && b.checkIn <= r.to;

export function bookingsInRange(data: AdminData, r: Range) {
  return data.bookings.filter((b) => inStayRange(b, r));
}

/* ------------------------------------------------------------- inventory */

export interface DayInventory {
  total: number;
  occupied: number;
  maintenance: number;
  blocked: number;
  free: number;
  rate: number;
}

export function inventoryForDay(data: AdminData, day: string, propertyId?: string): DayInventory {
  const types = data.roomTypes.filter((t) => !propertyId || t.propertyId === propertyId);
  const typeIds = new Set(types.map((t) => t.id));
  const total = types.reduce((s, t) => s + t.units, 0);
  let maintenance = 0;
  let blocked = 0;
  for (const o of data.inventoryOverrides) {
    if (o.date !== day || !typeIds.has(o.roomTypeId)) continue;
    if (o.flag === 'maintenance') maintenance += o.units;
    else blocked += o.units;
  }
  const occupied = data.bookings.filter(
    (b) => holdsInventory(b) && typeIds.has(b.roomTypeId!) && coversNight(b.checkIn, b.checkOut, day),
  ).length;
  const free = Math.max(0, total - occupied - maintenance - blocked);
  return { total, occupied, maintenance, blocked, free, rate: total ? (occupied / total) * 100 : 0 };
}

export function roomTypeAvailability(data: AdminData, roomTypeId: string, day: string) {
  const type = data.roomTypes.find((t) => t.id === roomTypeId);
  if (!type) return null;
  const overrides = data.inventoryOverrides.filter((o) => o.roomTypeId === roomTypeId && o.date === day);
  const maintenance = overrides.filter((o) => o.flag === 'maintenance').reduce((s, o) => s + o.units, 0);
  const blocked = overrides.filter((o) => o.flag === 'blocked').reduce((s, o) => s + o.units, 0);
  const booked = data.bookings.filter(
    (b) => holdsInventory(b) && b.roomTypeId === roomTypeId && coversNight(b.checkIn, b.checkOut, day),
  ).length;
  return {
    roomTypeId,
    name: type.name,
    units: type.units,
    booked,
    maintenance,
    blocked,
    free: Math.max(0, type.units - booked - maintenance - blocked),
    reasons: overrides.map((o) => o.reason).filter(Boolean),
  };
}

/** Room-nights sold / room-nights sellable over a period. */
export function occupancyForRange(data: AdminData, r: Range, propertyId?: string) {
  const days = eachDay(r.from, addDays(r.to, 1));
  let sellable = 0;
  let sold = 0;
  for (const d of days) {
    const inv = inventoryForDay(data, d, propertyId);
    sellable += inv.total - inv.maintenance - inv.blocked;
    sold += inv.occupied;
  }
  return { sold, sellable, rate: sellable ? (sold / sellable) * 100 : 0 };
}

/* --------------------------------------------------------------- revenue */

/** Demo revenue rule: the value of bookings whose stay ended inside the range. */
export function revenueForRange(data: AdminData, r: Range) {
  const done = data.bookings.filter((b) => b.status === 'completed' && b.checkOut >= r.from && b.checkOut <= addDays(r.to, 1));
  let rooms = 0;
  let combos = 0;
  let other = 0;
  for (const b of done) {
    for (const l of b.lines) {
      const value = l.quantity * l.unitPrice;
      if (l.kind === 'room') rooms += value;
      else if (l.kind === 'combo') combos += value;
      else other += value;
    }
  }
  return { rooms, combos, other, total: rooms + combos + other, bookings: done.length };
}

export function revenueByDay(data: AdminData, r: Range) {
  const days = eachDay(r.from, addDays(r.to, 1));
  return days.map((date) => {
    const done = data.bookings.filter((b) => b.status === 'completed' && b.checkOut === date);
    const expected = data.bookings.filter(
      (b) => b.checkOut === date && b.status !== 'completed' && b.status !== 'cancelled',
    );
    const created = data.bookings.filter((b) => b.createdAt === date);
    return {
      date,
      revenue: done.reduce((s, b) => s + bookingTotal(b), 0),
      expected: expected.reduce((s, b) => s + bookingTotal(b), 0),
      bookings: created.length,
    };
  });
}

/* ------------------------------------------------------------ bookings */

export function bookingCounts(data: AdminData, r: Range) {
  const list = bookingsInRange(data, r);
  const by = (s: BookingStatus) => list.filter((b) => b.status === s).length;
  return {
    pending: by('pending_confirmation'),
    confirmed: by('confirmed'),
    checkedIn: by('checked_in'),
    completed: by('completed'),
    cancelled: by('cancelled'),
    paid: list.filter((b) => b.paymentStatus === 'paid').length,
    total: list.length,
  };
}

export const createdOn = (data: AdminData, day: string) => data.bookings.filter((b) => b.createdAt === day);
export const checkInsOn = (data: AdminData, day: string) =>
  data.bookings.filter((b) => b.checkIn === day && b.status !== 'cancelled');
export const checkOutsOn = (data: AdminData, day: string) =>
  data.bookings.filter((b) => b.checkOut === day && b.status !== 'cancelled');

export function upcomingBookings(data: AdminData, from: string, limit: number) {
  return data.bookings
    .filter((b) => b.checkIn >= from && b.status !== 'cancelled')
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.code.localeCompare(b.code))
    .slice(0, limit);
}

export function pendingBookings(data: AdminData, limit?: number) {
  const list = data.bookings
    .filter((b) => b.status === 'pending_confirmation')
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  return typeof limit === 'number' ? list.slice(0, limit) : list;
}

export function paymentsOf(data: AdminData, bookingId: string) {
  const list = data.payments.filter((p) => p.bookingId === bookingId);
  const paid = list.filter((p) => p.kind === 'payment').reduce((s, p) => s + p.amount, 0);
  const refunded = list.filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0);
  return { list, paid, refunded, net: paid - refunded };
}

/* ----------------------------------------------------------- properties */

export function topProperties(data: AdminData, r: Range, limit = 5) {
  const counts = new Map<string, number>();
  for (const b of bookingsInRange(data, r)) {
    if (!b.propertyId || b.status === 'cancelled') continue;
    counts.set(b.propertyId, (counts.get(b.propertyId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ property: data.properties.find((p) => p.id === id)!, count }))
    .filter((x) => x.property)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function propertyStats(data: AdminData, r: Range, today = DEMO_TODAY) {
  const units = data.roomTypes.reduce((s, t) => s + t.units, 0);
  const inv = inventoryForDay(data, today);
  const nearlyFull = data.properties.filter((p) => {
    const i = inventoryForDay(data, today, p.id);
    return i.free <= 1 && i.total > 0;
  }).length;
  return {
    units,
    active: units - inv.maintenance,
    maintenance: inv.maintenance,
    nearlyFull,
    revenue: revenueForRange(data, r).rooms,
  };
}

/* ------------------------------------------------------------------ CRM */

export const inquiriesByStage = (data: AdminData, stage: InquiryStage) => data.inquiries.filter((i) => i.stage === stage);

export function crmStats(data: AdminData, r: Range) {
  const newCustomers = data.customers.filter((c) => c.createdAt >= r.from && c.createdAt <= r.to).length;
  const open = data.inquiries.filter((i) => i.stage !== 'won').length;
  const unread = data.inquiries.filter((i) => !i.read).length;
  const bookingsByCustomer = new Map<string, number>();
  for (const b of data.bookings) {
    if (b.status === 'cancelled') continue;
    bookingsByCustomer.set(b.customerId, (bookingsByCustomer.get(b.customerId) ?? 0) + 1);
  }
  const returning = [...bookingsByCustomer.values()].filter((n) => n > 1).length;
  const answered = data.inquiries.filter((i) => i.read).length;
  return {
    newCustomers,
    open,
    unread,
    returning,
    responseRate: data.inquiries.length ? (answered / data.inquiries.length) * 100 : 0,
    priorityToday: data.inquiries.filter((i) => i.priority).length,
  };
}

export function customerStats(data: AdminData, customerId: string) {
  const list = data.bookings.filter((b) => b.customerId === customerId && b.status !== 'cancelled');
  const value = list.reduce((s, b) => s + bookingTotal(b), 0);
  const last = list.map((b) => b.checkIn).sort().at(-1) ?? null;
  return { bookings: list, count: list.length, value, lastStay: last };
}

/* --------------------------------------------------------------- content */

export function contentStats(data: AdminData) {
  const missing = (d: { seo: { title: string; description: string; ogImage?: string | null } }) =>
    !d.seo.title || !d.seo.description || d.seo.ogImage === null;
  const needSeo =
    data.destinations.filter((d) => missing(d)).length + data.articles.filter((a) => !a.seo.description).length;
  return {
    publishedDestinations: data.destinations.filter((d) => d.publication === 'published').length,
    destinations: data.destinations.length,
    publishedArticles: data.articles.filter((a) => a.publication === 'published').length,
    articles: data.articles.length,
    media: data.media.length,
    mediaBytes: data.media.reduce((s, m) => s + m.bytes, 0),
    needSeo,
    views: data.destinations.reduce((s, d) => s + d.views, 0) + data.articles.reduce((s, a) => s + a.views, 0),
  };
}

export function seoChecklist(d: {
  name: string;
  shortDescription: string;
  image: string;
  category: string;
  content: string;
  tags: string[];
  seo: { title: string; description: string; ogImage: string | null };
}) {
  return [
    { id: 'name', label: 'Tên đã được nhập', ok: d.name.trim().length > 0 },
    { id: 'short', label: 'Mô tả ngắn (đủ độ dài)', ok: d.shortDescription.trim().length >= 60 },
    { id: 'cover', label: 'Ảnh đại diện (tối thiểu 1200×630)', ok: Boolean(d.image) },
    { id: 'category', label: 'Danh mục đã chọn', ok: Boolean(d.category) },
    { id: 'tags', label: 'Thẻ nội dung', ok: d.tags.length > 0 },
    { id: 'meta', label: 'Meta title & meta description', ok: Boolean(d.seo.title && d.seo.description) },
    { id: 'content', label: 'Nội dung chi tiết', ok: d.content.trim().length >= 120 },
    { id: 'og', label: 'Ảnh chia sẻ (OG image)', ok: Boolean(d.seo.ogImage) },
  ];
}

/* ----------------------------------------------------------------- rates */

export interface PriceBreakdown {
  price: number;
  base: number;
  rule: 'base' | 'weekend' | 'season';
  seasonName?: string;
  conflicts: string[];
}

/** Demo rule: season (highest priority) > weekend > base. Percentages never stack. */
export function priceForDate(type: RoomType, date: string, rates: RateSettings): PriceBreakdown {
  const day = fromKey(date).getDay();
  const weekend = rates.weekendEnabled && rates.weekendDays.includes(day);
  const base = weekend ? type.weekendPrice : type.basePrice;
  if (!rates.seasonalEnabled) return { price: base, base: type.basePrice, rule: weekend ? 'weekend' : 'base', conflicts: [] };
  const active = rates.seasons.filter((s) => s.enabled && date >= s.from && date <= s.to);
  if (!active.length) return { price: base, base: type.basePrice, rule: weekend ? 'weekend' : 'base', conflicts: [] };
  const top = [...active].sort((a, b) => b.priority - a.priority)[0];
  const conflicts = active.filter((s) => s.id !== top.id && s.priority === top.priority).map((s) => s.name);
  const price = top.kind === 'percent' ? Math.round((base * (100 + top.value)) / 100 / 1000) * 1000 : base + top.value;
  return { price, base: type.basePrice, rule: 'season', seasonName: top.name, conflicts };
}

export function seasonConflicts(rates: RateSettings) {
  const out: string[] = [];
  const list = rates.seasons.filter((s) => s.enabled);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.priority === b.priority && a.from <= b.to && b.from <= a.to) out.push(`${a.name} và ${b.name} trùng khoảng ngày cùng mức ưu tiên`);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- search */

export interface SearchHit {
  id: string;
  kind: 'booking' | 'customer' | 'property' | 'combo' | 'destination';
  title: string;
  meta: string;
  href: string;
}

export function searchAll(data: AdminData, query: string, limit = 8): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = q
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const match = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .includes(key);
  const hits: SearchHit[] = [];
  for (const b of data.bookings) {
    const customer = data.customers.find((c) => c.id === b.customerId);
    if (match(b.code) || (customer && (match(customer.name) || match(customer.phone)))) {
      hits.push({
        id: b.id,
        kind: 'booking',
        title: `${b.code} · ${customer?.name ?? 'Khách lẻ'}`,
        meta: `Nhận phòng ${b.checkIn.split('-').reverse().join('/')}`,
        href: `/admin/dat-phong?selected=${b.id}`,
      });
    }
    if (hits.length >= limit * 3) break;
  }
  for (const c of data.customers) {
    if (match(c.name) || match(c.phone)) {
      hits.push({ id: c.id, kind: 'customer', title: c.name, meta: `${c.need} · ${c.phone}`, href: `/admin/khach-hang?selected=${c.id}` });
    }
  }
  for (const p of data.properties) {
    if (match(p.name)) hits.push({ id: p.id, kind: 'property', title: p.name, meta: p.area, href: `/admin/phong-nghi?selected=${p.id}` });
  }
  for (const c of data.combos) {
    if (match(c.name)) hits.push({ id: c.id, kind: 'combo', title: c.name, meta: `${c.days}N${c.nights}Đ`, href: `/admin/combo-du-lich?selected=${c.id}` });
  }
  for (const d of data.destinations) {
    if (match(d.name)) hits.push({ id: d.id, kind: 'destination', title: d.name, meta: 'Điểm đến', href: `/admin/diem-den?selected=${d.id}` });
  }
  return hits.slice(0, limit);
}

/** Nights of a stay, `[checkIn, checkOut)`. */
export const nightsOf = (b: Booking) => Math.max(1, diffDays(b.checkIn, b.checkOut));
