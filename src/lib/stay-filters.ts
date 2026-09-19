/**
 * Listing filters for /phong-nghi. OR within a group, AND between groups.
 * The applied filter lives in the URL so back/forward and reload restore it.
 */
import { fromPrice, maxCapacity, type Stay } from '@/data/stays';
import type { AmenityId, StayType } from '@/data/types';
import { readParam } from './selection';

export const PRICE_BOUNDS = { min: 300000, max: 2000000, step: 50000 } as const;

export type StaySort = 'popular' | 'price-asc' | 'price-desc' | 'rating';
export const SORT_OPTIONS: { id: StaySort; label: string }[] = [
  { id: 'popular', label: 'Phổ biến nhất' },
  { id: 'price-asc', label: 'Giá tăng dần' },
  { id: 'price-desc', label: 'Giá giảm dần' },
  { id: 'rating', label: 'Đánh giá cao' },
];

export const RATING_OPTIONS = [4.5, 4.0, 3.5] as const;
export const PAGE_SIZE = 8;

export interface StayFilters {
  priceMin: number;
  /** `PRICE_BOUNDS.max` means "no upper limit" (2.000.000đ+). */
  priceMax: number;
  types: StayType[];
  amenities: AmenityId[];
  minRating: number | null;
  sort: StaySort;
  view: 'grid' | 'list';
  page: number;
}

export const DEFAULT_FILTERS: StayFilters = {
  priceMin: PRICE_BOUNDS.min,
  priceMax: PRICE_BOUNDS.max,
  types: [],
  amenities: [],
  minRating: null,
  sort: 'popular',
  view: 'grid',
  page: 1,
};

const TYPES: StayType[] = ['homestay', 'eco-lodge', 'resort', 'bungalow', 'nha-san'];
const AMENITY_IDS: AmenityId[] = ['wifi', 'breakfast', 'view', 'kitchen', 'family', 'parking', 'eco', 'pool'];

type Src = Parameters<typeof readParam>[0];

const list = <T extends string>(src: Src, key: string, allowed: readonly T[]) =>
  [...new Set((readParam(src, key) ?? '').split(',').filter((v): v is T => (allowed as readonly string[]).includes(v)))];

const price = (v: string | null, fallback: number) => {
  if (!v || !/^\d{1,8}$/.test(v)) return fallback;
  return Math.min(PRICE_BOUNDS.max, Math.max(PRICE_BOUNDS.min, Number(v)));
};

export function parseFilters(src: Src): StayFilters {
  let priceMin = price(readParam(src, 'min'), PRICE_BOUNDS.min);
  let priceMax = price(readParam(src, 'max'), PRICE_BOUNDS.max);
  if (priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];
  const r = Number(readParam(src, 'rating'));
  const sortRaw = readParam(src, 'sort');
  const page = Number(readParam(src, 'page'));
  return {
    priceMin,
    priceMax,
    types: list(src, 'types', TYPES),
    amenities: list(src, 'amenities', AMENITY_IDS),
    minRating: (RATING_OPTIONS as readonly number[]).includes(r) ? r : null,
    sort: SORT_OPTIONS.some((s) => s.id === sortRaw) ? (sortRaw as StaySort) : 'popular',
    view: readParam(src, 'view') === 'list' ? 'list' : 'grid',
    page: Number.isInteger(page) && page > 0 && page < 100 ? page : 1,
  };
}

export function writeFilters(f: StayFilters, base: URLSearchParams) {
  const p = new URLSearchParams(base);
  const set = (k: string, v: string | null) => (v === null || v === '' ? p.delete(k) : p.set(k, v));
  set('min', f.priceMin !== PRICE_BOUNDS.min ? String(f.priceMin) : null);
  set('max', f.priceMax !== PRICE_BOUNDS.max ? String(f.priceMax) : null);
  set('types', f.types.join(','));
  set('amenities', f.amenities.join(','));
  set('rating', f.minRating === null ? null : String(f.minRating));
  set('sort', f.sort !== 'popular' ? f.sort : null);
  set('view', f.view !== 'grid' ? f.view : null);
  set('page', f.page > 1 ? String(f.page) : null);
  return p;
}

type Group = 'price' | 'types' | 'amenities' | 'rating' | 'guests';

function passes(stay: Stay, f: StayFilters, guests: number, skip?: Group) {
  const p = fromPrice(stay);
  if (skip !== 'price' && (p < f.priceMin || (f.priceMax < PRICE_BOUNDS.max && p > f.priceMax))) return false;
  if (skip !== 'types' && f.types.length && !f.types.includes(stay.type)) return false;
  if (skip !== 'amenities' && f.amenities.length && !f.amenities.some((a) => stay.amenities.includes(a))) {
    return false;
  }
  if (skip !== 'rating' && f.minRating !== null && stay.rating < f.minRating) return false;
  if (skip !== 'guests' && maxCapacity(stay) < guests) return false;
  return true;
}

export function applyFilters(all: Stay[], f: StayFilters, guests: number) {
  const out = all.filter((s) => passes(s, f, guests));
  const by = {
    popular: (a: Stay, b: Stay) => b.popularity - a.popularity,
    'price-asc': (a: Stay, b: Stay) => fromPrice(a) - fromPrice(b),
    'price-desc': (a: Stay, b: Stay) => fromPrice(b) - fromPrice(a),
    rating: (a: Stay, b: Stay) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  }[f.sort];
  return out.sort(by);
}

/**
 * Facet counts: how many stays would match each option given every *other*
 * group's current selection (so a group's own choice never zeroes its siblings).
 */
export function facetCounts(all: Stay[], f: StayFilters, guests: number) {
  const count = (group: Group, test: (s: Stay) => boolean) =>
    all.filter((s) => passes(s, f, guests, group) && test(s)).length;
  return {
    types: Object.fromEntries(TYPES.map((t) => [t, count('types', (s) => s.type === t)])) as Record<StayType, number>,
    amenities: Object.fromEntries(
      AMENITY_IDS.map((a) => [a, count('amenities', (s) => s.amenities.includes(a))]),
    ) as Record<AmenityId, number>,
    rating: Object.fromEntries(RATING_OPTIONS.map((r) => [r, count('rating', (s) => s.rating >= r)])) as Record<
      number,
      number
    >,
  };
}

export const activeFilterCount = (f: StayFilters) =>
  f.types.length +
  f.amenities.length +
  (f.minRating !== null ? 1 : 0) +
  (f.priceMin !== PRICE_BOUNDS.min || f.priceMax !== PRICE_BOUNDS.max ? 1 : 0);
