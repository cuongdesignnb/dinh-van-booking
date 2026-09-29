import type { ComboAudience } from '@/data/combos';
import { slugify } from '@/lib/slug';

const ALIASES: Record<string, ComboAudience> = {
  'gia-dinh': 'gia-dinh',
  family: 'gia-dinh',
  'cap-doi': 'cap-doi',
  couple: 'cap-doi',
  nhom: 'nhom',
  'nhom-team': 'nhom',
  team: 'nhom',
  'team-building': 'nhom',
  'thien-nhien': 'thien-nhien',
  'trai-nghiem-thien-nhien': 'thien-nhien',
};

/** Legacy free-text labels and current stable IDs resolve to the same filter. */
export function comboAudienceTag(value: string): ComboAudience | null {
  return ALIASES[slugify(value)] ?? null;
}

export function normalizeComboAudienceTags(values: readonly string[]): ComboAudience[] {
  const normalized = values.map(comboAudienceTag).filter((value): value is ComboAudience => value !== null);
  return [...new Set(normalized)];
}
