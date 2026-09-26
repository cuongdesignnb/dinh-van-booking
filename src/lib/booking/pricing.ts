/**
 * Pure price calculation for the booking draft. Every summary on the page
 * (desktop, mobile bar, review step) reads the same `PriceSummary`.
 * Integer VND only. This is a client-side estimate; the backend remains the
 * final source of truth for any real transaction.
 */

export type PaymentPlan = 'deposit' | 'full';
export type PaymentMethod = 'bank-transfer' | null;
export type AddOnId = 'breakfast' | 'airport-transfer' | 'forest-tour' | 'bike-rental';

export interface AddOnDef {
  id: AddOnId;
  name: string;
  unitPriceVnd: number;
  unitLabel: string;
  description: string;
  image: string;
  /** How the quantity field is interpreted (shown to the user). */
  quantityLabel: string;
}

export const ADD_ONS: AddOnDef[] = [
  /* Add-ons are intentionally empty until managed API data is published. */
];

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

export const COUPONS: Record<string, { rate: number; label: string }> = {};

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
  plan?: PaymentPlan;
  /**
   * Optional server-provided add-on prices. The client must never invent
   * commercial prices when this catalog is absent.
   */
  addOnPrices?: Partial<Record<AddOnId, number>>;
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
  const { nightlyRate, nights, roomCount, guests, addOns, addOnPrices } = input;
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

  const priced = (id: AddOnId) => {
    const amount = addOnPrices?.[id];
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0)
      throw new PriceInputError('Dịch vụ bổ sung chưa có giá được cấu hình');
    return amount;
  };

  if (addOns.breakfast.selected && !input.breakfastIncluded) {
    add('breakfast', `Ăn sáng (${guests} người x ${nights} ngày)`, priced('breakfast') * guests * nights);
  }
  const t = addOns['airport-transfer'];
  if (t.selected) {
    if (!posInt(t.trips)) throw new PriceInputError('Số lượt đón tiễn không hợp lệ');
    add('airport-transfer', `Xe đón tiễn sân bay (${t.trips} lượt)`, priced('airport-transfer') * t.trips);
  }
  const tour = addOns['forest-tour'];
  if (tour.selected) {
    if (!posInt(tour.participants) || tour.participants > guests)
      throw new PriceInputError('Số người tham gia tour phải từ 1 đến số khách');
    add('forest-tour', `Tour khám phá Cúc Phương (${tour.participants} người)`, priced('forest-tour') * tour.participants);
  }
  const bike = addOns['bike-rental'];
  if (bike.selected) {
    if (!posInt(bike.bikes)) throw new PriceInputError('Số xe đạp không hợp lệ');
    if (!posInt(bike.days) || bike.days > nights) throw new PriceInputError('Số ngày thuê xe phải từ 1 đến số đêm');
    add('bike-rental', `Thuê xe đạp (${bike.bikes} xe x ${bike.days} ngày)`, priced('bike-rental') * bike.bikes * bike.days);
  }

  const subtotalVnd = roomSubtotalVnd + addOnSubtotalVnd;
  const coupon = input.coupon ? COUPONS[input.coupon] : undefined;
  const discountVnd = coupon ? Math.min(subtotalVnd, Math.round(subtotalVnd * coupon.rate)) : 0;
  const totalVnd = Math.max(0, subtotalVnd - discountVnd);
  // There is no payment/hold workflow in this client flow. Keep the legacy
  // shape for callers, but never claim a deposit or collected amount.
  const dueNowVnd = 0;
  return {
    roomSubtotalVnd,
    addOnSubtotalVnd,
    subtotalVnd,
    discountVnd,
    totalVnd,
    dueNowVnd,
    remainingVnd: totalVnd,
    lines,
  };
}
