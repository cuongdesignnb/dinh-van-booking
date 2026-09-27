import type { PublicMediaAsset, PublicSiteData } from '@/lib/api/public';

export type PublicRecord = Record<string, unknown>;

export function publicRecord(value: unknown): PublicRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as PublicRecord : {};
}

export function publicText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function publicSetting(site: PublicSiteData, key: string): PublicRecord {
  return publicRecord(site[key]);
}

export function publicAsset(site: PublicSiteData, mediaId: unknown): PublicMediaAsset | null {
  if (typeof mediaId !== 'string' || !mediaId) return null;
  const asset = site.assets?.[mediaId];
  return asset?.src ? asset : null;
}

export function richDocumentHasContent(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const node = value as { text?: unknown; attrs?: Record<string, unknown>; content?: unknown[] };
  if (typeof node.text === 'string' && node.text.trim()) return true;
  if (typeof node.attrs?.src === 'string' && node.attrs.src.trim()) return true;
  return Array.isArray(node.content) && node.content.some(richDocumentHasContent);
}

export function publicSectionOrder(site: PublicSiteData): string[] {
  const config = publicSetting(site, 'home.sections');
  return Array.isArray(config.order) ? config.order.filter((item): item is string => typeof item === 'string') : [];
}

export function publicSectionHidden(site: PublicSiteData, section: string): boolean {
  const hidden = publicSetting(site, 'home.sections').hidden;
  return Array.isArray(hidden) && hidden.includes(section);
}
