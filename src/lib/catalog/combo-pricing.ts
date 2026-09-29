/** Display the persisted combo pricing unit without assuming every price is per person. */
export function comboPriceUnitLabel(unit: string): string {
  if (unit === 'person') return 'người';
  if (unit === 'room') return 'phòng';
  if (unit === 'booking') return 'booking';
  return unit.trim() || 'combo';
}

/** Missing and zero prices are contact-only; they must never sort as a cheap sale. */
export function compareComboPrices(a: number | null, b: number | null, descending = false): number {
  const first = a !== null && a > 0 ? a : null;
  const second = b !== null && b > 0 ? b : null;
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return descending ? second - first : first - second;
}
