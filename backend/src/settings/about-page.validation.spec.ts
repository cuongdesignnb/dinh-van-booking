import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { normalizeAboutPage } from './about-page.validation';
import { publicBootstrapSettings } from '../scripts/data/public-bootstrap';

const BLOCKS = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'image'];
const HERO = '0b8f3c52-6f0e-4a8e-9d55-3f7f9b1f2a10';
const media = { hero: HERO, promo: null, partner: null, staysHero: null, destinationsHero: null, combosHero: null, bookingHero: null };
const bootstrap = () => structuredClone(publicBootstrapSettings(media)['about.page']) as Record<string, unknown>;
const normalize = (value: unknown) => normalizeAboutPage(value, { allowedBlocks: BLOCKS });

test('the shipped about.page copy passes validation unchanged', () => {
  assert.deepEqual(normalize(bootstrap()), bootstrap());
});

test('rich fields are rebuilt through the TipTap whitelist', () => {
  const value = bootstrap();
  value.story = { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'An toàn', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }, { type: 'bold' }] }] },
    { type: 'script', content: [{ type: 'text', text: 'x' }] },
    { type: 'table', content: [] },
  ] };
  value.intro = 'Dòng một\nDòng hai';
  const clean = normalize(value);
  assert.deepEqual(clean.story, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'An toàn', marks: [{ type: 'bold' }] }] }] });
  assert.equal((clean.intro as { content: unknown[] }).content.length, 2);
  assert.throws(() => normalize({ ...bootstrap(), story: { type: 'paragraph' } }), BadRequestException);
});

test('media fields must be Media Library ids and links must stay internal', () => {
  assert.throws(() => normalize({ ...bootstrap(), portraitMediaId: 'https://example.com/me.jpg' }), /Media Library/);
  const areas = bootstrap().areas as Array<Record<string, unknown>>;
  assert.throws(() => normalize({ ...bootstrap(), areas: [{ ...areas[0], imageMediaId: '../x' }] }), /Media Library/);
  assert.throws(() => normalize({ ...bootstrap(), areas: [{ ...areas[0], linkTarget: 'https://evil.example' }] }), /nội bộ/);
  assert.throws(() => normalize({ ...bootstrap(), areas: [{ ...areas[0], linkTarget: '//evil.example' }] }), /nội bộ/);
  const picked = normalize({ ...bootstrap(), ogImageMediaId: HERO.toUpperCase(), portraitMediaId: '' });
  assert.equal(picked.ogImageMediaId, HERO);
  assert.equal(picked.portraitMediaId, null);
});

test('lists are bounded, need titles, and get stable unique ids', () => {
  const values = bootstrap().values as Array<Record<string, unknown>>;
  assert.throws(() => normalize({ ...bootstrap(), values: Array.from({ length: 9 }, () => values[0]) }), /tối đa 8/);
  assert.throws(() => normalize({ ...bootstrap(), values: [{ ...values[0], title: '  ' }] }), /tiêu đề/);
  assert.throws(() => normalize({ ...bootstrap(), values: [{ ...values[0], icon: 'skull' }] }), /biểu tượng/);
  assert.throws(() => normalize({ ...bootstrap(), faqs: [{ id: 'q', enabled: true, question: '', answer: null }] }), /câu hỏi/);
  const clean = normalize({ ...bootstrap(), values: [{ ...values[0], id: 'same' }, { ...values[1], id: 'same' }, { title: 'Mới', text: 'x', extra: 1 }] });
  const ids = (clean.values as Array<Record<string, unknown>>).map((item) => item.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal((clean.values as Array<Record<string, unknown>>)[2].extra, undefined);
  assert.equal((clean.values as Array<Record<string, unknown>>)[2].enabled, true);
});

test('text fields are trimmed, length-checked, and unknown keys are dropped', () => {
  const clean = normalize({ ...bootstrap(), title: '  Tiêu đề  ', injected: '<script>', seoDescription: '' });
  assert.equal(clean.title, 'Tiêu đề');
  assert.equal(clean.seoDescription, null);
  assert.equal('injected' in clean, false);
  assert.throws(() => normalize({ ...bootstrap(), seoTitle: 'x'.repeat(71) }), /tối đa 70/);
  assert.throws(() => normalize({ ...bootstrap(), title: 42 }), /văn bản/);
  assert.throws(() => normalize({ ...bootstrap(), title: '' }), /H1/);
  assert.equal(normalize({ ...bootstrap(), enabled: false, title: '' }).title, null);
  assert.throws(() => normalize([]), BadRequestException);
});
