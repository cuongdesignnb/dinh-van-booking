import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'halabcreative@gmail.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? readFileSync(
  process.env.OWNER_PASSWORD_FILE ?? join(process.cwd(), '.secrets', 'owner_password'),
  'utf8',
).trim();

export async function signInAsOwner(page: Page) {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible();
  await page.getByLabel('Email').fill(OWNER_EMAIL);
  await page.getByLabel('Mật khẩu').fill(OWNER_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('.atop__user')).toBeVisible();
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
