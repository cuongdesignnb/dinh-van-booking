const separators = /[.,\s]/g;

/** Remove common thousands separators while preserving invalid characters for validation. */
export function normalizeVndInput(value: string): string {
  return value.replace(separators, '');
}

/** Parse a non-negative VND integer; undefined means empty or invalid input. */
export function parseVndInput(value: string): number | undefined {
  const normalized = normalizeVndInput(value).trim();
  if (!normalized || !/^\d+$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

/** Display VND values with Vietnamese thousands separators, without decimals. */
export function formatVndInput(value: string | number): string {
  const amount = typeof value === 'number' ? value : parseVndInput(value);
  if (amount === undefined || !Number.isSafeInteger(amount) || amount < 0) {
    return typeof value === 'string' ? value : '';
  }
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount);
}
