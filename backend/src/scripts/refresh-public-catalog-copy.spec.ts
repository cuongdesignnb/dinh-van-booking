import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paragraphDoc } from './data/public-bootstrap';
import { planPublicCatalogCopyRefresh } from './refresh-public-catalog-copy';

test('refresh replaces only exact old bootstrap copy and retains other Admin fields', () => {
  const other = { listTitle: 'Tên do quản trị sửa', advisorCtaLabel: 'Gọi mình', emptyTitle: 'Chưa có combo được xuất bản' };
  const original = { ...other, listSubtitle: paragraphDoc('Các lựa chọn sẽ xuất hiện khi được quản trị viên xuất bản.') };
  const [plan] = planPublicCatalogCopyRefresh([{ key: 'catalog.combosPage', value: original, version: 7 }]);
  assert.deepEqual(plan.updatedFields, ['listSubtitle', 'emptyTitle']);
  assert.equal(plan.version, 7);
  assert.equal(plan.value.listTitle, other.listTitle);
  assert.equal(plan.value.advisorCtaLabel, other.advisorCtaLabel);
  assert.equal(plan.value.emptyTitle, 'Combo du lịch đang được chuẩn bị');
  assert.deepEqual(plan.value.listSubtitle, paragraphDoc('Chọn nhịp điệu phù hợp cho chuyến đi của bạn.'));
  assert.deepEqual(original.listSubtitle, paragraphDoc('Các lựa chọn sẽ xuất hiện khi được quản trị viên xuất bản.'));
});

test('refresh preserves customized copy and is idempotent after an update', () => {
  const row = { key: 'catalog.destinationsPage', version: 3, value: {
    listSubtitle: paragraphDoc('Lời dẫn riêng của chủ dự án.'),
    emptyTitle: 'Chưa có điểm đến được xuất bản',
  } };
  const [first] = planPublicCatalogCopyRefresh([row]);
  assert.deepEqual(first.updatedFields, ['emptyTitle']);
  assert.deepEqual(first.preservedFields, ['listSubtitle']);
  assert.deepEqual(first.value.listSubtitle, row.value.listSubtitle);
  assert.equal(first.value.emptyTitle, 'Điểm đến đang được cập nhật');

  const [second] = planPublicCatalogCopyRefresh([{ ...row, value: first.value, version: 4 }]);
  assert.deepEqual(second.updatedFields, []);
  assert.deepEqual(second.preservedFields, ['listSubtitle']);
});

test('refresh never creates missing settings or overwrites unrelated keys', () => {
  assert.deepEqual(planPublicCatalogCopyRefresh([]), []);
  assert.deepEqual(planPublicCatalogCopyRefresh([{ key: 'brand.contact', version: 1, value: { phone: 'unchanged' } }]), []);
});
