import { expect, test } from '@playwright/test';
import { calculatePrice, emptyAddOns, PriceInputError, type PriceInput } from '../src/lib/booking/pricing';

/** Baseline from the brief: Standard Garden, 2 nights, 2 guests, breakfast + tour, DVAN10, deposit. */
const baseline = (): PriceInput => {
  const addOns = emptyAddOns(2, 2);
  addOns.breakfast.selected = true;
  addOns['forest-tour'].selected = true;
  addOns['forest-tour'].participants = 2;
  return {
    nightlyRate: 650000,
    nights: 2,
    roomCount: 1,
    guests: 2,
    breakfastIncluded: false,
    addOns,
    coupon: 'DVAN10',
    plan: 'deposit',
  };
};

test.describe('pricing (pure)', () => {
  test('baseline matches the brief', () => {
    const p = calculatePrice(baseline());
    expect(p.roomSubtotalVnd).toBe(1300000);
    expect(p.subtotalVnd).toBe(2800000);
    expect(p.discountVnd).toBe(280000);
    expect(p.totalVnd).toBe(2520000);
    expect(p.dueNowVnd).toBe(756000);
    expect(p.remainingVnd).toBe(1764000);
  });

  test('without tour', () => {
    const i = baseline();
    i.addOns['forest-tour'].selected = false;
    const p = calculatePrice(i);
    expect([p.subtotalVnd, p.totalVnd, p.dueNowVnd, p.remainingVnd]).toEqual([1900000, 1710000, 513000, 1197000]);
  });

  test('no add-ons, no coupon', () => {
    const i = baseline();
    i.addOns.breakfast.selected = false;
    i.addOns['forest-tour'].selected = false;
    i.coupon = null;
    const p = calculatePrice(i);
    expect([p.totalVnd, p.dueNowVnd, p.remainingVnd]).toEqual([1300000, 390000, 910000]);
  });

  test('full payment', () => {
    const p = calculatePrice({ ...baseline(), plan: 'full' });
    expect([p.dueNowVnd, p.remainingVnd]).toEqual([2520000, 0]);
  });

  test('coupon removed', () => {
    const p = calculatePrice({ ...baseline(), coupon: null });
    expect([p.totalVnd, p.dueNowVnd, p.remainingVnd]).toEqual([2800000, 840000, 1960000]);
  });

  test('plus one transfer trip', () => {
    const i = baseline();
    i.addOns['airport-transfer'] = { selected: true, trips: 1 };
    const p = calculatePrice(i);
    expect([p.subtotalVnd, p.totalVnd, p.dueNowVnd]).toEqual([3100000, 2790000, 837000]);
  });

  test('family room keeps other choices', () => {
    const p = calculatePrice({ ...baseline(), nightlyRate: 1200000 });
    expect([p.subtotalVnd, p.totalVnd, p.dueNowVnd]).toEqual([3900000, 3510000, 1053000]);
  });

  test('coupon applies once even if re-applied', () => {
    const a = calculatePrice(baseline());
    const b = calculatePrice({ ...baseline(), coupon: 'DVAN10' });
    expect(b.discountVnd).toBe(a.discountVnd);
  });

  test('two rooms do not double breakfast or tour', () => {
    const p = calculatePrice({ ...baseline(), roomCount: 2 });
    expect(p.roomSubtotalVnd).toBe(2600000);
    expect(p.addOnSubtotalVnd).toBe(1500000);
  });

  test('invalid inputs are rejected, never NaN', () => {
    expect(() => calculatePrice({ ...baseline(), nights: 0 })).toThrow(PriceInputError);
    expect(() => calculatePrice({ ...baseline(), nights: Number.NaN })).toThrow(PriceInputError);
    const tooMany = baseline();
    tooMany.addOns['forest-tour'].participants = 3;
    expect(() => calculatePrice(tooMany)).toThrow(PriceInputError);
    const bikes = baseline();
    bikes.addOns['bike-rental'] = { selected: true, bikes: 1, days: 0 };
    expect(() => calculatePrice(bikes)).toThrow(PriceInputError);
  });

  test('breakfast is not charged when included in the room', () => {
    const p = calculatePrice({ ...baseline(), breakfastIncluded: true });
    expect(p.lines.find((l) => l.id === 'breakfast')).toBeUndefined();
  });
});
