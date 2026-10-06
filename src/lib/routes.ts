/**
 * Central route registry. Every human-facing route is Vietnamese without
 * diacritics, lowercase and hyphenated (`^[a-z0-9]+(?:-[a-z0-9]+)*$` per
 * segment). Components and SEO helpers read paths from here instead of
 * repeating strings. `npm run seo:routes` checks `src/app` against this file.
 */

export const PUBLIC_ROUTES = {
  home: '/',
  stays: '/phong-nghi',
  combos: '/combo-du-lich',
  destinations: '/diem-den',
  articles: '/bai-viet',
  staticPages: '/chuyen-trang',
  contact: '/lien-he',
  about: '/ve-minh',
  booking: '/dat-phong',
  availability: '/lich-phong',
  partner: '/doi-tac',
  partnerEdit: '/doi-tac/chinh-sua',
} as const;

export const ADMIN_ROUTES = {
  dashboard: '/admin',
  reports: '/admin/bao-cao',
  settings: '/admin/cai-dat',
  staticPages: '/admin/chuyen-trang',
  combos: '/admin/combo-du-lich',
  bookings: '/admin/dat-phong',
  destinations: '/admin/diem-den',
  partners: '/admin/doi-tac',
  partnerGrants: '/admin/doi-tac/cap-quyen',
  roomTypes: '/admin/hang-phong',
  customers: '/admin/khach-hang',
  promotions: '/admin/khuyen-mai',
  menu: '/admin/menu',
  articles: '/admin/noi-dung',
  stays: '/admin/phong-nghi',
  payments: '/admin/thanh-toan',
  media: '/admin/thu-vien-anh',
  inventory: '/admin/ton-phong',
  inquiries: '/admin/yeu-cau-tu-van',
} as const;

/** Admin sub-route segments used under the sections above. */
export const ADMIN_ACTION_SEGMENTS = ['them', 'cap-quyen'] as const;

export type PublicContentKind = 'stay' | 'combo' | 'destination' | 'article' | 'page';

/** Section of each content kind; CMS pages live at the site root (`/<slug>`). */
export const CONTENT_SECTIONS: Record<PublicContentKind, string> = {
  stay: PUBLIC_ROUTES.stays,
  combo: PUBLIC_ROUTES.combos,
  destination: PUBLIC_ROUTES.destinations,
  article: PUBLIC_ROUTES.articles,
  page: '',
};

export function contentPath(kind: PublicContentKind, slug: string): string {
  return `${CONTENT_SECTIONS[kind]}/${slug}`;
}

/**
 * Non-human paths that keep their technical names: API, media, Next.js
 * internals and well-known files.
 */
export const TECHNICAL_EXCEPTIONS = [
  '/api', '/media', '/_next', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/icon.svg', '/apple-icon.png',
] as const;

/**
 * Root segments a CMS page slug may never take. Keep in sync with
 * `RESERVED_SLUGS` in `backend/src/content/slug.ts` (checked by `npm run seo:routes`).
 */
export const RESERVED_ROOT_SEGMENTS = [
  'admin', 'api', 'media', '_next', 'static', 'robots', 'sitemap', 'favicon', 'icon', 'apple-icon',
  'opengraph-image', 'twitter-image', 'manifest', 'phong-nghi', 'combo-du-lich', 'diem-den',
  'bai-viet', 'chuyen-trang', 'dat-phong', 'lien-he', 'tai-khoan', 'tra-cuu', 've-minh',
  'doi-tac', 'lich-phong',
] as const;

/** Private / transactional routes: always noindex, never in the sitemap, no rich schema. */
export const ALWAYS_NOINDEX_PATTERN = /^\/(?:admin|api|dat-phong|doi-tac|lich-phong|tai-khoan|tra-cuu)(?:\/|$)/i;

export const HUMAN_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
