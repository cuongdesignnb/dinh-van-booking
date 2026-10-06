/**
 * Vietnamese-aware slugs. `Phòng nghỉ Cúc Phương` becomes `phong-nghi-cuc-phuong`
 * so public URLs stay readable and stable, and `đ`/`Đ` are handled explicitly
 * because Unicode decomposition leaves them untouched.
 *
 * Slugs are URL assets, independent of the title: they are only created or
 * changed by the explicit Generate action (see `slug-lifecycle.ts`).
 */

/**
 * Root segments owned by the application. Keep in sync with
 * `RESERVED_ROOT_SEGMENTS` in `src/lib/routes.ts`; `npm run seo:routes` checks both lists.
 */
export const RESERVED_SLUGS = [
  'admin', 'api', 'media', '_next', 'static', 'robots', 'sitemap', 'favicon', 'icon', 'apple-icon',
  'opengraph-image', 'twitter-image', 'manifest', 'phong-nghi', 'combo-du-lich', 'diem-den',
  'bai-viet', 'chuyen-trang', 'dat-phong', 'lien-he', 'tai-khoan', 'tra-cuu', 've-minh',
  'doi-tac', 'lich-phong',
] as const;
const RESERVED = new Set<string>(RESERVED_SLUGS);

/** Human URL segment: lowercase ASCII words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 120;

export function isValidSlug(value: string): boolean {
  return value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}

/** Like `slugify`, but returns '' instead of a placeholder when nothing usable remains. */
export function normalizeSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

export function slugify(input: string): string {
  return normalizeSlug(input) || 'muc';
}

export function isReservedSlug(input: string): boolean {
  return RESERVED.has(slugify(input));
}

/** Public path for a content node; standalone CMS pages live at /<slug>. */
const SECTION_BY_KIND: Record<string, string> = {
  stay: '/phong-nghi',
  combo: '/combo-du-lich',
  destination: '/diem-den',
  article: '/bai-viet',
  page: '',
};

export function pathForContent(kind: string, slug: string): string {
  const section = SECTION_BY_KIND[kind];
  if (section === undefined) throw new Error(`Không có đường dẫn công khai cho loại nội dung ${kind}`);
  return section ? `${section}/${slug}` : `/${slug}`;
}
