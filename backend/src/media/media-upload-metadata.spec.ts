import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeUploadMetadata } from './media-upload-metadata';

test('upload never persists undefined/null filename or ALT literals', () => {
  for (const bad of ['undefined', 'undefined.jpg', 'undefined.png', 'null', 'null.jpg', 'null.png', '.jpg', '.png', ' NULL.JPG ']) {
    const result = normalizeUploadMetadata(bad, bad, bad);
    assert.match(result.originalFilename, /^upload-[a-f0-9]{8}\.webp$/);
    assert.equal(result.altText, 'Ảnh tải lên');
    assert.equal(result.caption, null);
  }
});

test('property cover title becomes ALT even when browser filename is absent', () => {
  const result = normalizeUploadMetadata(undefined, 'Nhà Sàn Forest Home', null);
  assert.match(result.originalFilename, /^upload-[a-f0-9]{8}\.webp$/);
  assert.equal(result.altText, 'Nhà Sàn Forest Home');
});

test('safe browser filename is kept and supplies a nonempty ALT fallback', () => {
  const result = normalizeUploadMetadata('C:\\photos\\cuc-phuong-cover.jpg', '', 'Ảnh có quyền sử dụng');
  assert.equal(result.originalFilename, 'cuc-phuong-cover.jpg');
  assert.equal(result.altText, 'cuc phuong cover');
  assert.equal(result.caption, 'Ảnh có quyền sử dụng');
});
