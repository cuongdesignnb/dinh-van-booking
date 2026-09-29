/** A tab-scoped retry marker. Guest details and message must never be stored here. */
export interface PendingInquiryRecord {
  version: 1;
  key: string;
  salt: string;
  digest: string;
}

const STORAGE_KEY = 'dvb:pending-inquiry';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function valid(value: unknown): value is PendingInquiryRecord {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.version === 1 && typeof row.key === 'string' && UUID.test(row.key)
    && typeof row.salt === 'string' && UUID.test(row.salt)
    && typeof row.digest === 'string' && /^[0-9a-f]{64}$/.test(row.digest);
}

async function hash(salt: string, signature: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${signature}`);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function newPendingInquiry(signature: string): Promise<PendingInquiryRecord> {
  const key = globalThis.crypto.randomUUID();
  const salt = globalThis.crypto.randomUUID();
  return { version: 1, key, salt, digest: await hash(salt, signature) };
}

export async function matchesPendingInquiry(record: PendingInquiryRecord, signature: string): Promise<boolean> {
  return (await hash(record.salt, signature)) === record.digest;
}

export function readPendingInquiry(): PendingInquiryRecord | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (valid(parsed)) return parsed;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Unavailable storage is reported by savePendingInquiry before the first POST.
  }
  return null;
}

export function savePendingInquiry(record: PendingInquiryRecord): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingInquiry(record: PendingInquiryRecord): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (valid(parsed) && parsed.key === record.key) sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The confirmed API response should render even if storage became unavailable.
  }
}
