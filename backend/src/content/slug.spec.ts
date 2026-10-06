import assert from 'node:assert/strict';
import test from 'node:test';
import { isReservedSlug, isValidSlug, normalizeSlug, pathForContent, RESERVED_SLUGS, slugify } from './slug';

test('standalone page content gets a clean root route', () => {
  assert.equal(pathForContent('page', 'chinh-sach-bao-mat'), '/chinh-sach-bao-mat');
});

test('catalog content keeps its section route', () => {
  assert.equal(pathForContent('stay', 'nha-san-doi'), '/phong-nghi/nha-san-doi');
  assert.equal(pathForContent('combo', 'x'), '/combo-du-lich/x');
  assert.equal(pathForContent('destination', 'x'), '/diem-den/x');
  assert.equal(pathForContent('article', 'x'), '/bai-viet/x');
});

test('Vietnamese slug vectors (spec §59) produce only [a-z0-9-]', () => {
  for (const [input, expected] of [
    ['Nhà Sàn Cúc Phương', 'nha-san-cuc-phuong'],
    ['Đinh Vân Booking', 'dinh-van-booking'],
    ['Ẩm Thực & Nghỉ Dưỡng', 'am-thuc-nghi-duong'],
    ['Phòng Nghỉ Đẹp Ở Cúc Phương', 'phong-nghi-dep-o-cuc-phuong'],
    ['Phòng nghỉ Cúc Phương', 'phong-nghi-cuc-phuong'],
    ['Vườn Quốc Gia Cúc Phương', 'vuon-quoc-gia-cuc-phuong'],
    ['Combo Cúc Phương 2N1Đ', 'combo-cuc-phuong-2n1d'],
    ['  Hello --- World', 'hello-world'],
    ['snake_case CamelCase', 'snake-case-camelcase'],
  ]) {
    assert.equal(slugify(input), expected);
    assert.match(slugify(input), /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

test('normalizeSlug returns empty for unusable input; slugify keeps a placeholder', () => {
  assert.equal(normalizeSlug('!!! ???'), '');
  assert.equal(slugify('!!! ???'), 'muc');
  assert.equal(normalizeSlug('a'.repeat(200)).length, 120);
});

test('isValidSlug accepts only normalised slugs', () => {
  for (const ok of ['a', 'nha-san', 'combo-2n1d']) assert.ok(isValidSlug(ok), ok);
  for (const bad of ['', 'Nha-San', 'nha_san', 'nha san', 'nhà-sàn', '-nha', 'nha-', 'nha--san', 'a'.repeat(121)]) {
    assert.equal(isValidSlug(bad), false, bad);
  }
});

test('application routes are reserved', () => {
  for (const slug of ['admin', 'api', 'phong-nghi', 'doi-tac', 'lich-phong', 've-minh', 'dat-phong', 'lien-he']) {
    assert.ok(isReservedSlug(slug), slug);
  }
  assert.ok(RESERVED_SLUGS.includes('sitemap'));
  assert.equal(isReservedSlug('nha-san-forest-home'), false);
});
