import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSellableStayRoom } from './public-catalog.service';

test('public stay needs an active room unit and a positive active rate on the same room type', () => {
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), true);
  assert.equal(hasSellableStayRoom([{ units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: false }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 0n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: false, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([
    { units: [{ active: true }], ratePlans: [] },
    { units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] },
  ]), false);
});
