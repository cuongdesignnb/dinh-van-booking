import type { Destination } from '@/data/destinations';
import type { Stay } from '@/data/stays';
import type { PublicSiteData } from '@/lib/api/public';
import type { PublicArticleRecord } from '@/lib/api/public';
import { canonicalUrl, getSiteName, normalizeApprovedOrigin } from './policy-core';
import { getSeoPolicy } from './policy-core';
import { isSubstantivePublicContent } from './content';
import { lodgingSchemaType } from './schema-rules';
import { richDocumentToText } from '@/lib/content/rich-document';
import { PUBLIC_ROUTES } from '@/lib/routes';

/*
 * JSON-LD graph builders. Rules (spec §26–§40):
 * - server rendered, built only from published DB data that is also visible on the page;
 * - stable ids: `${origin}/#organization`, `${origin}/#website`, `${url}#webpage`,
 *   `${url}#breadcrumb`, entities `${url}#lodging|#trip|#destination|#article`;
 * - never: ratings/reviews (no first-party review workflow), Offer/price
 *   (`seo.structuredData.offers` is off), GeoCoordinates (map pins are
 *   illustrative), VacationRental, private/internal counters;
 * - TravelAgency only when the Owner explicitly marks the business data verified
 *   (`seo.structuredData.localBusiness`) and name, phone and address exist.
 */

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function serializeJsonLd(value: JsonValue): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function siteOrigin(site: PublicSiteData): string | null {
  const policy = getSeoPolicy(site);
  if (!policy.indexingAllowed || !policy.canonicalOrigin) return null;
  const structured = site['seo.structuredData'] as { core?: unknown } | undefined;
  if (structured?.core === false) return null;
  const origin = normalizeApprovedOrigin(site.seo.canonicalBase);
  const approved = normalizeApprovedOrigin(process.env.SEO_APPROVED_CANONICAL_ORIGIN);
  return origin && origin === approved ? origin : null;
}

function abs(origin: string, path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('https://')) {
    try { return new URL(path).protocol === 'https:' ? path : undefined; } catch { return undefined; }
  }
  return canonicalUrl(origin, path) ?? undefined;
}

function imageList(origin: string, image?: { src?: string; alt?: string } | null): string[] | undefined {
  const url = abs(origin, image?.src);
  return url ? [url] : undefined;
}

function text(value: unknown): string {
  return richDocumentToText(value);
}

/** `14:00` / `14h00` → `14:00:00`; anything else is omitted rather than guessed. */
function schemaTime(value: string | null | undefined): string | undefined {
  const match = value?.trim().match(/^([01]\d|2[0-3])[:h]([0-5]\d)$/i);
  return match ? `${match[1]}:${match[2]}:00` : undefined;
}

function postalAddress(address: string | null | undefined): JsonValue | undefined {
  const street = address?.trim();
  return street ? { '@type': 'PostalAddress', streetAddress: street, addressCountry: 'VN' } : undefined;
}

/** Verified local-business mode: explicit Owner flag plus real, visible name/phone/address. */
function verifiedBusiness(site: PublicSiteData): { telephone: string; address: string; email?: string; areaServed: string[] } | null {
  const structured = (site['seo.structuredData'] ?? {}) as { localBusiness?: unknown };
  if (structured.localBusiness !== true) return null;
  const telephone = text(site.contact?.phone) || text(site.contact?.hotline);
  const address = text(site.contact?.address);
  if (!telephone || !address || !text(site.identity.name)) return null;
  const about = (site['about.page'] ?? {}) as { areaServed?: unknown };
  // `about.page.areaServed` is the Admin's comma-separated list, also shown on /ve-minh.
  const areaServed = (Array.isArray(about.areaServed) ? about.areaServed.map(text) : text(about.areaServed).split(',')).map((area) => area.trim()).filter(Boolean);
  const email = text(site.contact?.email);
  return { telephone, address, ...(email ? { email } : {}), areaServed };
}

function graphNodes(graph: JsonValue): JsonValue[] {
  return (graph as { '@graph': JsonValue[] })['@graph'];
}

function findNode(graph: JsonValue, type: string): Record<string, JsonValue> | undefined {
  return graphNodes(graph).find((node) => typeof node === 'object' && node !== null && (node as Record<string, JsonValue>)['@type'] === type) as Record<string, JsonValue> | undefined;
}

export function buildSiteGraph(site: PublicSiteData, options: { path: string; title: string; description?: string | null; breadcrumbs?: Array<{ label: string; href?: string }> }): JsonValue | null {
  const origin = siteOrigin(site);
  const name = site.identity.name?.trim();
  const pageUrl = origin && canonicalUrl(origin, options.path);
  if (!origin || !name || !pageUrl) return null;

  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const graph: JsonValue[] = [];
  const media = site.media ?? {};
  const logo = media.logo?.src ? abs(origin, media.logo.src) : undefined;
  const socialUrls = Object.values(site.social ?? {}).filter((value): value is string => typeof value === 'string' && /^https:\/\//.test(value));

  const business = verifiedBusiness(site);
  graph.push({
    '@type': business ? 'TravelAgency' : 'Organization',
    '@id': organizationId,
    name,
    url: `${origin}/`,
    ...(richDocumentToText(site.identity.description) ? { description: richDocumentToText(site.identity.description) } : {}),
    ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}),
    ...(socialUrls.length ? { sameAs: socialUrls } : {}),
    ...(business ? {
      telephone: business.telephone,
      ...(business.email ? { email: business.email } : {}),
      address: postalAddress(business.address)!,
      ...(business.areaServed.length ? { areaServed: business.areaServed.map((area) => ({ '@type': 'Place', name: area })) } : {}),
    } : {}),
  });
  graph.push({ '@type': 'WebSite', '@id': websiteId, name: getSiteName(site), url: `${origin}/`, publisher: { '@id': organizationId }, inLanguage: 'vi-VN' });
  graph.push({
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: options.title,
    ...(options.description ? { description: options.description } : {}),
    inLanguage: 'vi-VN',
    isPartOf: { '@id': websiteId },
    ...(options.breadcrumbs?.length ? { breadcrumb: { '@id': `${pageUrl}#breadcrumb` } } : {}),
  });

  const crumbs = options.breadcrumbs ?? [];
  if (crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        ...(crumb.href ? { item: abs(origin, crumb.href) } : {}),
      })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildCollectionGraph(
  site: PublicSiteData,
  options: { path: string; title: string; description?: string | null; items: Array<{ name: string; href: string }> },
): JsonValue | null {
  if (!options.items.length) return null;
  const baseGraph = buildSiteGraph(site, { ...options, breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: options.title }] });
  if (!baseGraph) return null;
  const graph = graphNodes(baseGraph);
  const page = findNode(baseGraph, 'WebPage');
  const origin = siteOrigin(site)!;
  const pageUrl = canonicalUrl(origin, options.path)!;
  if (page) {
    page['@type'] = 'CollectionPage';
    page.mainEntity = { '@id': `${pageUrl}#itemlist` };
  }
  graph.push({
    '@type': 'ItemList',
    '@id': `${pageUrl}#itemlist`,
    itemListElement: options.items.flatMap((item, index) => {
      const url = abs(origin, item.href);
      return url ? [{ '@type': 'ListItem', position: index + 1, name: item.name, url }] : [];
    }),
  });
  return baseGraph;
}

export function buildStayGraph(
  site: PublicSiteData,
  stay: Stay,
  path: string,
  visible: { checkInTime?: string | null; checkOutTime?: string | null } = {},
): JsonValue | null {
  const graph = buildSiteGraph(site, { path, title: stay.name, description: stay.metaDescription ?? stay.description, breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: 'Phòng nghỉ', href: PUBLIC_ROUTES.stays }, { label: stay.name }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  const image = origin ? imageList(origin, stay.image) : undefined;
  if (!graph || !url || stay.isDemo || stay.noindex || !stay.id || !stay.name.trim() || !image?.length || !isSubstantivePublicContent(stay.descriptionDocument ?? stay.description)) return null;
  const lodgingId = `${url}#lodging`;
  const page = findNode(graph, 'WebPage');
  if (page) page.mainEntity = { '@id': lodgingId };
  const amenities = (stay.amenities ?? [])
    .map((id) => stay.amenityLabels?.[id]?.trim())
    .filter((label): label is string => !!label)
    .map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true }));
  const checkinTime = schemaTime(visible.checkInTime);
  const checkoutTime = schemaTime(visible.checkOutTime);
  const address = postalAddress(stay.address);
  graphNodes(graph).push({
    '@type': lodgingSchemaType(stay.type),
    '@id': lodgingId,
    name: stay.name,
    url,
    ...(stay.description ? { description: stay.description } : {}),
    image,
    ...(address ? { address } : {}),
    ...(checkinTime ? { checkinTime } : {}),
    ...(checkoutTime ? { checkoutTime } : {}),
    ...(amenities.length ? { amenityFeature: amenities } : {}),
  });
  return graph;
}

export function buildComboGraph(site: PublicSiteData, combo: {
  id: string;
  title: string;
  subtitle: string;
  image: { src: string; alt: string } | null;
  itinerary: Array<{ day: string; items: string[] }>;
  body?: unknown;
  noindex?: boolean;
  isDemo?: boolean;
}, path: string): JsonValue | null {
  if (combo.isDemo || combo.noindex || !combo.itinerary?.length || !combo.image || !isSubstantivePublicContent(combo.body)) return null;
  const graph = buildSiteGraph(site, { path, title: combo.title, description: combo.subtitle, breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: 'Combo du lịch', href: PUBLIC_ROUTES.combos }, { label: combo.title }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  if (!graph || !origin || !url) return null;
  const image = imageList(origin, combo.image);
  const page = findNode(graph, 'WebPage');
  if (page) page.mainEntity = { '@id': `${url}#trip` };
  graphNodes(graph).push({
    '@type': 'TouristTrip',
    '@id': `${url}#trip`,
    name: combo.title,
    url,
    ...(combo.subtitle ? { description: combo.subtitle } : {}),
    ...(image ? { image } : {}),
    itinerary: combo.itinerary.map((day) => ({ '@type': 'ItemList', name: day.day, itemListElement: day.items.map((name, index) => ({ '@type': 'ListItem', position: index + 1, name })) })),
  });
  return graph;
}

export function buildDestinationGraph(site: PublicSiteData, destination: Destination, path: string): JsonValue | null {
  const graph = buildSiteGraph(site, { path, title: destination.name, description: destination.summary, breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: 'Điểm đến', href: PUBLIC_ROUTES.destinations }, { label: destination.name }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  if (!graph || !origin || !url || destination.isDemo || destination.noindex || !isSubstantivePublicContent(destination.body ?? destination.description) || !destination.image) return null;
  const image = imageList(origin, destination.image);
  const page = findNode(graph, 'WebPage');
  if (page) page.mainEntity = { '@id': `${url}#destination` };
  // No GeoCoordinates: destination map X/Y are illustrative pin positions, not lat/lng.
  graphNodes(graph).push({
    '@type': 'TouristDestination',
    '@id': `${url}#destination`,
    name: destination.name,
    url,
    ...(destination.summary ? { description: destination.summary } : {}),
    ...(image ? { image } : {}),
  });
  return graph;
}

export function buildArticleGraph(site: PublicSiteData, article: PublicArticleRecord, path: string): JsonValue | null {
  if (article.isDemo || article.noindex) return null;
  const graph = buildSiteGraph(site, {
    path,
    title: article.title,
    description: article.metaDescription ?? article.excerpt,
    breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: 'Bài viết', href: PUBLIC_ROUTES.articles }, { label: article.title }],
  });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  const author = article.authorName?.trim();
  const datePublished = validDate(article.firstPublishedAt);
  const cover = article.cover;
  if (!graph || !origin || !url || !author || !datePublished || !cover || !isSubstantivePublicContent(article.body)) return graph;

  const image = imageList(origin, cover);
  if (!image) return graph;
  const organizationId = `${origin}/#organization`;
  const nodes = graphNodes(graph);
  const page = findNode(graph, 'WebPage');
  if (page) page.mainEntity = { '@id': `${url}#article` };
  nodes.push({
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${url}#webpage` },
    headline: article.title,
    ...(article.metaDescription || article.excerpt ? { description: article.metaDescription ?? article.excerpt } : {}),
    image,
    datePublished,
    ...(validDate(article.lastPublicChangedAt) ? { dateModified: validDate(article.lastPublicChangedAt) } : {}),
    author: { '@type': 'Person', name: author },
    publisher: { '@id': organizationId },
    inLanguage: 'vi-VN',
  });
  return graph;
}

function validDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

/**
 * `/ve-minh`: AboutPage whose mainEntity is the advisor (Person), plus the
 * usual site graph and breadcrumb. FAQPage is added only when FAQs exist, and
 * every optional field is emitted only when it has a real value.
 */
export function buildAboutGraph(site: PublicSiteData, options: {
  path: string;
  title: string;
  description?: string | null;
  person: { name: string; jobTitle?: string | null; telephone?: string | null; image?: { src?: string } | null; description?: string | null };
  faqs?: Array<{ question: string; answer: string }>;
}): JsonValue | null {
  const graph = buildSiteGraph(site, {
    path: options.path,
    title: options.title,
    description: options.description,
    breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: 'Về mình' }],
  });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, options.path);
  const name = options.person.name.trim();
  if (!graph || !origin || !url || !name) return graph;

  const nodes = (graph as { '@graph': JsonValue[] })['@graph'];
  const page = nodes.find((node) => typeof node === 'object' && node !== null && (node as Record<string, JsonValue>)['@type'] === 'WebPage') as Record<string, JsonValue> | undefined;
  const personId = `${origin}/#advisor`;
  const image = imageList(origin, options.person.image);
  if (page) {
    page['@type'] = 'AboutPage';
    page.mainEntity = { '@id': personId };
  }
  nodes.push({
    '@type': 'Person',
    '@id': personId,
    name,
    url,
    ...(options.person.jobTitle?.trim() ? { jobTitle: options.person.jobTitle.trim() } : {}),
    ...(options.person.telephone?.trim() ? { telephone: options.person.telephone.trim() } : {}),
    ...(options.person.description?.trim() ? { description: options.person.description.trim() } : {}),
    ...(image ? { image: image[0] } : {}),
    // The business entity is the site Organization (TravelAgency only in verified mode); no inline duplicate.
    worksFor: { '@id': `${origin}/#organization` },
  });

  const faqs = (options.faqs ?? []).filter((item) => item.question.trim() && item.answer.trim());
  if (faqs.length) {
    nodes.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((item) => ({ '@type': 'Question', name: item.question.trim(), acceptedAnswer: { '@type': 'Answer', text: item.answer.trim() } })),
    });
  }
  return graph;
}

/**
 * `/lien-he`: ContactPage + BreadcrumbList; the site Organization (or verified
 * TravelAgency) carries the contact data. Phone/email are added as a
 * ContactPoint only when they are shown on the page.
 */
export function buildContactGraph(site: PublicSiteData, options: {
  path: string;
  title: string;
  description?: string | null;
  visible: { telephone?: string | null; email?: string | null };
}): JsonValue | null {
  const graph = buildSiteGraph(site, {
    path: options.path,
    title: options.title,
    description: options.description,
    breadcrumbs: [{ label: 'Trang chủ', href: PUBLIC_ROUTES.home }, { label: options.title }],
  });
  const origin = siteOrigin(site);
  if (!graph || !origin) return graph;
  const page = findNode(graph, 'WebPage');
  if (page) {
    page['@type'] = 'ContactPage';
    page.about = { '@id': `${origin}/#organization` };
  }
  const telephone = options.visible.telephone?.trim();
  const email = options.visible.email?.trim();
  const organization = graphNodes(graph).find((node) => typeof node === 'object' && node !== null && (node as Record<string, JsonValue>)['@id'] === `${origin}/#organization`) as Record<string, JsonValue> | undefined;
  if (organization && (telephone || email)) {
    organization.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'vi',
      ...(telephone ? { telephone } : {}),
      ...(email ? { email } : {}),
    };
  }
  return graph;
}
