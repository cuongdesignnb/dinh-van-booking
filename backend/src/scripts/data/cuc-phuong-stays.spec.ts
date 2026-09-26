import assert from 'node:assert/strict';
import test from 'node:test';
import { CUC_PHUONG_STAYS, validateCucPhuongManifest } from './cuc-phuong-stays';

test('Cúc Phương manifest contains exactly 11 canonical records', () => {
  assert.equal(CUC_PHUONG_STAYS.length, 11);
  assert.deepEqual(validateCucPhuongManifest(), []);
  assert.equal(new Set(CUC_PHUONG_STAYS.map((item) => item.code)).size, 11);
  assert.equal(new Set(CUC_PHUONG_STAYS.map((item) => item.slug)).size, 11);
});

test('manifest sources cover every record and contain no Google or live booking fields', () => {
  const forbiddenKeys = /(?:price|rate|review|rating|inventory|availability|unit|image|photo|media|latitude|longitude|coordinate)/i;
  for (const item of CUC_PHUONG_STAYS) {
    assert.ok(item.sources.length > 0, `${item.code} has no sources`);
    assert.ok(item.sources.every((source) => !/google(?:usercontent)?\.|maps\.google/i.test(source.url)), item.code);
    const keys = Object.keys(item).filter((key) => forbiddenKeys.test(key));
    assert.deepEqual(keys, [], `${item.code} has forbidden manifest keys`);
  }
  const mineral = CUC_PHUONG_STAYS.find((item) => item.code === 'CP-MINERAL-RETREAT');
  assert.equal(mineral?.roomTypes?.length, 5);
  assert.ok(mineral?.roomTypes?.every((room) => room.status === 'inactive'));
  assert.ok(CUC_PHUONG_STAYS.filter((item) => item.roomTypes).length === 1);
});
