import 'server-only';

import type { PublicSiteData } from '@/lib/api/public';

type Dict = Record<string, unknown>;

function object(value: unknown): Dict {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {};
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host.endsWith('.test')
    || host.endsWith('.invalid')
    || host.endsWith('.vercel.app')
    || ['web', 'api', 'gateway', 'postgres', 'redis'].includes(host)
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

/** Accept only an HTTPS origin; paths, credentials, ports, queries and fragments are rejected. */
export function normalizeApprovedOrigin(value: unknown): string | null {
  if (!nonEmpty(value)) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
    if (url.pathname !== '/' || isUnsafeHostname(url.hostname) || !url.hostname.includes('.')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export interface SeoPolicy {
  canonicalOrigin: string | null;
  indexingAllowed: boolean;
  blockedReasons: string[];
}

/**
 * Database opt-in is necessary, but never sufficient: preview/local deployments
 * need an explicit server-side allow switch and the exact Owner-approved origin.
 */
export function getSeoPolicy(site: PublicSiteData): SeoPolicy {
  const seo = object(site.seo);
  const dataMode = object(site['ops.dataMode']);
  const configuredOrigin = normalizeApprovedOrigin(seo.canonicalBase);
  const approvedOrigin = normalizeApprovedOrigin(process.env.SEO_APPROVED_CANONICAL_ORIGIN);
  const deploymentAllows = process.env.SEO_INDEXING_ALLOWED === 'true';
  const blockedReasons: string[] = [];

  if (!deploymentAllows) blockedReasons.push('Môi trường triển khai chưa cho phép index');
  if (seo.robotsIndex !== true) blockedReasons.push('Cài đặt website đang tắt index');
  if (!configuredOrigin) blockedReasons.push('Chưa có origin HTTPS hợp lệ trong cài đặt SEO');
  if (!approvedOrigin || configuredOrigin !== approvedOrigin) blockedReasons.push('Origin chưa khớp domain được Owner duyệt ở môi trường');
  if (dataMode.usesDemoData === true) blockedReasons.push('Website đang được đánh dấu dùng dữ liệu mẫu');
  if (!nonEmpty(site.identity?.name) || !nonEmpty(site.identity?.description)) {
    blockedReasons.push('Thiếu tên hoặc mô tả thương hiệu đã xác nhận');
  }

  const canonicalOrigin = configuredOrigin && approvedOrigin === configuredOrigin ? configuredOrigin : null;
  return {
    canonicalOrigin,
    indexingAllowed: deploymentAllows
      && seo.robotsIndex === true
      && canonicalOrigin !== null
      && dataMode.usesDemoData !== true
      && nonEmpty(site.identity?.name)
      && nonEmpty(site.identity?.description),
    blockedReasons,
  };
}

const ALWAYS_NOINDEX = /^\/(?:admin|api|dat-phong|tai-khoan|tra-cuu)(?:\/|$)/i;
const FILTER_KEYS = new Set([
  'q', 'query', 'search', 'area', 'region', 'destination', 'guests', 'adults', 'children', 'rooms',
  'minprice', 'maxprice', 'sort', 'view', 'category', 'tag', 'checkin', 'checkout', 'check_in', 'check_out',
]);
const DETAIL_UI_KEYS = new Set(['date', 'dates', 'adults', 'children', 'rooms', 'checkin', 'checkout', 'check_in', 'check_out']);

export interface QuerySeoPolicy {
  noindex: boolean;
  canonicalPath?: string;
}

/** Keep tracking parameters out of canonical URLs; facet/search URLs are noindex without a canonical. */
export function classifySeoQuery(path: string, params: URLSearchParams): QuerySeoPolicy {
  if (ALWAYS_NOINDEX.test(path)) return { noindex: true };
  const keys = [...params.keys()];
  if (!keys.length) return { noindex: false, canonicalPath: path };
  if (keys.every((key) => /^utm_/i.test(key) || ['gclid', 'fbclid', 'msclkid'].includes(key.toLowerCase()))) {
    return { noindex: false, canonicalPath: path };
  }
  if (keys.every((key) => DETAIL_UI_KEYS.has(key.toLowerCase())) && /^\/(?:phong-nghi|combo-du-lich|diem-den|bai-viet|chuyen-trang)\/[^/]+\/?$/.test(path)) {
    return { noindex: false, canonicalPath: path };
  }
  if (keys.some((key) => FILTER_KEYS.has(key.toLowerCase())) || keys.some((key) => !/^utm_/i.test(key))) {
    return { noindex: true };
  }
  return { noindex: false, canonicalPath: path };
}

export function canonicalUrl(origin: string, path: string): string | null {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#')) return null;
  try {
    const url = new URL(path, `${origin}/`);
    if (url.origin !== origin) return null;
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

export function getSiteName(site: PublicSiteData): string {
  return site.identity.shortName?.trim() || site.identity.name?.trim() || 'Đinh Vân Booking';
}

export function isSeoSchemaAllowed(
  site: PublicSiteData,
  path: string,
  options: {
    eligible: boolean;
    noindex?: boolean;
    searchParams?: Record<string, string | string[] | undefined>;
  },
): boolean {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(options.searchParams ?? {})) {
    for (const value of Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]) params.append(key, value);
  }
  return getSeoPolicy(site).indexingAllowed
    && options.eligible
    && options.noindex !== true
    && !classifySeoQuery(path, params).noindex;
}
