import assert from 'node:assert/strict';
import test from 'node:test';
import { pathForContent } from './slug';

test('standalone page content gets a clean root route', () => {
  assert.equal(pathForContent('page', 'chinh-sach-bao-mat'), '/chinh-sach-bao-mat');
});

test('catalog content keeps its section route', () => {
  assert.equal(pathForContent('stay', 'nha-san-doi'), '/phong-nghi/nha-san-doi');
});
