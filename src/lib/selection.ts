/**
 * Search selection shared across pages through the URL. Only non-sensitive
 * search data lives here — never names, phones, e-mails or notes.
 */
import { fromKey, startOfToday, toKey } from './dates';

export interface Selection {
  checkIn: string | null;
  checkOut: string | null;
  adults: number;
  children: number;
  rooms: number;
}

export const DEFAULT_SELECTION: Selection = { checkIn: null, checkOut: null, adults: 2, children: 0, rooms: 1 };

export const LIMITS = { adults: [1, 10], children: [0, 6], rooms: [1, 5], guests: 12 } as const;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined> | null | undefined;

export const readParam = (src: ParamSource, key: string): string | null => {
  if (!src) return null;
  if (src instanceof URLSearchParams) return src.get(key);
  const v = src[key];
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
};

const isDateKey = (v: string | null): v is string => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return toKey(fromKey(v)) === v;
};

const intIn = (v: string | null, [min, max]: readonly [number, number], fallback: number) => {
  if (v === null || !/^\d{1,2}$/.test(v)) return fallback;
  const n = Number(v);
  return n >= min && n <= max ? n : fallback;
};

/** Parse and sanitise a selection. Invalid dates are dropped as a pair. */
export function parseSelection(src: ParamSource): Selection {
  let checkIn = readParam(src, 'checkIn');
  let checkOut = readParam(src, 'checkOut');
  if (!isDateKey(checkIn)) checkIn = null;
  if (!isDateKey(checkOut)) checkOut = null;
  if (checkIn && checkOut && checkOut <= checkIn) checkOut = null;
  if (!checkIn) checkOut = null;
  let adults = intIn(readParam(src, 'adults'), LIMITS.adults, DEFAULT_SELECTION.adults);
  let children = intIn(readParam(src, 'children'), LIMITS.children, DEFAULT_SELECTION.children);
  if (adults + children > LIMITS.guests) {
    adults = DEFAULT_SELECTION.adults;
    children = DEFAULT_SELECTION.children;
  }
  const rooms = intIn(readParam(src, 'rooms'), LIMITS.rooms, DEFAULT_SELECTION.rooms);
  return { checkIn, checkOut, adults, children, rooms };
}

/** Write a selection into (a copy of) the given params. */
export function writeSelection(sel: Selection, base?: URLSearchParams) {
  const p = new URLSearchParams(base);
  const set = (k: string, v: string | null) => (v === null ? p.delete(k) : p.set(k, v));
  set('checkIn', sel.checkIn);
  set('checkOut', sel.checkIn ? sel.checkOut : null);
  set('adults', String(sel.adults));
  set('children', String(sel.children));
  set('rooms', String(sel.rooms));
  return p;
}

export const selectionQuery = (sel: Selection) => writeSelection(sel).toString();

export const guestCount = (sel: Pick<Selection, 'adults' | 'children'>) => sel.adults + sel.children;

export const nights = (sel: Pick<Selection, 'checkIn' | 'checkOut'>) =>
  sel.checkIn && sel.checkOut
    ? Math.round((fromKey(sel.checkOut).getTime() - fromKey(sel.checkIn).getTime()) / 86_400_000)
    : 0;

/** Vietnamese validation message for a date pair, or null when valid. */
export function dateError(sel: Pick<Selection, 'checkIn' | 'checkOut'>, today = startOfToday()): {
  field: 'in' | 'out';
  message: string;
} | null {
  if (!sel.checkIn) return { field: 'in', message: 'Vui lòng chọn ngày nhận phòng.' };
  if (fromKey(sel.checkIn) < today) return { field: 'in', message: 'Ngày nhận phòng đã qua, vui lòng chọn lại.' };
  if (!sel.checkOut) return { field: 'out', message: 'Vui lòng chọn ngày trả phòng.' };
  if (sel.checkOut <= sel.checkIn) return { field: 'out', message: 'Ngày trả phòng phải sau ngày nhận phòng.' };
  return null;
}
