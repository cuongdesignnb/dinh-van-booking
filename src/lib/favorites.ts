'use client';

/**
 * Favourites for stays, combos and destinations, kept in localStorage under a
 * versioned key and shared across components/tabs via useSyncExternalStore.
 * Server render and hydration always see "not saved" to avoid mismatches.
 */
import { useCallback, useSyncExternalStore } from 'react';

export type FavoriteNs = 'stay' | 'combo' | 'destination';
type Store = Record<FavoriteNs, string[]>;

const KEY = 'dvb:favorites:v2';
const LEGACY_KEY = 'dvb:favorites';
const LEGACY_IDS: Record<string, string> = {
  'stay-01': 'cuc-phuong-forest-homestay',
  'stay-02': 'an-nhien-retreat',
  'stay-03': 'cuc-phuong-eco-lodge',
  'stay-04': 'moc-son-homestay',
};
const EMPTY = '';
const listeners = new Set<() => void>();

const clean = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : [];

function readRaw(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return raw;
    const legacy = clean(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]'));
    if (legacy.length) {
      const migrated = JSON.stringify({ stay: legacy.map((id) => LEGACY_IDS[id] ?? id), combo: [], destination: [] });
      localStorage.setItem(KEY, migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch {
    /* storage unavailable */
  }
  return EMPTY;
}

let cache = typeof window === 'undefined' ? EMPTY : readRaw();

const parse = (raw: string): Store => {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return { stay: clean(v.stay), combo: clean(v.combo), destination: clean(v.destination) };
  } catch {
    return { stay: [], combo: [], destination: [] };
  }
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = readRaw();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function toggleFavorite(ns: FavoriteNs, id: string) {
  const store = parse(cache);
  const set = new Set(store[ns]);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  store[ns] = [...set];
  cache = JSON.stringify(store);
  try {
    localStorage.setItem(KEY, cache);
  } catch {
    /* keep in-memory state only */
  }
  listeners.forEach((l) => l());
  return set.has(id);
}

export function useFavorite(ns: FavoriteNs, id: string) {
  const raw = useSyncExternalStore(subscribe, () => cache, () => EMPTY);
  const saved = parse(raw)[ns].includes(id);
  const toggle = useCallback(() => toggleFavorite(ns, id), [ns, id]);
  return [saved, toggle] as const;
}
