/**
 * The admin demo runs on a frozen clock so screenshots, KPIs and calendars are
 * reproducible. This is the date of the demo *data*, not the real current date;
 * an API adapter must use the real clock instead.
 */
export const DEMO_NOW_ISO = '2024-11-15T12:00:00+07:00';
export const DEMO_TODAY = '2024-11-15';
export const DEMO_RANGE = { from: '2024-11-01', to: '2024-11-30' };
export const DEMO_PREV_RANGE = { from: '2024-10-01', to: '2024-10-31' };

/** Deterministic PRNG so fixtures never change between renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MS_DAY = 86400000;

/** All date helpers work on plain `YYYY-MM-DD` strings (no UTC shifting). */
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, days: number) => toKey(new Date(fromKey(key).getTime() + days * MS_DAY));

export const diffDays = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / MS_DAY);

export const eachDay = (from: string, to: string) => {
  const out: string[] = [];
  for (let k = from; k < to; k = addDays(k, 1)) out.push(k);
  return out;
};

/** [checkIn, checkOut) — the check-out day is free again. */
export const coversNight = (checkIn: string, checkOut: string, day: string) => day >= checkIn && day < checkOut;

export const inRange = (day: string, from: string, to: string) => day >= from && day <= to;
