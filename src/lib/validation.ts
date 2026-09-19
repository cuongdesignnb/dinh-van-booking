/** Form validators shared by the contact and booking forms. Messages are Vietnamese. */

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;

export function validateName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ');
  if (!v) return 'Vui lòng nhập họ và tên';
  if (v.length < 2 || v.length > 80 || !NAME_RE.test(v)) return 'Vui lòng kiểm tra lại họ và tên';
  return null;
}

/** Strip separators; keep a leading "+". Returns digits (with optional +). */
export const normalizePhone = (raw: string) => {
  const t = raw.trim();
  const plus = t.startsWith('+');
  return (plus ? '+' : '') + t.replace(/[^\d]/g, '');
};

/**
 * Plausibility only: 9–15 digits, optionally international. We never claim the
 * number exists or belongs to anyone, and don't hard-code carrier prefixes.
 */
export function validatePhone(raw: string): string | null {
  if (!raw.trim()) return 'Vui lòng nhập số điện thoại';
  if (/[^\d\s.+()-]/.test(raw)) return 'Vui lòng kiểm tra số điện thoại';
  const n = normalizePhone(raw);
  const digits = n.replace('+', '');
  if (n.indexOf('+') > 0 || digits.length < 9 || digits.length > 15) return 'Vui lòng kiểm tra số điện thoại';
  return null;
}

export function validateEmail(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Vui lòng nhập email';
  if (v.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Vui lòng kiểm tra địa chỉ email';
  return null;
}

export const MESSAGE_MAX = 500;

export function validateMessage(raw: string, max = MESSAGE_MAX): string | null {
  return raw.length > max ? `Lời nhắn tối đa ${max} ký tự` : null;
}
