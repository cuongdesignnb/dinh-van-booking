import type { StayType } from '@/data/types';

/** Match the public filter taxonomy to the property kinds stored by Admin. */
const PROPERTY_KINDS: Record<string, StayType> = {
  homestay: 'homestay',
  resort: 'resort',
  lodge: 'eco-lodge',
  'eco-lodge': 'eco-lodge',
  bungalow: 'bungalow',
  stilt: 'nha-san',
  'nha-san': 'nha-san',
  villa: 'villa',
  glamping: 'glamping',
};

export function stayTypeFromPropertyKind(kind: string): StayType {
  return PROPERTY_KINDS[kind.trim().toLowerCase()] ?? 'other';
}
