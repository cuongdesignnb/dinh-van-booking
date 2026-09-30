import { randomUUID } from 'node:crypto';

const PLACEHOLDER = /^(?:(?:undefined|null)(?:\.(?:jpe?g|png|webp|avif|gif))?|\.(?:jpe?g|png|webp|avif|gif))$/i;

function usable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned && !PLACEHOLDER.test(cleaned) ? cleaned : null;
}

export function normalizeUploadMetadata(filename: unknown, altText: unknown, caption: unknown) {
  const basename = usable(filename)?.replaceAll('\\', '/').split('/').pop() ?? null;
  const cleanFilename = basename?.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim().slice(0, 255);
  const validFilename = cleanFilename && cleanFilename !== '.' && cleanFilename !== '..' && !PLACEHOLDER.test(cleanFilename)
    ? cleanFilename
    : null;
  const originalFilename = validFilename ?? `upload-${randomUUID().slice(0, 8)}.webp`;
  const filenameAlt = validFilename?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const safeAlt = usable(altText)?.slice(0, 500);
  return {
    originalFilename,
    altText: safeAlt ?? (filenameAlt && !PLACEHOLDER.test(filenameAlt) ? filenameAlt : 'Ảnh tải lên'),
    caption: usable(caption)?.slice(0, 1000) ?? null,
  };
}
