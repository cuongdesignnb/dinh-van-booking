import { expect, test } from '@playwright/test';
import type { PublicArticleRecord, PublicSiteData } from '@/lib/api/public';
import type { Destination } from '@/data/destinations';
import type { Stay } from '@/data/stays';
import { ALWAYS_NOINDEX_PATTERN, contentPath, HUMAN_SEGMENT_PATTERN, PUBLIC_ROUTES, ADMIN_ROUTES, RESERVED_ROOT_SEGMENTS } from '@/lib/routes';
import { canonicalUrl, classifySeoQuery, getSeoPolicy, normalizeApprovedOrigin } from '@/lib/seo/policy-core';
import {
  buildAboutGraph, buildArticleGraph, buildCollectionGraph, buildComboGraph, buildContactGraph,
  buildDestinationGraph, buildSiteGraph, buildStayGraph, serializeJsonLd, type JsonValue,
} from '@/lib/seo/schema-core';
import { lodgingSchemaType, schemaStatus } from '@/lib/seo/schema-rules';
import { applyTitleTemplate } from '@/lib/seo/title';

const ORIGIN = 'https://cucphuongtravel.example.com';
const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const LONG = 'Nhà sàn gỗ giữa rừng Cúc Phương, phòng sạch sẽ, có bữa sáng địa phương và chủ nhà hỗ trợ lịch trình tham quan vườn quốc gia, động Người Xưa và trung tâm cứu hộ linh trưởng.';

function site(overrides: Partial<PublicSiteData> & Record<string, unknown> = {}): PublicSiteData {
  return {
    identity: { name: 'Cúc Phương Travel', shortName: 'Cúc Phương Travel', description: doc('Tư vấn và đặt phòng lưu trú quanh Cúc Phương.') as never },
    contact: { phone: '0900000000', email: 'hello@example.com', address: 'Nho Quan, Ninh Bình' },
    social: { facebook: 'https://facebook.com/example', instagram: null, youtube: null, tiktok: null },
    businessHours: {},
    seo: { canonicalBase: ORIGIN, robotsIndex: true, titleTemplate: '%s | Cúc Phương Travel' },
    media: { logo: { src: '/media/logo.webp', alt: 'Logo' } as never },
    ...overrides,
  } as PublicSiteData;
}

function withIndexingEnv<T>(fn: () => T, allowed = 'true', origin = ORIGIN): T {
  const previous = { allowed: process.env.SEO_INDEXING_ALLOWED, origin: process.env.SEO_APPROVED_CANONICAL_ORIGIN };
  process.env.SEO_INDEXING_ALLOWED = allowed;
  process.env.SEO_APPROVED_CANONICAL_ORIGIN = origin;
  try { return fn(); } finally {
    if (previous.allowed === undefined) delete process.env.SEO_INDEXING_ALLOWED; else process.env.SEO_INDEXING_ALLOWED = previous.allowed;
    if (previous.origin === undefined) delete process.env.SEO_APPROVED_CANONICAL_ORIGIN; else process.env.SEO_APPROVED_CANONICAL_ORIGIN = previous.origin;
  }
}

const nodes = (graph: JsonValue | null) => ((graph as { '@graph': Array<Record<string, JsonValue>> } | null)?.['@graph'] ?? []);
const byType = (graph: JsonValue | null, type: string) => nodes(graph).find((node) => node['@type'] === type);
const FORBIDDEN_KEYS = ['aggregateRating', 'review', 'geo', 'offers', 'priceRange', 'heldUnits', 'reservedUnits', 'available'];
function assertNoForbidden(graph: JsonValue | null) {
  const json = JSON.stringify(graph);
  for (const key of FORBIDDEN_KEYS) expect(json, key).not.toContain(`"${key}"`);
}

test.describe('route registry', () => {
  test('every registered human route segment is vi-ascii', () => {
    for (const path of [...Object.values(PUBLIC_ROUTES), ...Object.values(ADMIN_ROUTES)]) {
      for (const segment of path.split('/').filter(Boolean)) expect(segment, path).toMatch(HUMAN_SEGMENT_PATTERN);
    }
    expect(contentPath('stay', 'nha-san')).toBe('/phong-nghi/nha-san');
    expect(contentPath('page', 'chinh-sach')).toBe('/chinh-sach');
    for (const segment of ['phong-nghi', 'doi-tac', 'lich-phong', 've-minh', 'admin']) expect(RESERVED_ROOT_SEGMENTS).toContain(segment);
  });

  test('private routes are always noindex', () => {
    for (const path of ['/admin', '/admin/phong-nghi', '/dat-phong', '/doi-tac', '/doi-tac/chinh-sua', '/lich-phong', '/api/v1/x']) {
      expect(ALWAYS_NOINDEX_PATTERN.test(path), path).toBe(true);
      expect(classifySeoQuery(path, new URLSearchParams()).noindex, path).toBe(true);
    }
    for (const path of ['/', '/phong-nghi', '/phong-nghi/nha-san', '/lien-he', '/ve-minh', '/doi-tac-du-lich']) {
      expect(ALWAYS_NOINDEX_PATTERN.test(path), path).toBe(false);
    }
  });
});

test.describe('canonical / query policy (§18–19, §60)', () => {
  test('clean page, tracking, filters, dates', () => {
    const q = (path: string, query: string) => classifySeoQuery(path, new URLSearchParams(query));
    expect(q('/phong-nghi', '')).toEqual({ noindex: false, canonicalPath: '/phong-nghi' });
    expect(q('/phong-nghi', 'utm_source=fb&utm_medium=cpc&gclid=1&fbclid=2&msclkid=3')).toEqual({ noindex: false, canonicalPath: '/phong-nghi' });
    for (const query of ['sort=price', 'view=list', 'minPrice=100000', 'checkIn=2026-11-01', 'q=nha', 'page=2', 'foo=bar']) {
      expect(q('/phong-nghi', query).noindex, query).toBe(true);
      expect(q('/phong-nghi', query).canonicalPath, query).toBeUndefined();
    }
    expect(q('/lich-phong', 'checkIn=2026-11-01').noindex).toBe(true);
    expect(q('/phong-nghi/nha-san', 'checkIn=2026-11-01&checkOut=2026-11-02&adults=2')).toEqual({ noindex: false, canonicalPath: '/phong-nghi/nha-san' });
    expect(q('/phong-nghi/nha-san', 'sort=x').noindex).toBe(true);
  });

  test('canonical URL: absolute, lowercase, no trailing slash, no query, approved origin only', () => {
    expect(canonicalUrl(ORIGIN, '/phong-nghi/')).toBe(`${ORIGIN}/phong-nghi`);
    expect(canonicalUrl(ORIGIN, '/Phong-Nghi/Nha-San')).toBe(`${ORIGIN}/phong-nghi/nha-san`);
    expect(canonicalUrl(ORIGIN, '/')).toBe(`${ORIGIN}/`);
    expect(canonicalUrl(ORIGIN, '/phong-nghi?utm_source=x')).toBeNull();
    expect(canonicalUrl(ORIGIN, '//evil.example.com/x')).toBeNull();
    expect(canonicalUrl(ORIGIN, 'https://evil.example.com/x')).toBeNull();
  });

  test('approved origin rejects http, local, docker and preview hosts', () => {
    expect(normalizeApprovedOrigin('https://cucphuongtravel.com')).toBe('https://cucphuongtravel.com');
    expect(normalizeApprovedOrigin('https://cucphuongtravel.com/')).toBe('https://cucphuongtravel.com');
    for (const bad of ['http://cucphuongtravel.com', 'https://localhost', 'https://web', 'https://api', 'https://127.0.0.1', 'https://cucphuongtravel.com:8443', 'https://x.vercel.app', 'https://cucphuongtravel.com/path', 'javascript:alert(1)', 'data:text/html,x']) {
      expect(normalizeApprovedOrigin(bad), bad).toBeNull();
    }
  });
});

test.describe('index gate (§17, §66)', () => {
  test('a rich-document brand description no longer blocks indexing once every opt-in is set', () => {
    const policy = withIndexingEnv(() => getSeoPolicy(site()));
    expect(policy.blockedReasons).toEqual([]);
    expect(policy.indexingAllowed).toBe(true);
    expect(policy.canonicalOrigin).toBe(ORIGIN);
  });

  test('stays closed without env opt-in, DB toggle, matching origin, or with demo data', () => {
    expect(withIndexingEnv(() => getSeoPolicy(site()), 'false').indexingAllowed).toBe(false);
    expect(withIndexingEnv(() => getSeoPolicy(site({ seo: { canonicalBase: ORIGIN, robotsIndex: false } }))).indexingAllowed).toBe(false);
    expect(withIndexingEnv(() => getSeoPolicy(site()), 'true', 'https://other.example.com').indexingAllowed).toBe(false);
    expect(withIndexingEnv(() => getSeoPolicy(site({ 'ops.dataMode': { usesDemoData: true } }))).indexingAllowed).toBe(false);
    expect(withIndexingEnv(() => getSeoPolicy(site({ identity: { name: 'Cúc Phương Travel', description: doc('') as never } }))).indexingAllowed).toBe(false);
  });
});

test.describe('title policy (§21)', () => {
  test('brand from settings, never duplicated', () => {
    expect(applyTitleTemplate('Nhà Sàn Forest Home', '%s | Cúc Phương Travel', 'Cúc Phương Travel')).toBe('Nhà Sàn Forest Home | Cúc Phương Travel');
    expect(applyTitleTemplate('Cúc Phương Travel — Cúc Phương, Ninh Bình', '%s | Cúc Phương Travel', 'Cúc Phương Travel')).toBe('Cúc Phương Travel — Cúc Phương, Ninh Bình');
    expect(applyTitleTemplate('Phòng nghỉ', null, 'Thương hiệu Mới')).toBe('Phòng nghỉ | Thương hiệu Mới');
  });
});

test.describe('schema graph (§26–§41, §62)', () => {
  test('home: Organization + WebSite + WebPage with stable ids; nothing when the gate is closed', () => {
    const graph = withIndexingEnv(() => buildSiteGraph(site(), { path: '/', title: 'Cúc Phương Travel' }));
    expect(byType(graph, 'Organization')?.['@id']).toBe(`${ORIGIN}/#organization`);
    expect(byType(graph, 'WebSite')?.['@id']).toBe(`${ORIGIN}/#website`);
    expect(byType(graph, 'WebPage')?.['@id']).toBe(`${ORIGIN}/#webpage`);
    expect(byType(graph, 'Organization')?.telephone).toBeUndefined();
    expect(byType(graph, 'TravelAgency')).toBeUndefined();
    expect(withIndexingEnv(() => buildSiteGraph(site(), { path: '/', title: 'x' }), 'false')).toBeNull();
  });

  test('TravelAgency only in Owner-verified mode with real phone + address', () => {
    const verified = site({ 'seo.structuredData': { core: true, localBusiness: true }, 'about.page': { areaServed: 'Cúc Phương, Nho Quan' } });
    const graph = withIndexingEnv(() => buildSiteGraph(verified, { path: '/', title: 'x' }));
    const agency = byType(graph, 'TravelAgency');
    expect(agency?.['@id']).toBe(`${ORIGIN}/#organization`);
    expect(agency?.telephone).toBe('0900000000');
    expect(agency?.address).toEqual({ '@type': 'PostalAddress', streetAddress: 'Nho Quan, Ninh Bình', addressCountry: 'VN' });
    expect(agency?.areaServed).toEqual([{ '@type': 'Place', name: 'Cúc Phương' }, { '@type': 'Place', name: 'Nho Quan' }]);
    const noPhone = site({ 'seo.structuredData': { localBusiness: true }, contact: { address: 'Nho Quan' } });
    expect(byType(withIndexingEnv(() => buildSiteGraph(noPhone, { path: '/', title: 'x' })), 'TravelAgency')).toBeUndefined();
  });

  test('collection: CollectionPage + BreadcrumbList + ItemList of current URLs', () => {
    const graph = withIndexingEnv(() => buildCollectionGraph(site(), { path: '/phong-nghi', title: 'Phòng nghỉ', items: [{ name: 'Nhà sàn', href: '/phong-nghi/nha-san' }] }));
    expect(byType(graph, 'CollectionPage')?.['@id']).toBe(`${ORIGIN}/phong-nghi#webpage`);
    expect(byType(graph, 'BreadcrumbList')?.['@id']).toBe(`${ORIGIN}/phong-nghi#breadcrumb`);
    expect(byType(graph, 'ItemList')?.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, name: 'Nhà sàn', url: `${ORIGIN}/phong-nghi/nha-san` }]);
    expect(withIndexingEnv(() => buildCollectionGraph(site(), { path: '/phong-nghi', title: 'x', items: [] }))).toBeNull();
  });

  const stay = {
    id: 's1', slug: 'nha-san', name: 'Nhà sàn Forest', type: 'resort', address: 'Cúc Phương, Nho Quan', description: LONG,
    descriptionDocument: doc(LONG), image: { src: '/media/cover.webp', alt: 'Nhà sàn' }, amenities: ['wifi', 'breakfast'],
    amenityLabels: { wifi: 'Wi-Fi miễn phí', breakfast: 'Bữa sáng' }, rating: 4.9, reviewCount: 12, checkInTime: '14:00', checkOutTime: '12h00',
    mapPos: { x: 40, y: 20 }, isDemo: false, noindex: false,
  } as unknown as Stay;

  test('stay: lodging subtype, url#lodging, visible facts only, no rating/geo/offer', () => {
    const graph = withIndexingEnv(() => buildStayGraph(site(), stay, '/phong-nghi/nha-san', { checkInTime: '14:00', checkOutTime: null }));
    const lodging = byType(graph, 'Resort');
    expect(lodging?.['@id']).toBe(`${ORIGIN}/phong-nghi/nha-san#lodging`);
    expect(lodging?.url).toBe(`${ORIGIN}/phong-nghi/nha-san`);
    expect(lodging?.checkinTime).toBe('14:00:00');
    expect(lodging?.checkoutTime).toBeUndefined();
    expect(lodging?.amenityFeature).toHaveLength(2);
    expect(byType(graph, 'WebPage')?.mainEntity).toEqual({ '@id': `${ORIGIN}/phong-nghi/nha-san#lodging` });
    expect((byType(graph, 'BreadcrumbList')?.itemListElement as JsonValue[]).length).toBe(3);
    assertNoForbidden(graph);
    expect(lodgingSchemaType('homestay')).toBe('LodgingBusiness');
    expect(lodgingSchemaType('villa')).toBe('LodgingBusiness');
    expect(lodgingSchemaType('hotel')).toBe('Hotel');
    expect(withIndexingEnv(() => buildStayGraph(site(), { ...stay, noindex: true } as Stay, '/phong-nghi/nha-san'))).toBeNull();
    expect(withIndexingEnv(() => buildStayGraph(site(), { ...stay, isDemo: true } as Stay, '/phong-nghi/nha-san'))).toBeNull();
  });

  test('combo: TouristTrip url#trip with itinerary, no Offer', () => {
    const graph = withIndexingEnv(() => buildComboGraph(site(), {
      id: 'c1', title: 'Combo 2N1Đ', subtitle: 'Rừng và hang động', image: { src: '/media/c.webp', alt: 'c' },
      itinerary: [{ day: 'Ngày 1', items: ['Nhận phòng'] }], body: doc(LONG),
    }, '/combo-du-lich/combo-2n1d'));
    expect(byType(graph, 'TouristTrip')?.['@id']).toBe(`${ORIGIN}/combo-du-lich/combo-2n1d#trip`);
    assertNoForbidden(graph);
  });

  test('destination: TouristDestination url#destination, illustrative map pins never become geo', () => {
    const destination = { id: 'd1', name: 'Động Người Xưa', summary: 'Hang động', description: LONG, body: doc(LONG), image: { src: '/media/d.webp', alt: 'd' }, mapPos: { x: 10, y: 20 }, isDemo: false } as unknown as Destination;
    const graph = withIndexingEnv(() => buildDestinationGraph(site(), destination, '/diem-den/dong-nguoi-xua'));
    expect(byType(graph, 'TouristDestination')?.['@id']).toBe(`${ORIGIN}/diem-den/dong-nguoi-xua#destination`);
    assertNoForbidden(graph);
  });

  test('article: BlogPosting with a real Person author and dates; without author no BlogPosting', () => {
    const article = {
      id: 'a1', slug: 'mua-buom', path: '/bai-viet/mua-buom', title: 'Mùa bướm Cúc Phương', excerpt: 'x', body: doc(LONG), metaTitle: null, metaDescription: 'Mô tả',
      noindex: false, cover: { src: '/media/a.webp', alt: 'a' }, authorName: 'Đinh Vân', readMinutes: 4, firstPublishedAt: '2026-10-01T00:00:00Z', lastPublicChangedAt: '2026-10-02T00:00:00Z', isDemo: false,
    } as unknown as PublicArticleRecord;
    const graph = withIndexingEnv(() => buildArticleGraph(site(), article, article.path));
    const posting = byType(graph, 'BlogPosting');
    expect(posting?.['@id']).toBe(`${ORIGIN}/bai-viet/mua-buom#article`);
    expect(posting?.author).toEqual({ '@type': 'Person', name: 'Đinh Vân' });
    expect(posting?.publisher).toEqual({ '@id': `${ORIGIN}/#organization` });
    expect(posting?.inLanguage).toBe('vi-VN');
    expect(byType(withIndexingEnv(() => buildArticleGraph(site(), { ...article, authorName: null }, article.path)), 'BlogPosting')).toBeUndefined();
  });

  test('contact: ContactPage + breadcrumb; contact point only from visible data', () => {
    const graph = withIndexingEnv(() => buildContactGraph(site(), { path: '/lien-he', title: 'Liên hệ', visible: { telephone: '0900000000', email: null } }));
    expect(byType(graph, 'ContactPage')?.['@id']).toBe(`${ORIGIN}/lien-he#webpage`);
    expect(byType(graph, 'Organization')?.contactPoint).toEqual({ '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: 'vi', telephone: '0900000000' });
    expect(byType(graph, 'BreadcrumbList')).toBeTruthy();
  });

  test('about: AboutPage, Person worksFor the site Organization (no inline TravelAgency)', () => {
    const graph = withIndexingEnv(() => buildAboutGraph(site(), { path: '/ve-minh', title: 'Về mình', person: { name: 'Đinh Vân' }, faqs: [{ question: 'Q?', answer: 'A.' }] }));
    expect(byType(graph, 'AboutPage')).toBeTruthy();
    expect(byType(graph, 'Person')?.worksFor).toEqual({ '@id': `${ORIGIN}/#organization` });
    expect(JSON.stringify(graph)).not.toContain('TravelAgency');
    expect(byType(graph, 'FAQPage')).toBeTruthy();
  });

  test('serializer cannot break out of the script tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>\u2028' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script>');
    expect(JSON.parse(out).name).toContain('</script>');
  });
});

test.describe('Admin schema status mirrors the builders', () => {
  test('stay without cover shows a missing input; rating is never eligible', () => {
    const status = schemaStatus({ kind: 'stay', hasSlug: true, hasCover: false, bodyTextLength: 300, noindex: false, propertyKind: 'homestay', roomTypeCount: 1 });
    expect(status.find((item) => item.type === 'LodgingBusiness')).toMatchObject({ ok: false, note: 'thiếu ảnh đại diện' });
    expect(status.find((item) => item.type === 'AggregateRating')?.ok).toBe(false);
    expect(schemaStatus({ kind: 'article', hasSlug: false, hasCover: true, bodyTextLength: 300, noindex: false, authorName: 'A' }).find((item) => item.type === 'BreadcrumbList')?.ok).toBe(false);
    expect(schemaStatus({ kind: 'combo', hasSlug: true, hasCover: true, bodyTextLength: 10, noindex: true })).toEqual([{ type: 'JSON-LD', ok: false, note: 'trang đang noindex nên không phát schema' }]);
  });
});
