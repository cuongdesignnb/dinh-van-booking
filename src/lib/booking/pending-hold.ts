/** Tab-scoped retry marker. Never persist guest contact details or the quote's price snapshot. */
export interface PendingHoldRecord {
  version: 1;
  routeKey: string;
  quoteId: string;
  key: string;
  salt: string;
  digest: string;
}

const STORAGE_KEY = 'dvb:pending-booking-hold';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function valid(value: unknown): value is PendingHoldRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.version === 1 && typeof row.routeKey === 'string' && row.routeKey.length > 0 && row.routeKey.length < 500
    && typeof row.quoteId === 'string' && UUID.test(row.quoteId)
    && typeof row.key === 'string' && UUID.test(row.key)
    && typeof row.salt === 'string' && UUID.test(row.salt)
    && typeof row.digest === 'string' && /^[0-9a-f]{64}$/.test(row.digest);
}

async function digest(salt: string, signature: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${signature}`);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function newPendingHold(routeKey: string, quoteId: string, key: string, signature: string): Promise<PendingHoldRecord> {
  const salt = globalThis.crypto.randomUUID();
  return { version: 1, routeKey, quoteId, key, salt, digest: await digest(salt, signature) };
}

export async function matchesPendingHold(record: PendingHoldRecord, signature: string): Promise<boolean> {
  return (await digest(record.salt, signature)) === record.digest;
}

export function readPendingHold(routeKey: string): PendingHoldRecord | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.routeKey === routeKey ? parsed : null;
  } catch {
    return null;
  }
}

export function savePendingHold(record: PendingHoldRecord): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingHold(record: PendingHoldRecord): void {
  try {
    const current = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = current ? JSON.parse(current) : null;
    if (valid(parsed) && parsed.key === record.key) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // An unavailable storage API must never prevent the booking response from rendering.
  }
}
