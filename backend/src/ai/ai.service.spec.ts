import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decryptProviderKey, encryptProviderKey, sanitizeGeneratedHtml } from './ai.service';
import { isPrivateAddress, validatePublicHttpsUrl } from './safe-network';

const candidate = {
  id: 'node-1',
  kind: 'destination',
  title: 'Vườn quốc gia Cúc Phương',
  path: '/diem-den/vuon-quoc-gia-cuc-phuong',
  anchor: 'Vườn quốc gia Cúc Phương',
};

test('provider API keys are encrypted and require the same server secret to decrypt', () => {
  const raw = 'sk-test-never-store-in-plain-text';
  const cipherText = encryptProviderKey(raw, 'stable-session-secret');
  assert.notEqual(cipherText, raw);
  assert.doesNotMatch(cipherText, /sk-test/);
  assert.equal(decryptProviderKey(cipherText, 'stable-session-secret'), raw);
  assert.throws(() => decryptProviderKey(cipherText, 'different-secret'));
});

test('generated HTML allows only safe formatting and exact published route/anchor pairs', () => {
  const prose = 'Cúc Phương phù hợp với người muốn tìm hiểu thiên nhiên và lên kế hoạch tham quan có trách nhiệm. '.repeat(3);
  const result = sanitizeGeneratedHtml(
    `<h2>Khám phá thiên nhiên</h2><p>${prose}<a href="${candidate.path}">${candidate.anchor}</a></p><ul><li>Chuẩn bị lịch trình</li></ul>`,
    [candidate],
  );
  assert.match(result.html, /<h2>Khám phá thiên nhiên<\/h2>/);
  assert.match(result.html, new RegExp(`<a href="${candidate.path}">${candidate.anchor}<\\/a>`));
  assert.equal(result.linked.length, 1);
  assert.doesNotMatch(result.html, /target=|rel=|<h1/i);
});

test('generated HTML rejects scripts, events, unknown routes, external URLs, and malformed markup', () => {
  const prose = 'Nội dung hướng dẫn được viết riêng cho khách du lịch. '.repeat(4);
  const badInputs = [
    `<h2>Tiêu đề</h2><script>alert(1)</script><p>${prose}</p>`,
    `<h2>Tiêu đề</h2><p onclick="alert(1)">${prose}</p>`,
    `<h2>Tiêu đề</h2><p>${prose}<a href="/not-a-real-route">Điểm đến Cúc Phương</a></p>`,
    `<h2>Tiêu đề</h2><p>${prose}<a href="https://evil.example">liên kết bên ngoài</a></p>`,
    `<h2>Tiêu đề<p>${prose}</p>`,
  ];
  for (const html of badInputs) assert.throws(() => sanitizeGeneratedHtml(html, [candidate]));
});

test('provider URLs require public HTTPS destinations', () => {
  assert.equal(validatePublicHttpsUrl('https://api.example.com/v1', 'base').hostname, 'api.example.com');
  for (const value of ['http://api.example.com', 'https://localhost/v1', 'https://127.0.0.1/v1', 'https://user:pass@api.example.com']) {
    assert.throws(() => validatePublicHttpsUrl(value, 'base'));
  }
  assert.equal(isPrivateAddress('10.0.0.8'), true);
  assert.equal(isPrivateAddress('172.20.2.9'), true);
  assert.equal(isPrivateAddress('::1'), true);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
});
