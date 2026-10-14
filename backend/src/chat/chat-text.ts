/** Pure text helpers for the live chat: input cleanup, phone handling, AI output safety. */

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_AI_REPLY_LENGTH = 1200;

/** Collapses control characters and runaway blank lines; returns '' when nothing is left. */
export function cleanMessageBody(value: unknown, max = MAX_MESSAGE_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

// A Vietnamese number written with optional +84/84 prefix and spaces, dots or dashes between digit groups.
const PHONE_PATTERN = /(?<![\d+])(?:\+?84|0)(?:[\s.-]?\d){8,10}(?!\d)/g;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Same normalisation as inquiries: digits only, 84 prefix folded to a leading 0. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

export function isValidVietnamesePhone(normalized: string): boolean {
  return /^0\d{9,10}$/.test(normalized);
}

/** First plausible Vietnamese phone number in free text, normalised, or null. */
export function extractPhone(text: string): string | null {
  for (const match of text.matchAll(PHONE_PATTERN)) {
    const normalized = normalizePhone(match[0]);
    if (isValidVietnamesePhone(normalized)) return normalized;
  }
  return null;
}

/** Personal data never leaves the server: phones and emails become placeholders before an AI call. */
export function maskPersonalData(text: string): string {
  return text
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(PHONE_PATTERN, (match) => (isValidVietnamesePhone(normalizePhone(match)) ? '[SĐT]' : match));
}

export function maskPhoneForDisplay(phone: string): string {
  return phone.length > 4 ? `${phone.slice(0, 3)}${'•'.repeat(phone.length - 6)}${phone.slice(-3)}` : phone;
}

/** Only same-site relative paths are kept; anything else is dropped. */
export function sanitizePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().split('#')[0].split('?')[0];
  if (!path.startsWith('/') || path.startsWith('//') || path.length > 300 || /[\s<>"'\\]/.test(path)) return null;
  return path;
}

export type ChatPageKind = 'stay' | 'combo' | 'destination' | 'article' | 'listing' | 'other';

export function pageKindFromPath(path: string | null): ChatPageKind {
  if (!path) return 'other';
  if (/^\/phong-nghi\/[^/]+/.test(path)) return 'stay';
  if (/^\/combo-du-lich\/[^/]+/.test(path)) return 'combo';
  if (/^\/diem-den\/[^/]+/.test(path)) return 'destination';
  if (/^\/bai-viet\/[^/]+/.test(path)) return 'article';
  if (/^\/(phong-nghi|combo-du-lich|diem-den|bai-viet)\/?$/.test(path)) return 'listing';
  return 'other';
}

/** AI text is shown as plain text: strip markup, unwrap markdown links, cap the length. */
export function sanitizeAiReply(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
  const cleaned = cleanMessageBody(text, MAX_AI_REPLY_LENGTH + 1);
  if (cleaned.length <= MAX_AI_REPLY_LENGTH) return cleaned;
  const cut = cleaned.slice(0, MAX_AI_REPLY_LENGTH);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'));
  return `${(lastStop > MAX_AI_REPLY_LENGTH * 0.6 ? cut.slice(0, lastStop + 1) : cut).trim()}…`;
}

/** Strips a ```json fence some providers wrap around JSON output. */
export function unwrapJsonFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

export function previewOf(body: string): string {
  return body.replace(/\s+/g, ' ').trim().slice(0, 140);
}
