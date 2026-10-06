import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_BOOTSTRAP_MEDIA, PUBLIC_BOOTSTRAP_MENU, publicBootstrapSettings } from './public-bootstrap';
import { parseBootstrapArgs, planBootstrapSettings } from '../seed-public-bootstrap';

const media = {
  hero: 'media-hero', promo: 'media-promo', partner: 'media-partner', staysHero: 'media-stays',
  destinationsHero: 'media-destinations', combosHero: 'media-combos', bookingHero: 'media-booking',
};

test('bootstrap is a separate, dry-run-first command with explicit replace', () => {
  assert.deepEqual(parseBootstrapArgs([]), { apply: false, replaceExisting: false });
  assert.deepEqual(parseBootstrapArgs(['--apply', '--replace-existing']), { apply: true, replaceExisting: true });
  assert.throws(() => parseBootstrapArgs(['--replace-existing']));
  assert.throws(() => parseBootstrapArgs(['--apply', '--dry-run']));
  assert.throws(() => parseBootstrapArgs(['--unknown']));
  assert.deepEqual(parseBootstrapArgs(['--apply', '--replace-existing', '--only', 'brand.,home.']), { apply: true, replaceExisting: true, only: ['brand.', 'home.'] });
  assert.throws(() => parseBootstrapArgs(['--only']));
  assert.throws(() => parseBootstrapArgs(['--only', '--apply']));
});

test('manifest uses only presentation settings/media and approved navigation', () => {
  const values = publicBootstrapSettings(media);
  assert.equal(Object.keys(values).length, 26);
  assert.equal(values['brand.identity'].name, 'Cúc Phương Travel');
  assert.equal(values['home.contactPanel'].advisorName, 'Đinh Vân');
  assert.equal(values['home.partner'].imageMediaId, 'media-partner');
  assert.equal(values['home.stats'], undefined);
  assert.equal(values['brand.contact'].phone, '0974045828');
  assert.equal(values['brand.contact'].zaloUrl, null);
  assert.equal(values['home.contactPanel'].imageMediaId, null);
  assert.equal(values['contact.page'].advisorImageMediaId, null);
  assert.equal(values['seo.defaults'].robotsIndex, false);
  assert.equal(values['seo.defaults'].canonicalBase, null);
  assert.equal((values['home.hero'].description as { type: string }).type, 'doc');
  assert.equal((values['home.faq'].items as Array<{ answer: { type: string } }>)[0].answer.type, 'doc');
  assert.equal(new Set(PUBLIC_BOOTSTRAP_MEDIA.map((item) => item.key)).size, PUBLIC_BOOTSTRAP_MEDIA.length);
  assert.ok(PUBLIC_BOOTSTRAP_MEDIA.every((item) => item.alt && item.caption && item.source.endsWith('.webp')));
  assert.ok(PUBLIC_BOOTSTRAP_MEDIA.every((item) => !/advisor|avatar|review|testimonial/i.test(item.source)));
  assert.deepEqual(PUBLIC_BOOTSTRAP_MENU.map((item) => item.externalUrl), ['/', '/phong-nghi', '/combo-du-lich', '/diem-den', '/ve-minh', '/doi-tac']);
  assert.deepEqual(PUBLIC_BOOTSTRAP_MENU.map((item) => item.label), ['Trang chủ', 'Lưu trú', 'Trải nghiệm', 'Cẩm nang', 'Về mình', 'Dành cho đối tác']);
  assert.doesNotMatch(JSON.stringify(values), /Đinh Vân Booking/);
  assert.ok(Object.keys(values).every((key) => /^(brand\.(identity|contact)|site\.(header|footer)|home\..+|(contact|about)\.page|catalog\..+|seo\.(defaults|pages))$/.test(key)));
  const about = values['about.page'];
  assert.equal(about.enabled, true);
  assert.equal(about.portraitMediaId, null);
  assert.equal(about.heroImageMediaId, 'media-hero');
  assert.ok(String(about.seoDescription).length >= 140 && String(about.seoDescription).length <= 160);
  // No invented biography numbers, testimonials or phone duplicated into the copy.
  assert.doesNotMatch(JSON.stringify(about), /\d+\s*(năm|khách|giải|lượt)|0974045828|đánh giá|testimonial/i);
  assert.doesNotMatch(JSON.stringify(values), /Anh Đinh Vân|anh Vân|người đàn ông|Mộc Sơn Homestay|An Nhiên Retreat|4\.9|650\.000/i);
});

test('existing Admin content is skipped unless replace mode is explicit', () => {
  const values = publicBootstrapSettings(media);
  const editedHero = { ...values['home.hero'], titleLine1: 'ABCXYZ Admin đã sửa' };
  const existing = new Map([['home.hero', { value: editedHero, version: 5 }]]);
  const ordinary = planBootstrapSettings(values, existing, false);
  assert.equal(ordinary.find((item) => item.key === 'home.hero')?.action, 'skip');
  assert.equal(ordinary.filter((item) => item.action === 'create').length, 25);
  const explicit = planBootstrapSettings(values, existing, true);
  const hero = explicit.find((item) => item.key === 'home.hero');
  assert.equal(hero?.action, 'replace');
  assert.equal(hero?.version, 5);
  assert.equal((hero?.before as { titleLine1: string }).titleLine1, 'ABCXYZ Admin đã sửa');
  assert.equal((hero?.after as { titleLine1: string }).titleLine1, 'Lưu trú giữa thiên nhiên,');
  const scoped = planBootstrapSettings(values, existing, true, ['brand.']);
  assert.equal(scoped.find((item) => item.key === 'home.hero')?.action, 'skip');
  assert.ok(scoped.filter((item) => item.action !== 'skip').every((item) => item.key.startsWith('brand.')));
});
