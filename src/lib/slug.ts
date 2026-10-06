import { contentPath, RESERVED_ROOT_SEGMENTS, type PublicContentKind } from '@/lib/routes';

export type { PublicContentKind } from '@/lib/routes';

const RESERVED = new Set<string>(RESERVED_ROOT_SEGMENTS);

/**
 * Display/helper normalisation only (e.g. room codes, filter aliases). Public
 * URL slugs are never derived on the client: the API's Generate action is the
 * single source (see `AdminSlugField`).
 */
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

export function isReservedSlug(value: string): boolean {
  return RESERVED.has(slugify(value));
}

export function publicPath(kind: PublicContentKind, slug: string): string {
  return contentPath(kind, slug);
}
