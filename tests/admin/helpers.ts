import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { expect, type Page } from '@playwright/test';

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'halabcreative@gmail.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? readFileSync(
  process.env.OWNER_PASSWORD_FILE ?? join(process.cwd(), '.secrets', 'owner_password'),
  'utf8',
).trim();

export async function signInAsOwner(page: Page) {
  await page.goto('/admin');
  // /auth/me is allowed to complete before presenting login; a real timeout
  // now shows a retry state at 10s instead of an indefinite spinner.
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible({ timeout: 12_000 });
  await page.getByLabel('Email').fill(OWNER_EMAIL);
  await page.getByLabel('Mật khẩu').fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  // Failure snapshots can include accessible input values; clear the secret immediately.
  await page.evaluate(() => {
    const password = document.querySelector<HTMLInputElement>('input[type="password"]');
    if (password) password.value = '';
  });
  await expect(page.locator('.atop__user')).toBeVisible({ timeout: 12_000 });
}

/** Fail before creating QA records if guarded PostgreSQL cleanup cannot run. */
export function assertLocalPostgresCleanupAvailable(): void {
  const result = execFileSync('docker', [
    'exec', '-i', 'dvb-booking-postgres-1', 'sh', '-lc',
    'psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -tAc "SELECT 1"',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (result !== '1') throw new Error('PostgreSQL Docker cleanup is unavailable; refusing to create QA fixtures.');
}

/** Build a one-pixel PNG whose color is unique to this test run. */
export function createUniqueTestPng(seed: number): Buffer {
  const color = seed % 0x1000000;
  const pixels = Buffer.from([0, (color >>> 16) & 0xff, (color >>> 8) & 0xff, color & 0xff, 0xff]);
  const crc32 = (input: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of input) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const typeBytes = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
    return Buffer.concat([length, typeBytes, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function browserApi(page: Page, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }) => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const cookie = document.cookie.split('; ').find((part) => part.startsWith('dvb_csrf='));
      if (cookie) headers['x-csrf-token'] = decodeURIComponent(cookie.slice('dvb_csrf='.length));
    }
    const response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    return { status: response.status, body: payload };
  }, { path, method, body });
}

/** Remove only the unique synthetic inquiry created by the local Docker E2E. */
export function cleanupLocalTestInquiry(input: { id: string; name: string; phone: string; marker: string }): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.id)) {
    throw new Error('Refusing test cleanup: inquiry id is not a UUID.');
  }
  if (input.name !== 'Khách kiểm thử nội bộ' || !/^09\d{8}$/.test(input.phone) || !/^ADMIN-RUN-TO-GOAL-\d+$/.test(input.marker)) {
    throw new Error('Refusing test cleanup: marker fields are not an exact local E2E identity.');
  }

  const sql = `
DO $cleanup$
DECLARE
  target_customer uuid;
  removed_count integer;
BEGIN
  SELECT i.customer_id INTO STRICT target_customer
  FROM public.inquiries i
  JOIN public.customers c ON c.id = i.customer_id
  WHERE i.id = '${input.id}'::uuid
    AND c.full_name = '${input.name}'
    AND c.phone_normalized = '${input.phone}'
    AND i.source = 'website'
    AND position('${input.marker}' in coalesce(i.message, '')) > 0;

  IF EXISTS (SELECT 1 FROM public.bookings WHERE inquiry_id = '${input.id}'::uuid OR customer_id = target_customer)
     OR EXISTS (SELECT 1 FROM public.booking_quotes WHERE customer_id = target_customer)
     OR EXISTS (SELECT 1 FROM public.customer_tags WHERE customer_id = target_customer)
     OR EXISTS (SELECT 1 FROM public.reviews WHERE customer_id = target_customer) THEN
    RAISE EXCEPTION 'Refusing test cleanup: the exact synthetic customer has dependent business records';
  END IF;

  DELETE FROM public.idempotency_keys
  WHERE operation = 'public.inquiry.create'
    AND response_snapshot ->> 'id' = '${input.id}';
  DELETE FROM public.audit_logs WHERE entity_type = 'inquiry' AND entity_id = '${input.id}'::uuid;
  DELETE FROM public.inquiries WHERE id = '${input.id}'::uuid AND customer_id = target_customer;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 1 THEN RAISE EXCEPTION 'Refusing test cleanup: expected one exact inquiry'; END IF;

  DELETE FROM public.customers
  WHERE id = target_customer
    AND full_name = '${input.name}'
    AND phone_normalized = '${input.phone}'
    AND NOT EXISTS (SELECT 1 FROM public.inquiries WHERE customer_id = target_customer)
    AND NOT EXISTS (SELECT 1 FROM public.bookings WHERE customer_id = target_customer)
    AND NOT EXISTS (SELECT 1 FROM public.booking_quotes WHERE customer_id = target_customer)
    AND NOT EXISTS (SELECT 1 FROM public.customer_tags WHERE customer_id = target_customer)
    AND NOT EXISTS (SELECT 1 FROM public.reviews WHERE customer_id = target_customer);
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 1 THEN RAISE EXCEPTION 'Refusing test cleanup: customer still has dependent records'; END IF;
END
$cleanup$;
`;

  execFileSync(
    'docker',
    [
      'exec', '-i', 'dvb-booking-postgres-1', 'sh', '-lc',
      'psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"',
    ],
    { input: sql, encoding: 'utf8', stdio: ['pipe', 'ignore', 'pipe'] },
  );
}
