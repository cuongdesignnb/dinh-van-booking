import 'server-only';

import type { Destination } from '@/data/destinations';
import type { Stay } from '@/data/stays';
import type { PublicSiteData } from '@/lib/api/public';
import type { PublicArticleRecord } from '@/lib/api/public';
import { canonicalUrl, getSiteName, normalizeApprovedOrigin } from './policy';
import { getSeoPolicy } from './policy';
import { isSubstantivePublicContent } from './content';
import { richDocumentToText } from '@/lib/content/rich-document';

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

  graph.push({
    '@type': 'Organization',
    '@id': organizationId,
    name,
    url: `${origin}/`,
    ...(richDocumentToText(site.identity.description) ? { description: richDocumentToText(site.identity.description) } : {}),
    ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}),
    ...(socialUrls.length ? { sameAs: socialUrls } : {}),
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
  const baseGraph = buildSiteGraph(site, { ...options, breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: options.title }] });
  if (!baseGraph) return null;
  const graph = (baseGraph as { '@graph': JsonValue[] })['@graph'];
  const page = graph.find((node) => typeof node === 'object' && node !== null && (node as Record<string, JsonValue>)['@type'] === 'WebPage') as Record<string, JsonValue> | undefined;
  const origin = siteOrigin(site)!;
  if (page) page['@type'] = 'CollectionPage';
  graph.push({
    '@type': 'ItemList',
    itemListElement: options.items.flatMap((item, index) => {
      const url = abs(origin, item.href);
      return url ? [{ '@type': 'ListItem', position: index + 1, name: item.name, url }] : [];
    }),
  });
  return baseGraph;
}

export function buildStayGraph(site: PublicSiteData, stay: Stay, path: string): JsonValue | null {
  const graph = buildSiteGraph(site, { path, title: stay.name, description: stay.description, breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: 'Phòng nghỉ', href: '/phong-nghi' }, { label: stay.name }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  const image = origin ? imageList(origin, stay.image) : undefined;
  if (!graph || !url || stay.isDemo || stay.noindex || !stay.id || !stay.name.trim() || !image?.length || !isSubstantivePublicContent(stay.descriptionDocument ?? stay.description)) return null;
  const nodes = (graph as { '@graph': JsonValue[] })['@graph'];
  nodes.push({
    '@type': 'LodgingBusiness',
    '@id': `${origin}/#stay-${encodeURIComponent(stay.id)}`,
    name: stay.name,
    url,
    ...(stay.description ? { description: stay.description } : {}),
    ...(image ? { image } : {}),
    ...(stay.address ? { address: stay.address } : {}),
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
  const graph = buildSiteGraph(site, { path, title: combo.title, description: combo.subtitle, breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: 'Combo du lịch', href: '/combo-du-lich' }, { label: combo.title }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  if (!graph || !origin || !url) return null;
  const image = imageList(origin, combo.image);
  (graph as { '@graph': JsonValue[] })['@graph'].push({
    '@type': 'TouristTrip',
    '@id': `${origin}/#trip-${encodeURIComponent(combo.id)}`,
    name: combo.title,
    url,
    ...(combo.subtitle ? { description: combo.subtitle } : {}),
    ...(image ? { image } : {}),
    itinerary: combo.itinerary.map((day) => ({ '@type': 'ItemList', name: day.day, itemListElement: day.items.map((name, index) => ({ '@type': 'ListItem', position: index + 1, name })) })),
  });
  return graph;
}

export function buildDestinationGraph(site: PublicSiteData, destination: Destination, path: string): JsonValue | null {
  const graph = buildSiteGraph(site, { path, title: destination.name, description: destination.summary, breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: 'Điểm đến', href: '/diem-den' }, { label: destination.name }] });
  const origin = siteOrigin(site);
  const url = origin && canonicalUrl(origin, path);
  if (!graph || !origin || !url || destination.isDemo || destination.noindex || !isSubstantivePublicContent(destination.body ?? destination.description) || !destination.image) return null;
  const image = imageList(origin, destination.image);
  (graph as { '@graph': JsonValue[] })['@graph'].push({
    '@type': 'TouristDestination',
    '@id': `${origin}/#place-${encodeURIComponent(destination.id)}`,
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
    breadcrumbs: [{ label: 'Trang chủ', href: '/' }, { label: 'Bài viết', href: '/bai-viet' }, { label: article.title }],
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
  const nodes = (graph as { '@graph': JsonValue[] })['@graph'];
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
