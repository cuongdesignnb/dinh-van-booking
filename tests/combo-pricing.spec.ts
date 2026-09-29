import { expect, test } from '@playwright/test';
import { comboPriceUnitLabel, compareComboPrices } from '../src/lib/catalog/combo-pricing';

test('combo price sorting keeps missing and zero prices after sellable prices', () => {
  const prices = [null, 500_000, 0, 250_000];
  expect([...prices].sort((a, b) => compareComboPrices(a, b))).toEqual([250_000, 500_000, null, 0]);
  expect([...prices].sort((a, b) => compareComboPrices(a, b, true))).toEqual([500_000, 250_000, null, 0]);
});

test('combo price unit follows the persisted API value', () => {
  expect(comboPriceUnitLabel('person')).toBe('người');
  expect(comboPriceUnitLabel('room')).toBe('phòng');
  expect(comboPriceUnitLabel('booking')).toBe('booking');
});
