import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_BOOTSTRAP_MEDIA, PUBLIC_BOOTSTRAP_MENU, publicBootstrapSettings } from './public-bootstrap';
import { parseBootstrapArgs, planBootstrapSettings } from '../seed-public-bootstrap';

const media = {
  hero: 'media-hero', promo: 'media-promo', staysHero: 'media-stays',
  destinationsHero: 'media-destinations', combosHero: 'media-combos', bookingHero: 'media-booking',
};

test('bootstrap is a separate, dry-run-first command with explicit replace', () => {
  assert.deepEqual(parseBootstrapArgs([]), { apply: false, replaceExisting: false });
  assert.deepEqual(parseBootstrapArgs(['--apply', '--replace-existing']), { apply: true, replaceExisting: true });
  assert.throws(() => parseBootstrapArgs(['--replace-existing']));
  assert.throws(() => parseBootstrapArgs(['--apply', '--dry-run']));
  assert.throws(() => parseBootstrapArgs(['--unknown']));
});

test('manifest uses only presentation settings/media and approved navigation', () => {
  const values = publicBootstrapSettings(media);
  assert.equal(Object.keys(values).length, 24);
  assert.equal(values['brand.identity'].name, 'Đinh Vân Booking');
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
  assert.deepEqual(PUBLIC_BOOTSTRAP_MENU.map((item) => item.externalUrl), ['/', '/phong-nghi', '/combo-du-lich', '/diem-den', '/lien-he']);
  assert.ok(Object.keys(values).every((key) => /^(brand\.(identity|contact)|site\.(header|footer)|home\..+|contact\.page|catalog\..+|seo\.(defaults|pages))$/.test(key)));
  assert.doesNotMatch(JSON.stringify(values), /Anh Đinh Vân|anh Vân|người đàn ông|Mộc Sơn Homestay|An Nhiên Retreat|4\.9|650\.000/i);
});

test('existing Admin content is skipped unless replace mode is explicit', () => {
  const values = publicBootstrapSettings(media);
  const editedHero = { ...values['home.hero'], titleLine1: 'ABCXYZ Admin đã sửa' };
  const existing = new Map([['home.hero', { value: editedHero, version: 5 }]]);
  const ordinary = planBootstrapSettings(values, existing, false);
  assert.equal(ordinary.find((item) => item.key === 'home.hero')?.action, 'skip');
  assert.equal(ordinary.filter((item) => item.action === 'create').length, 23);
  const explicit = planBootstrapSettings(values, existing, true);
  const hero = explicit.find((item) => item.key === 'home.hero');
  assert.equal(hero?.action, 'replace');
  assert.equal(hero?.version, 5);
  assert.equal((hero?.before as { titleLine1: string }).titleLine1, 'ABCXYZ Admin đã sửa');
  assert.equal((hero?.after as { titleLine1: string }).titleLine1, 'Đặt phòng Cúc Phương');
});
