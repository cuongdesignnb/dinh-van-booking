/**
 * Vietnamese-aware slugs. `Phòng nghỉ Cúc Phương` becomes `phong-nghi-cuc-phuong`
 * so public URLs stay readable and stable, and `đ`/`Đ` are handled explicitly
 * because Unicode decomposition leaves them untouched.
 */
const RESERVED = new Set(['admin', 'api', 'media', '_next', 'static']);

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

/** Appends -2, -3 … until the slug is free within its section. */
export function uniqueSlug(desired: string, taken: Set<string>): string {
  const base = slugify(desired);
  if (!taken.has(base) && !RESERVED.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Public path for a content node, e.g. stay + `nha-san-doi` -> /phong-nghi/nha-san-doi */
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
  return `${section}/${slug}`;
}
