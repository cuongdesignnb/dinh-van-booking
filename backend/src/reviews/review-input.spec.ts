import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReviewFields, ratingSummary } from './review-input';

const valid = {
  stay: 'nha-san-forest-home',
  rating: '5',
  name: '  Nguyễn   Thị Lan ',
  phone: '+84 912 345 678',
  body: 'Phòng sạch, chủ nhà nhiệt tình, view rừng rất đẹp.',
  consent: 'true',
  stayedMonth: '2026-09',
};
const now = new Date('2026-10-15T00:00:00Z');

test('a complete guest review is normalised', () => {
  const { honeypot, value } = parseReviewFields(valid, now);
  assert.equal(honeypot, false);
  assert.equal(value.name, 'Nguyễn Thị Lan');
  assert.equal(value.phone, '0912345678');
  assert.equal(value.rating, 5);
  assert.equal(value.stayedAt?.toISOString(), '2026-09-01T00:00:00.000Z');
  assert.equal(value.source, 'website');
  assert.equal(parseReviewFields({ ...valid, source: 'invite' }, now).value.source, 'invite');
});

test('invalid guest input is rejected with an actionable message', () => {
  assert.throws(() => parseReviewFields({ ...valid, rating: '6' }, now), /1 đến 5 sao/);
  assert.throws(() => parseReviewFields({ ...valid, rating: '4.5' }, now), /1 đến 5 sao/);
  assert.throws(() => parseReviewFields({ ...valid, phone: '12345' }, now), /Số điện thoại/);
  assert.throws(() => parseReviewFields({ ...valid, body: 'Tốt' }, now), /ít nhất 20/);
  assert.throws(() => parseReviewFields({ ...valid, consent: '' }, now), /đồng ý/);
  assert.throws(() => parseReviewFields({ ...valid, name: 'https://spam.example' }, now), /liên kết/);
  assert.throws(() => parseReviewFields({ ...valid, stayedMonth: '2026-12' }, now), /tương lai/);
  assert.throws(() => parseReviewFields({ ...valid, stay: '../x' }, now), /nơi lưu trú/);
});

test('the honeypot is reported, not thrown', () => {
  assert.equal(parseReviewFields({ ...valid, website: 'http://bot' }, now).honeypot, true);
});

test('rating summary matches the decimal(3,2) column', () => {
  assert.deepEqual(ratingSummary([]), { average: null, count: 0 });
  assert.deepEqual(ratingSummary([5, 4, 4]), { average: 4.33, count: 3 });
  assert.deepEqual(ratingSummary([5]), { average: 5, count: 1 });
});
