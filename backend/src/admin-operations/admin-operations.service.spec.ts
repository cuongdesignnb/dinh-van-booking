import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCouponDiscount, canTransitionBookingStatus } from './admin-operations.service';

test('booking lifecycle permits only the defined state transitions', () => {
  assert.equal(canTransitionBookingStatus('pending_confirmation', 'confirmed'), true);
  assert.equal(canTransitionBookingStatus('pending_confirmation', 'cancelled'), true);
  assert.equal(canTransitionBookingStatus('confirmed', 'checked_in'), true);
  assert.equal(canTransitionBookingStatus('checked_in', 'completed'), true);
  assert.equal(canTransitionBookingStatus('confirmed', 'completed'), false);
  assert.equal(canTransitionBookingStatus('confirmed', 'expired'), false);
  assert.equal(canTransitionBookingStatus('confirmed', 'no_show'), true);
  assert.equal(canTransitionBookingStatus('completed', 'confirmed'), false);
  assert.equal(canTransitionBookingStatus('cancelled', 'confirmed'), false);
  assert.equal(canTransitionBookingStatus('pending_confirmation', 'paid'), false);
});

test('coupon discount uses integer VND basis-point math and respects its cap', () => {
  assert.equal(calculateCouponDiscount({ discountType: 'percent', percentBps: 1_000, amountVnd: null, maxDiscountVnd: 300_000n }, 2_850_000n), 285_000n);
  assert.equal(calculateCouponDiscount({ discountType: 'percent', percentBps: 2_000, amountVnd: null, maxDiscountVnd: 250_000n }, 2_000_000n), 250_000n);
  assert.equal(calculateCouponDiscount({ discountType: 'fixed', percentBps: null, amountVnd: 9_000_000n, maxDiscountVnd: null }, 2_000_000n), 2_000_000n);
  assert.equal(calculateCouponDiscount({ discountType: 'percent', percentBps: 333, amountVnd: null, maxDiscountVnd: null }, 1n), 0n);
  assert.equal(calculateCouponDiscount({ discountType: 'percent', percentBps: 10_000, amountVnd: null, maxDiscountVnd: null }, 0n), 0n);
});
