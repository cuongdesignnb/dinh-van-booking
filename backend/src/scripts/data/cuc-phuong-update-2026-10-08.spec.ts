import assert from 'node:assert/strict';
import test from 'node:test';
import { CUC_PHUONG_STAYS } from './cuc-phuong-stays';
import { CUC_PHUONG_NEW_STAYS, CUC_PHUONG_SUPPLEMENTS, validateCucPhuongUpdate } from './cuc-phuong-update-2026-10-08';

test('Cúc Phương 2026-10-08 update validates and adds only new codes', () => {
  assert.deepEqual(validateCucPhuongUpdate(), []);
  const v1 = new Set(CUC_PHUONG_STAYS.map((item) => item.code));
  assert.deepEqual(CUC_PHUONG_NEW_STAYS.map((item) => item.code), ['CP-DUC-HUYEN']);
  assert.ok(CUC_PHUONG_NEW_STAYS.every((item) => !v1.has(item.code)));
  assert.ok(CUC_PHUONG_SUPPLEMENTS.every((item) => v1.has(item.propertyCode)));
});

test('supplement rooms carry no commercial fields and use official park unit types', () => {
  const park = CUC_PHUONG_SUPPLEMENTS.find((item) => item.propertyCode === 'CP-NATIONAL-PARK-LODGE');
  assert.equal(park?.rooms.length, 10);
  for (const room of park?.rooms ?? []) {
    assert.deepEqual(Object.keys(room).filter((key) => /price|rate|unitCount|inventory|media|capacity|maxAdults/i.test(key)), []);
  }
  assert.ok(park?.copy?.expectedCurrentDescription.length);
});

test('validation rejects duplicates, unknown amenities and forbidden keys', () => {
  const [stay] = CUC_PHUONG_NEW_STAYS;
  const [supplement] = CUC_PHUONG_SUPPLEMENTS;
  const badStay = { ...stay, code: 'CP-HAO-THAM', rateVnd: 1 } as never;
  const badSupplement = {
    ...supplement,
    rooms: [
      { code: 'X', name: 'X', description: '', unitKind: 'room', amenityCodes: ['sauna'] },
      { code: 'X', name: 'Y', description: '', unitKind: 'room', unitCount: 3 },
    ],
  } as never;
  const problems = validateCucPhuongUpdate([badStay], [badSupplement]);
  assert.ok(problems.some((problem) => problem.includes('Trùng code: CP-HAO-THAM')));
  assert.ok(problems.some((problem) => problem.includes('chứa trường cấm rateVnd')));
  assert.ok(problems.some((problem) => problem.includes('tiện nghi không hợp lệ sauna')));
  assert.ok(problems.some((problem) => problem.includes('trùng room code X')));
  assert.ok(problems.some((problem) => problem.includes('chứa trường cấm unitCount')));
});
