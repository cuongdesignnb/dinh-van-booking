/** Keep these rules in sync with backend/src/content/slug.ts; the API is authoritative. */
const RESERVED = new Set([
  'admin', 'api', 'media', '_next', 'static', 'robots', 'sitemap', 'favicon', 'icon', 'apple-icon',
  'opengraph-image', 'twitter-image', 'manifest', 'phong-nghi', 'combo-du-lich', 'diem-den',
  'bai-viet', 'chuyen-trang', 'dat-phong', 'lien-he', 'tai-khoan', 'tra-cuu',
]);

export type PublicContentKind = 'stay' | 'combo' | 'destination' | 'article' | 'page';
export type SlugMode = 'auto' | 'manual';

export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');
  return base || 'muc';
}

export function slugFromTitle(title: string): string {
  return title.trim() ? slugify(title) : '';
}

export function isReservedSlug(value: string): boolean {
  return RESERVED.has(slugify(value));
}

export function publicPath(kind: PublicContentKind, slug: string): string {
  const section: Record<PublicContentKind, string> = {
    stay: '/phong-nghi', combo: '/combo-du-lich', destination: '/diem-den',
    article: '/bai-viet', page: '',
  };
  return `${section[kind]}/${slug}`;
}

/** The title only drives slug on an unsaved form that is still in auto mode. */
export function withTitle<T extends { title: string; slug: string; slugMode: SlugMode }>(
  form: T,
  title: string,
  isCreate: boolean,
): T {
  return {
    ...form,
    title,
    slug: isCreate && form.slugMode === 'auto' ? slugFromTitle(title) : form.slug,
  };
}
