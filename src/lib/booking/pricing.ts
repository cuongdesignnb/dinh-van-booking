/**
 * Pure price calculation for the booking draft. Every summary on the page
 * (desktop, mobile bar, review step) reads the same `PriceSummary`.
 * Integer VND only. Demo figures — the backend must be the final source of
 * truth for any real transaction.
 */

export type PaymentPlan = 'deposit' | 'full';
export type PaymentMethod = 'bank-transfer' | null;
export type AddOnId = 'breakfast' | 'airport-transfer' | 'forest-tour' | 'bike-rental';

export const DEPOSIT_RATE = 0.3;

export interface AddOnDef {
  id: AddOnId;
  name: string;
  unitPriceVnd: number;
  unitLabel: string;
  description: string;
  image: string;
  /** How the quantity field is interpreted (shown to the user). */
  quantityLabel: string;
  isDemo: true;
}

export const ADD_ONS: AddOnDef[] = [
  {
    id: 'breakfast',
    name: 'Ăn sáng đặc sản địa phương',
    unitPriceVnd: 150000,
    unitLabel: '/ người / ngày',
    description: 'Thưởng thức ẩm thực Ninh Bình với nguyên liệu tươi ngon, bản địa.',
    image: '/images/dinh-van-booking/addons/breakfast.webp',
    quantityLabel: 'Số người ăn sáng',
    isDemo: true,
  },
  {
    id: 'airport-transfer',
    name: 'Xe đón tiễn sân bay',
    unitPriceVnd: 300000,
    unitLabel: '/ lượt',
    description: 'Xe 4-7 chỗ, đưa đón tận nơi an toàn, tiện lợi.',
    image: '/images/dinh-van-booking/addons/airport-transfer.webp',
    quantityLabel: 'Số lượt',
    isDemo: true,
  },
  {
    id: 'forest-tour',
    name: 'Tour khám phá Cúc Phương',
    unitPriceVnd: 450000,
    unitLabel: '/ người',
    description: 'Trải nghiệm rừng nguyên sinh cùng hướng dẫn viên bản địa.',
    image: '/images/dinh-van-booking/addons/forest-tour.webp',
    quantityLabel: 'Số người tham gia',
    isDemo: true,
  },
  {
    id: 'bike-rental',
    name: 'Thuê xe đạp',
    unitPriceVnd: 50000,
    unitLabel: '/ xe / ngày',
    description: 'Tự do khám phá làng quê và thiên nhiên xung quanh.',
    image: '/images/dinh-van-booking/addons/bike-rental.webp',
    quantityLabel: 'Số xe',
    isDemo: true,
  },
];

export const ADD_ON_LIMITS = { transferTrips: 4, bikes: 10 } as const;

export interface AddOnState {
  breakfast: { selected: boolean };
  'airport-transfer': { selected: boolean; trips: number };
  'forest-tour': { selected: boolean; participants: number };
  'bike-rental': { selected: boolean; bikes: number; days: number };
}

export const emptyAddOns = (guests: number, nights: number): AddOnState => ({
  breakfast: { selected: false },
  'airport-transfer': { selected: false, trips: 1 },
  'forest-tour': { selected: false, participants: Math.max(1, guests) },
  'bike-rental': { selected: false, bikes: 1, days: Math.max(1, nights) },
});

export const COUPONS: Record<string, { rate: number; label: string }> = {
  DVAN10: { rate: 0.1, label: 'Giảm 10%' },
};

export const normalizeCoupon = (raw: string) => raw.trim().toUpperCase();

export interface PriceInput {
  nightlyRate: number;
  nights: number;
  roomCount: number;
  guests: number;
  breakfastIncluded: boolean;
  addOns: AddOnState;
  /** Applied (validated) coupon code or null. */
  coupon: string | null;
  plan: PaymentPlan;
}

export interface PriceLine {
  id: string;
  label: string;
  amountVnd: number;
}

export interface PriceSummary {
  roomSubtotalVnd: number;
  addOnSubtotalVnd: number;
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  dueNowVnd: number;
  remainingVnd: number;
  lines: PriceLine[];
}

export class PriceInputError extends Error {}

const posInt = (n: number) => Number.isInteger(n) && n > 0;

export function calculatePrice(input: PriceInput): PriceSummary {
  const { nightlyRate, nights, roomCount, guests, addOns } = input;
  if (!posInt(nightlyRate)) throw new PriceInputError('Giá phòng không hợp lệ');
  if (!posInt(nights)) throw new PriceInputError('Số đêm phải lớn hơn 0');
  if (!posInt(roomCount)) throw new PriceInputError('Số phòng không hợp lệ');
  if (!posInt(guests)) throw new PriceInputError('Số khách không hợp lệ');

  const lines: PriceLine[] = [];
  const roomSubtotalVnd = nightlyRate * nights * roomCount;
  lines.push({
    id: 'room',
    label: `Giá phòng (${nights} đêm${roomCount > 1 ? ` × ${roomCount} phòng` : ''})`,
    amountVnd: roomSubtotalVnd,
  });

  let addOnSubtotalVnd = 0;
  const add = (id: AddOnId, label: string, amount: number) => {
    addOnSubtotalVnd += amount;
    lines.push({ id, label, amountVnd: amount });
  };

  if (addOns.breakfast.selected && !input.breakfastIncluded) {
    // Demo convention: all guests are charged, one breakfast per night.
    add('breakfast', `Ăn sáng (${guests} người x ${nights} ngày)`, 150000 * guests * nights);
  }
  const t = addOns['airport-transfer'];
  if (t.selected) {
    if (!posInt(t.trips) || t.trips > ADD_ON_LIMITS.transferTrips) throw new PriceInputError('Số lượt đón tiễn không hợp lệ');
    add('airport-transfer', `Xe đón tiễn sân bay (${t.trips} lượt)`, 300000 * t.trips);
  }
  const tour = addOns['forest-tour'];
  if (tour.selected) {
    if (!posInt(tour.participants) || tour.participants > guests)
      throw new PriceInputError('Số người tham gia tour phải từ 1 đến số khách');
    add('forest-tour', `Tour khám phá Cúc Phương (${tour.participants} người)`, 450000 * tour.participants);
  }
  const bike = addOns['bike-rental'];
  if (bike.selected) {
    if (!posInt(bike.bikes) || bike.bikes > ADD_ON_LIMITS.bikes) throw new PriceInputError('Số xe đạp không hợp lệ');
    if (!posInt(bike.days) || bike.days > nights) throw new PriceInputError('Số ngày thuê xe phải từ 1 đến số đêm');
    add('bike-rental', `Thuê xe đạp (${bike.bikes} xe x ${bike.days} ngày)`, 50000 * bike.bikes * bike.days);
  }

  const subtotalVnd = roomSubtotalVnd + addOnSubtotalVnd;
  const coupon = input.coupon ? COUPONS[input.coupon] : undefined;
  const discountVnd = coupon ? Math.min(subtotalVnd, Math.round(subtotalVnd * coupon.rate)) : 0;
  const totalVnd = Math.max(0, subtotalVnd - discountVnd);
  const dueNowVnd = input.plan === 'deposit' ? Math.round(totalVnd * DEPOSIT_RATE) : totalVnd;
  return {
    roomSubtotalVnd,
    addOnSubtotalVnd,
    subtotalVnd,
    discountVnd,
    totalVnd,
    dueNowVnd,
    remainingVnd: totalVnd - dueNowVnd,
    lines,
  };
}
