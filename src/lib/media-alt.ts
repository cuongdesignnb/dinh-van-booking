const IMAGE_EXTENSION = '(?:jpe?g|png|webp|avif|gif)';
const PLACEHOLDER_MEDIA_ALT = new RegExp(
  `^(?:(?:undefined|null)(?:\\.${IMAGE_EXTENSION})?|\\.${IMAGE_EXTENSION})$`,
  'i',
);

/** Treat only known legacy filename sentinels as empty; preserve ordinary ALT text. */
export function isPlaceholderMediaAlt(value: unknown): boolean {
  return typeof value !== 'string' || !value.trim() || PLACEHOLDER_MEDIA_ALT.test(value.trim());
}

/** Keep broken legacy metadata out of rendered image alternatives without mutating stored records. */
export function mediaAlt(value: unknown, fallback: unknown = 'Ảnh minh họa'): string {
  if (!isPlaceholderMediaAlt(value)) return (value as string).trim();
  if (!isPlaceholderMediaAlt(fallback)) return (fallback as string).trim();
  return 'Ảnh minh họa';
}
