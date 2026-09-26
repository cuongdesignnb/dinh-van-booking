import { expect, test } from '@playwright/test';
import { calculatePrice, emptyAddOns, PriceInputError, type PriceInput } from '../src/lib/booking/pricing';

const input = (overrides: Partial<PriceInput> = {}): PriceInput => ({
  nightlyRate: 650000,
  nights: 2,
  roomCount: 1,
  guests: 2,
  breakfastIncluded: false,
  addOns: emptyAddOns(2, 2),
  coupon: null,
  ...overrides,
});

test.describe('pricing (no invented commercial data)', () => {
  test('uses room price only when no add-on is selected or configured', () => {
    const result = calculatePrice(input());
    expect([result.roomSubtotalVnd, result.addOnSubtotalVnd, result.subtotalVnd]).toEqual([1300000, 0, 1300000]);
    expect([result.totalVnd, result.dueNowVnd, result.remainingVnd]).toEqual([1300000, 0, 1300000]);
  });

  test('requires a configured price before including a selected add-on', () => {
    const addOns = emptyAddOns(2, 2);
    addOns.breakfast.selected = true;
    expect(() => calculatePrice(input({ addOns }))).toThrow(PriceInputError);
  });

  test('calculates selected add-ons only from explicitly supplied prices', () => {
    const addOns = emptyAddOns(2, 2);
    addOns.breakfast.selected = true;
    addOns['forest-tour'].selected = true;
    expect(calculatePrice(input({
      addOns,
      addOnPrices: { breakfast: 100000, 'forest-tour': 300000 },
    }))).toMatchObject({
      roomSubtotalVnd: 1300000,
      addOnSubtotalVnd: 1000000,
      subtotalVnd: 2300000,
      totalVnd: 2300000,
      dueNowVnd: 0,
      remainingVnd: 2300000,
    });
  });

  test('unavailable legacy coupon is not applied', () => {
    const result = calculatePrice(input({ coupon: 'DVAN10' }));
    expect([result.discountVnd, result.totalVnd]).toEqual([0, 1300000]);
  });

  test('payment plan never claims a deposit before a payment workflow exists', () => {
    const result = calculatePrice(input({ plan: 'deposit' }));
    expect([result.dueNowVnd, result.remainingVnd]).toEqual([0, 1300000]);
  });

  test('validates quantities and rejects non-finite values', () => {
    expect(() => calculatePrice(input({ nights: 0 }))).toThrow(PriceInputError);
    expect(() => calculatePrice(input({ nights: Number.NaN }))).toThrow(PriceInputError);

    const addOns = emptyAddOns(2, 2);
    addOns['forest-tour'].selected = true;
    addOns['forest-tour'].participants = 3;
    expect(() => calculatePrice(input({ addOns, addOnPrices: { 'forest-tour': 300000 } }))).toThrow(PriceInputError);
  });

  test('does not charge breakfast already included in the room', () => {
    const addOns = emptyAddOns(2, 2);
    addOns.breakfast.selected = true;
    const result = calculatePrice(input({ addOns, breakfastIncluded: true }));
    expect(result.lines.some((line) => line.id === 'breakfast')).toBe(false);
  });
});
