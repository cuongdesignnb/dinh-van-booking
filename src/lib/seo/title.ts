/**
 * Title policy (client-safe, shared by public metadata and the Admin SEO
 * preview): `{title} | {brand}` using `seo.defaults.titleTemplate` (e.g.
 * `%s | Cúc Phương Travel`) or the brand name from settings. A title that
 * already names the brand (e.g. the homepage default title) is kept as-is so
 * the brand is never repeated. No brand string is hardcoded.
 */
export function applyTitleTemplate(title: string, template: string | null | undefined, siteName: string): string {
  const clean = title.trim();
  if (!clean) return '';
  const brand = siteName.trim();
  if (brand && clean.toLocaleLowerCase('vi').includes(brand.toLocaleLowerCase('vi'))) return clean;
  const pattern = template?.trim();
  if (pattern?.includes('%s')) return pattern.replaceAll('%s', clean);
  if (pattern) return `${clean} | ${pattern}`;
  return brand ? `${clean} | ${brand}` : clean;
}
