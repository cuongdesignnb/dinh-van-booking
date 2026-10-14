import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cleanMessageBody,
  extractPhone,
  maskPersonalData,
  pageKindFromPath,
  sanitizeAiReply,
  sanitizePath,
} from './chat-text';

test('Vietnamese phone numbers are found in free text and normalised', () => {
  assert.equal(extractPhone('Gọi mình số 0912 345 678 nhé'), '0912345678');
  assert.equal(extractPhone('zalo +84 912.345.678'), '0912345678');
  assert.equal(extractPhone('sđt: 84-912-345-678'), '0912345678');
  assert.equal(extractPhone('phòng 2 người giá 850.000đ'), null);
  assert.equal(extractPhone('mã đặt chỗ 123456789012'), null);
});

test('personal data is masked before any AI call', () => {
  const masked = maskPersonalData('Số mình 0912345678, email an@example.com, phòng 850.000đ cho 2 người');
  assert.doesNotMatch(masked, /0912345678/);
  assert.doesNotMatch(masked, /an@example\.com/);
  assert.match(masked, /\[SĐT\]/);
  assert.match(masked, /\[EMAIL\]/);
  assert.match(masked, /850\.000đ/);
});

test('message bodies are trimmed, stripped of control characters and capped', () => {
  assert.equal(cleanMessageBody('  xin chào\u0007  '), 'xin chào');
  assert.equal(cleanMessageBody('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(cleanMessageBody(42), '');
  assert.equal(cleanMessageBody('x'.repeat(3000)).length, 2000);
});

test('only same-site relative paths are accepted as page context', () => {
  assert.equal(sanitizePath('/phong-nghi/nha-san?x=1#top'), '/phong-nghi/nha-san');
  assert.equal(sanitizePath('https://evil.example/phong-nghi'), null);
  assert.equal(sanitizePath('//evil.example'), null);
  assert.equal(sanitizePath('/a b'), null);
  assert.equal(pageKindFromPath('/phong-nghi/nha-san'), 'stay');
  assert.equal(pageKindFromPath('/combo-du-lich/'), 'listing');
  assert.equal(pageKindFromPath('/lien-he'), 'other');
});

test('AI replies are reduced to plain text', () => {
  const reply = sanitizeAiReply('<b>Chào</b> bạn! Xem [Nhà sàn](https://x.y/phong-nghi) **ngay**\n## Tiêu đề');
  assert.equal(reply, 'Chào bạn! Xem Nhà sàn ngay\nTiêu đề');
  assert.ok(sanitizeAiReply('Câu. '.repeat(400)).length <= 1201);
});
