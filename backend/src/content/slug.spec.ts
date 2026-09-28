import assert from 'node:assert/strict';
import test from 'node:test';
import { pathForContent, slugify, uniqueSlug } from './slug';

test('standalone page content gets a clean root route', () => {
  assert.equal(pathForContent('page', 'chinh-sach-bao-mat'), '/chinh-sach-bao-mat');
});

test('catalog content keeps its section route', () => {
  assert.equal(pathForContent('stay', 'nha-san-doi'), '/phong-nghi/nha-san-doi');
});

test('Vietnamese slug vectors match the admin editor', () => {
  for (const [input, expected] of [
    ['Đinh Vân Booking', 'dinh-van-booking'],
    ['Phòng nghỉ Cúc Phương', 'phong-nghi-cuc-phuong'],
    ['Vườn Quốc Gia Cúc Phương', 'vuon-quoc-gia-cuc-phuong'],
    ['Combo Cúc Phương 2N1Đ', 'combo-cuc-phuong-2n1d'],
    ['  Hello --- World', 'hello-world'],
  ]) assert.equal(slugify(input), expected);
});

test('create policy suffixes collisions and reserved routes', () => {
  assert.equal(uniqueSlug('Forest Home', new Set(['forest-home'])), 'forest-home-2');
  assert.equal(uniqueSlug('admin', new Set()), 'admin-2');
});
