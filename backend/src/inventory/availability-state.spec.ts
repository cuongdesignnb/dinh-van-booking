import assert from 'node:assert/strict';
import test from 'node:test';
import { badgeDateRange, propertyAvailability, roomAvailability } from './availability-state';
const now = new Date('2026-10-05T08:00:00Z'), dates = [new Date('2026-10-05'), new Date('2026-10-06')];
const fresh = { capacity: 3, blockedCount: 0, heldCount: 1, reservedCount: 1, stopSell: false, lastConfirmedAt: now };
test('public room status requires every night, freshness and sound commitments; missing is never sold out', () => {
  assert.equal(roomAvailability([fresh, fresh], dates, false, {}, now).status, 'available');
  assert.equal(roomAvailability([fresh, { ...fresh, capacity: 2 }], dates, false, {}, now).status, 'sold_out');
  for (const rows of [[fresh, undefined], [fresh, { ...fresh, lastConfirmedAt: new Date('2026-10-01') }], [fresh, { ...fresh, capacity: 1 }]]) assert.equal(roomAvailability(rows, dates, false, {}, now).status, 'unknown');
  assert.equal(roomAvailability([fresh, fresh], dates, true, {}, now).status, 'unknown');
  assert.equal(roomAvailability([], dates, false, {}, now).status, 'unknown');
  assert.equal(roomAvailability([], [], false, {}, now).status, 'unknown');
  assert.equal(roomAvailability([fresh, { ...fresh, stopSell: true }], dates, false, {}, now).status, 'sold_out');
});
test('property needs one whole-stay room; sold out requires ALL room categories known/fresh', () => {
  const result = (status: 'available' | 'sold_out' | 'unknown') => ({ status, asOf: status === 'unknown' ? null : now.toISOString() });
  assert.equal(propertyAvailability([result('available'), result('unknown')]).availabilityStatus, 'available');
  assert.equal(propertyAvailability([result('sold_out'), result('unknown')]).availabilityStatus, 'unknown');
  assert.equal(propertyAvailability([result('sold_out'), result('sold_out')]).availabilityStatus, 'sold_out');
  assert.equal(propertyAvailability([]).availabilityStatus, 'unknown');
  assert.equal(propertyAvailability([result('unknown')]).availabilityAsOf, null);
});
test('badge default uses Vietnam date, strict date validation, end-exclusive range and cross-month nights', () => {
  assert.equal(badgeDateRange({}, new Date('2026-10-04T18:00:00Z')).checkIn, '2026-10-05');
  assert.deepEqual(badgeDateRange({ checkIn: '2026-10-31', checkOut: '2026-11-02' }, now).dates.map((d) => d.toISOString().slice(0, 10)), ['2026-10-31', '2026-11-01']);
  assert.equal(badgeDateRange({ checkIn: '2026-02-30', checkOut: '2026-03-01' }, now).checkIn, '2026-10-05');
});
