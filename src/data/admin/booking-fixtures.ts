/**
 * Booking, payment, inquiry and follow-up fixtures.
 *
 * Bookings are generated from per-unit timelines so the calendar, the occupancy
 * donut and the inventory table can never disagree with the list: a unit is
 * occupied for the nights [checkIn, checkOut) of exactly one active booking.
 */
import type {
  Booking,
  BookingChannel,
  BookingLine,
  Customer,
  FollowUp,
  Inquiry,
  Interaction,
  PaymentRecord,
  Property,
  RoomType,
  RoomUnit,
} from '@/lib/admin/types';
import { addDays, DEMO_TODAY, diffDays, mulberry32 } from './fixture-clock';
import { STAFF } from './fixtures';

const RANGE_FROM = '2024-11-01';
const RANGE_TO = '2024-11-30';
const TOTAL_BOOKINGS = 245;
/** Room stays kept from the generated timelines; the rest of the month is combo demand. */
const ROOM_BOOKINGS = 205;
/** Units occupied on the demo date (2 more are under maintenance, 2 are free). */
const OCCUPIED_TODAY = 14;

const CHANNELS: BookingChannel[] = ['website', 'website', 'website', 'facebook', 'direct', 'booking_com', 'agoda'];

const ADDONS: [string, string, number][] = [
  ['Bữa sáng bản địa', 'suất', 150000],
  ['Xe đón tiễn', 'lượt', 300000],
  ['Tour rừng Cúc Phương', 'khách', 450000],
  ['Thuê xe đạp', 'ngày', 50000],
];

export interface BookingFixtureInput {
  properties: Property[];
  roomTypes: RoomType[];
  roomUnits: RoomUnit[];
  customers: Customer[];
  combos: { id: string; name: string; price: number; days: number; nights: number }[];
  maintenanceUnitIds: string[];
}

const money = (lines: BookingLine[]) => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

export function buildBookings(input: BookingFixtureInput): { bookings: Booking[]; payments: PaymentRecord[] } {
  const { roomTypes, roomUnits, customers, combos, maintenanceUnitIds } = input;
  const rnd = mulberry32(1511);
  const typeById = new Map(roomTypes.map((t) => [t.id, t]));
  const sellable = roomUnits.filter((u) => !maintenanceUnitIds.includes(u.id));

  interface Stay {
    unit: RoomUnit;
    checkIn: string;
    checkOut: string;
  }
  const stays: Stay[] = [];

  sellable.forEach((unit, idx) => {
    // The first OCCUPIED_TODAY units host a stay that covers the demo date, so
    // today's occupancy is a fixed number the donut and the calendar agree on.
    const anchor = idx < OCCUPIED_TODAY ? { start: addDays(DEMO_TODAY, -(idx % 3) - 1), nights: 2 + (idx % 3) } : null;
    let cursor = RANGE_FROM;
    while (cursor < RANGE_TO) {
      const nights = 1 + Math.floor(rnd() * 3);
      const gap = rnd() < 0.62 ? 0 : 1 + Math.floor(rnd() * 2);
      const checkIn = addDays(cursor, gap);
      const checkOut = addDays(checkIn, nights);
      if (checkIn >= RANGE_TO) break;
      const clashesAnchor = anchor && checkIn < addDays(anchor.start, anchor.nights) && checkOut > anchor.start;
      if (clashesAnchor) {
        cursor = addDays(anchor.start, anchor.nights);
        continue;
      }
      stays.push({ unit, checkIn, checkOut: checkOut > addDays(RANGE_TO, 3) ? addDays(RANGE_TO, 3) : checkOut });
      cursor = checkOut;
    }
    if (anchor) stays.push({ unit, checkIn: anchor.start, checkOut: addDays(anchor.start, anchor.nights) });
  });

  stays.sort((a, b) => (a.checkIn === b.checkIn ? a.unit.id.localeCompare(b.unit.id) : a.checkIn.localeCompare(b.checkIn)));
  // Keep every stay that covers the demo date, then trim to the room-booking cap.
  const covering = stays.filter((s) => s.checkIn <= DEMO_TODAY && s.checkOut > DEMO_TODAY);
  const rest = stays.filter((s) => !(s.checkIn <= DEMO_TODAY && s.checkOut > DEMO_TODAY));
  // Sample the remaining stays evenly across the month so past and future keep
  // a realistic balance after trimming.
  const want = Math.max(0, ROOM_BOOKINGS - covering.length);
  const stride = rest.length / Math.max(1, want);
  const kept = [...covering, ...Array.from({ length: Math.min(want, rest.length) }, (_, i) => rest[Math.floor(i * stride)])];
  kept.sort((a, b) => (a.checkIn === b.checkIn ? a.unit.id.localeCompare(b.unit.id) : a.checkIn.localeCompare(b.checkIn)));
  stays.length = 0;
  stays.push(...kept);

  const bookings: Booking[] = [];
  const payments: PaymentRecord[] = [];
  let seq = 2401;
  const nextCode = () => `#DP${seq++}`;

  const pushBooking = (b: Omit<Booking, 'id' | 'code'>) => {
    const code = nextCode();
    bookings.push({ ...b, id: code.slice(1).toLowerCase(), code });
  };

  const guestsFor = (max: number) => {
    const adults = Math.min(max, 1 + Math.floor(rnd() * 2) + 1);
    const children = rnd() < 0.3 ? Math.min(2, max - adults) : 0;
    return { adults, children: Math.max(0, children) };
  };

  stays.forEach((s, i) => {
    const type = typeById.get(s.unit.roomTypeId)!;
    const customer = customers[(i * 7) % customers.length];
    const nights = diffDays(s.checkIn, s.checkOut);
    const { adults, children } = guestsFor(type.capacityMax);
    const lines: BookingLine[] = [
      { kind: 'room', refId: type.id, label: `${type.name} × ${nights} đêm`, unit: 'đêm', quantity: nights, unitPrice: type.basePrice },
    ];
    if (rnd() < 0.35) {
      const [label, unit, price] = ADDONS[Math.floor(rnd() * ADDONS.length)];
      lines.push({ kind: 'addon', refId: null, label, unit, quantity: adults + children, unitPrice: price });
    }
    pushBooking({
      customerId: customer.id,
      propertyId: type.propertyId,
      roomTypeId: type.id,
      comboId: null,
      createdAt: addDays(s.checkIn, -(2 + Math.floor(rnd() * 12))),
      checkIn: s.checkIn,
      checkOut: s.checkOut,
      rooms: 1,
      adults,
      children,
      lines,
      status: 'confirmed',
      paymentStatus: 'unpaid',
      channel: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
      note: '',
      history: [],
      internalNotes: [],
    });
  });

  // Combo bookings do not hold room inventory in the demo (documented simplification).
  while (bookings.length < TOTAL_BOOKINGS) {
    const combo = combos[Math.floor(rnd() * combos.length)];
    const customer = customers[Math.floor(rnd() * customers.length)];
    const checkIn = addDays(RANGE_FROM, Math.floor(rnd() * 29));
    const guests = 2 + Math.floor(rnd() * 4);
    pushBooking({
      customerId: customer.id,
      propertyId: null,
      roomTypeId: null,
      comboId: combo.id,
      createdAt: addDays(checkIn, -(3 + Math.floor(rnd() * 14))),
      checkIn,
      checkOut: addDays(checkIn, combo.nights),
      rooms: 1,
      adults: guests,
      children: 0,
      lines: [{ kind: 'combo', refId: combo.id, label: `${combo.name} (${combo.days}N${combo.nights}Đ)`, unit: 'khách', quantity: guests, unitPrice: combo.price }],
      status: 'confirmed',
      paymentStatus: 'unpaid',
      channel: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
      note: '',
      history: [],
      internalNotes: [],
    });
  }

  bookings.sort((a, b) => (a.checkIn === b.checkIn ? a.code.localeCompare(b.code) : a.checkIn.localeCompare(b.checkIn)));
  bookings.forEach((b, i) => {
    const code = `#DP${2401 + i}`;
    b.code = code;
    b.id = code.slice(1).toLowerCase();
  });

  // Status follows the demo clock: nothing in the future is "completed" and a
  // stay that has not started cannot be "checked in".
  let pendingLeft = 28;
  let cancelLeft = 11;
  for (const b of bookings) {
    const startsLater = b.checkIn > DEMO_TODAY;
    const ended = b.checkOut <= DEMO_TODAY;
    if (cancelLeft > 0 && rnd() < 0.05) {
      b.status = 'cancelled';
      b.cancelReason = ['Khách đổi lịch', 'Khách báo bận đột xuất', 'Không liên hệ được khách'][Math.floor(rnd() * 3)];
      cancelLeft--;
      continue;
    }
    if (startsLater) {
      if (pendingLeft > 0 && rnd() < 0.3) {
        b.status = 'pending_confirmation';
        pendingLeft--;
      } else b.status = 'confirmed';
    } else if (ended) b.status = 'completed';
    else b.status = 'checked_in';
  }
  // Keep the pending/cancelled targets exact whatever the random walk did.
  for (const b of bookings) {
    if (pendingLeft <= 0) break;
    if (b.status === 'confirmed' && b.checkIn > DEMO_TODAY) {
      b.status = 'pending_confirmation';
      pendingLeft--;
    }
  }
  for (const b of bookings) {
    if (cancelLeft <= 0) break;
    if (b.status === 'confirmed' && b.checkIn > DEMO_TODAY) {
      b.status = 'cancelled';
      b.cancelReason = 'Khách đổi lịch';
      cancelLeft--;
    }
  }

  // Payments: completed stays are settled, on-going and confirmed ones carry a
  // deposit, pending ones are unpaid. 30% deposit like the public checkout.
  bookings.forEach((b, i) => {
    const total = money(b.lines);
    if (b.status === 'cancelled') {
      b.paymentStatus = i % 3 === 0 ? 'refunded' : 'unpaid';
      if (b.paymentStatus === 'refunded') {
        payments.push({ id: `pm-${b.id}-1`, bookingId: b.id, at: `${b.createdAt}T09:00:00+07:00`, amount: Math.round(total * 0.3), method: 'bank_transfer', kind: 'payment', reference: `DEMO-${b.code.slice(1)}` });
        payments.push({ id: `pm-${b.id}-2`, bookingId: b.id, at: `${addDays(b.createdAt, 1)}T09:00:00+07:00`, amount: Math.round(total * 0.3), method: 'bank_transfer', kind: 'refund', reference: `DEMO-RF-${b.code.slice(1)}` });
      }
      return;
    }
    if (b.status === 'completed' || (b.status === 'checked_in' && i % 3 !== 0)) {
      b.paymentStatus = 'paid';
      payments.push({ id: `pm-${b.id}-1`, bookingId: b.id, at: `${b.checkIn}T14:30:00+07:00`, amount: total, method: i % 2 ? 'bank_transfer' : 'cash', kind: 'payment', reference: `DEMO-${b.code.slice(1)}` });
      return;
    }
    if (b.status === 'pending_confirmation') {
      b.paymentStatus = 'unpaid';
      return;
    }
    b.paymentStatus = i % 2 === 0 ? 'partially_paid' : 'unpaid';
    if (b.paymentStatus === 'partially_paid') {
      payments.push({ id: `pm-${b.id}-1`, bookingId: b.id, at: `${b.createdAt}T10:15:00+07:00`, amount: Math.round((total * 0.3) / 1000) * 1000, method: 'bank_transfer', kind: 'payment', reference: `DEMO-${b.code.slice(1)}` });
    }
  });

  for (const b of bookings) {
    b.history = [
      { at: `${b.createdAt}T08:30:00+07:00`, text: `Đơn được tạo từ ${channelLabel(b.channel)}`, author: 'Hệ thống' },
      ...(b.status !== 'pending_confirmation'
        ? [{ at: `${addDays(b.createdAt, 1)}T09:10:00+07:00`, text: 'Đã xác nhận với khách qua điện thoại', author: 'Đinh Vân' }]
        : []),
      ...(b.status === 'cancelled' ? [{ at: `${addDays(b.createdAt, 2)}T15:00:00+07:00`, text: `Đã hủy: ${b.cancelReason}`, author: 'Đinh Vân' }] : []),
    ];
  }

  return { bookings, payments };
}

export function channelLabel(c: BookingChannel) {
  return { website: 'Website', facebook: 'Facebook', direct: 'Trực tiếp', booking_com: 'Booking.com', agoda: 'Agoda' }[c];
}

const INQUIRY_SEED: [string, Inquiry['stage'], string, string][] = [
  ['kh-001', 'consulting', 'Gia đình 4 người, cần tư vấn tour trong ngày...', '2024-11-15T09:24:00+07:00'],
  ['kh-002', 'won', 'Đã booking #DP2402', '2024-11-02T10:05:00+07:00'],
  ['kh-003', 'waiting', 'Tư vấn phòng cho cặp đôi, cần không gian yên tĩnh...', '2024-11-14T18:30:00+07:00'],
  ['kh-004', 'won', 'Đã booking #DP2404', '2024-10-28T14:20:00+07:00'],
  ['kh-005', 'consulting', 'Tìm phòng view rừng', '2024-11-14T16:10:00+07:00'],
  ['kh-006', 'new', 'Cần tư vấn phòng cho nhóm 6 người', '2024-11-15T08:30:00+07:00'],
  ['kh-008', 'new', 'Tìm hiểu combo trekking', '2024-11-15T10:12:00+07:00'],
  ['kh-009', 'won', 'Đã booking #DP2389', '2024-10-18T09:00:00+07:00'],
  ['kh-010', 'consulting', 'Chờ khách quyết định', '2024-11-13T17:42:00+07:00'],
  ['kh-013', 'waiting', 'Đã gửi báo giá, chờ phản hồi', '2024-11-14T18:30:00+07:00'],
  ['kh-017', 'waiting', 'Chờ xác nhận ngày đi', '2024-11-14T12:15:00+07:00'],
  ['kh-020', 'new', 'Tư vấn cho gia đình', '2024-11-15T11:20:00+07:00'],
  ['kh-021', 'consulting', 'Hỏi về combo honeymoon', '2024-11-14T14:22:00+07:00'],
  ['kh-023', 'new', 'Nhóm bạn 8 người, cuối tháng 11', '2024-11-15T07:50:00+07:00'],
  ['kh-024', 'consulting', 'Cần phòng gia đình có trẻ nhỏ', '2024-11-13T09:05:00+07:00'],
  ['kh-026', 'won', 'Đã chốt combo 2N1Đ', '2024-11-05T15:30:00+07:00'],
  ['kh-027', 'new', 'Hỏi tình trạng phòng cuối tuần', '2024-11-15T06:40:00+07:00'],
  ['kh-028', 'consulting', 'Tư vấn lịch trình 3 ngày', '2024-11-12T20:10:00+07:00'],
  ['kh-029', 'won', 'Đã chốt team building', '2024-11-08T11:00:00+07:00'],
  ['kh-030', 'waiting', 'Chờ khách chuyển cọc', '2024-11-13T13:25:00+07:00'],
  ['kh-031', 'new', 'Cần tư vấn phòng dịp lễ', '2024-11-15T05:55:00+07:00'],
  ['kh-032', 'consulting', 'Hỏi về xe đưa đón', '2024-11-12T08:40:00+07:00'],
  ['kh-033', 'won', 'Đã chốt 2 phòng deluxe', '2024-11-06T09:45:00+07:00'],
  ['kh-034', 'waiting', 'Chờ phản hồi nhóm', '2024-11-11T16:05:00+07:00'],
  ['kh-035', 'new', 'Tư vấn combo cho công ty', '2024-11-14T22:10:00+07:00'],
  ['kh-036', 'consulting', 'Hỏi phòng còn trống 20/11', '2024-11-13T07:30:00+07:00'],
  ['kh-037', 'won', 'Đã chốt phòng bungalow', '2024-11-04T10:20:00+07:00'],
  ['kh-038', 'consulting', 'Tư vấn cho khách nước ngoài', '2024-11-12T14:00:00+07:00'],
  ['kh-039', 'won', 'Đã chốt combo gia đình', '2024-11-03T16:40:00+07:00'],
  ['kh-040', 'consulting', 'Hỏi ưu đãi tháng 12', '2024-11-11T09:15:00+07:00'],
  ['kh-041', 'waiting', 'Chờ khách chọn phòng', '2024-11-10T10:50:00+07:00'],
  ['kh-042', 'won', 'Đã chốt 1 đêm eco lodge', '2024-11-07T08:05:00+07:00'],
];

export function buildInquiries(): Inquiry[] {
  return INQUIRY_SEED.map(([customerId, stage, summary, createdAt], i) => ({
    id: `yc-${String(i + 1).padStart(3, '0')}`,
    customerId,
    createdAt,
    source: (['website', 'facebook', 'zalo', 'direct'] as const)[i % 4],
    stage,
    summary,
    ownerId: STAFF[i % STAFF.length].id,
    read: stage !== 'new' && i % 5 !== 0,
    priority: i < 5,
    bookingId: stage === 'won' ? null : null,
    resolvedAt: stage === 'won' ? createdAt : null,
  }));
}

export function buildInteractions(): Interaction[] {
  return [
    {
      id: 'tt-001',
      customerId: 'kh-001',
      inquiryId: 'yc-001',
      at: '2024-11-15T09:24:00+07:00',
      channel: 'zalo',
      direction: 'in',
      author: 'Nguyễn Thị Mai',
      text: 'Chào bạn, mình muốn tư vấn combo 2N1Đ cho gia đình có trẻ nhỏ, cuối tuần này còn phòng không ạ?',
    },
    {
      id: 'tt-002',
      customerId: 'kh-001',
      inquiryId: 'yc-001',
      at: '2024-11-15T10:15:00+07:00',
      channel: 'zalo',
      direction: 'out',
      author: 'Đinh Vân',
      text: 'Dạ em chào chị! Cúc Phương hiện còn phòng cuối tuần 22-24/11, rất phù hợp cho gia đình có bé ạ. Em gửi chị một số combo để tham khảo nhé!',
    },
    {
      id: 'tt-003',
      customerId: 'kh-001',
      inquiryId: 'yc-001',
      at: '2024-11-15T11:02:00+07:00',
      channel: 'zalo',
      direction: 'in',
      author: 'Nguyễn Thị Mai',
      text: 'Tuyệt vời, bạn gửi giúp mình nhé. Mình quan tâm loại có hoạt động cho trẻ em.',
    },
    {
      id: 'tt-004',
      customerId: 'kh-001',
      inquiryId: 'yc-001',
      at: '2024-11-15T11:20:00+07:00',
      channel: 'note',
      direction: 'internal',
      author: 'Đinh Vân',
      text: 'Ghi chú nội bộ: khách ưu tiên phòng yên tĩnh, có thể gợi ý Forest Homestay phòng Deluxe.',
    },
  ];
}

export function buildFollowUps(): FollowUp[] {
  return [
    { id: 'fu-001', customerId: 'kh-001', inquiryId: 'yc-001', date: '2024-11-18', time: '10:00', purpose: 'Gọi lại tư vấn combo', ownerId: 'u-dinh-van', done: false },
    { id: 'fu-002', customerId: 'kh-003', inquiryId: 'yc-003', date: '2024-11-16', time: '09:30', purpose: 'Gửi báo giá phòng cặp đôi', ownerId: 'u-le-thu-trang', done: false },
    { id: 'fu-003', customerId: 'kh-013', inquiryId: 'yc-010', date: '2024-11-14', time: '15:00', purpose: 'Nhắc khách phản hồi báo giá', ownerId: 'u-pham-hoang-nam', done: false },
  ];
}
