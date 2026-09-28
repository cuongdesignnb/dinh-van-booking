import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { browserApi, signInAsOwner } from './helpers';
import { slugify } from '../../src/lib/slug';

type Kind = 'stay' | 'combo' | 'destination' | 'article' | 'page';
type RecordView = {
  id: string; contentId?: string; title: string; slug: string; path: string;
  version: number; contentVersion?: number; publicationStatus: string;
};
type RouteRow = { path: string; isCurrent: boolean; redirectStatus: number };

/** Read-only assertion against the local PostgreSQL route table, not production. */
function routeRows(contentId: string): RouteRow[] {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(contentId)) {
    throw new Error('Refusing route inspection without an exact content UUID');
  }
  const query = `SELECT COALESCE(json_agg(json_build_object('path', path, 'isCurrent', is_current, 'redirectStatus', redirect_status) ORDER BY path)::text, '[]') FROM public.public_routes WHERE content_id = '${contentId}'::uuid;`;
  const output = execFileSync('docker', [
    'exec', '-i', 'dvb-booking-postgres-1', 'sh', '-lc',
    'psql -X -A -t -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"',
  ], { input: query, encoding: 'utf8' });
  return JSON.parse(output.trim()) as RouteRow[];
}

const screens: Record<Kind, string> = {
  stay: '/admin/phong-nghi', combo: '/admin/combo-du-lich', destination: '/admin/diem-den',
  article: '/admin/noi-dung', page: '/admin/chuyen-trang',
};
const paths: Record<Kind, string> = {
  stay: '/phong-nghi', combo: '/combo-du-lich', destination: '/diem-den',
  article: '/bai-viet', page: '',
};

test('client slugify matches the backend Vietnamese vectors', () => {
  for (const [input, expected] of [
    ['Đinh Vân Booking', 'dinh-van-booking'],
    ['Phòng nghỉ Cúc Phương', 'phong-nghi-cuc-phuong'],
    ['Vườn Quốc Gia Cúc Phương', 'vuon-quoc-gia-cuc-phuong'],
    ['Combo Cúc Phương 2N1Đ', 'combo-cuc-phuong-2n1d'],
    ['  Hello --- World', 'hello-world'],
  ]) expect(slugify(input)).toBe(expected);
});

function createBody(kind: Kind, title: string, stamp: number, slug?: string) {
  if (kind === 'stay') return {
    title, slug, code: `SLUG-QA-${stamp}`, kind: 'homestay', area: 'Cúc Phương, Ninh Bình',
    address: 'Địa chỉ kiểm thử local', description: 'Mô tả kiểm thử vòng đời đường dẫn của nơi lưu trú.',
    roomCode: `ROOM-${stamp}`, roomName: 'Phòng kiểm thử', maxAdults: 2, maxChildren: 0,
    unitCount: 1, rateVnd: 1000,
  };
  return {
    kind, title, slug, body: { type: 'doc', content: [] },
    details: kind === 'destination'
      ? { destination: { category: 'Kiểm thử' } }
      : kind === 'combo'
        ? { combo: { code: `SLUG-QA-${stamp}`, durationDays: 2, durationNights: 1, pricingUnit: 'person' } }
        : undefined,
  };
}

async function readRecord(page: Page, kind: Kind, id: string): Promise<RecordView> {
  const response = await browserApi(page, `/${kind === 'stay' ? 'properties' : 'content'}/${id}`);
  expect(response.status).toBe(200);
  return response.body as RecordView;
}

async function patchRecord(page: Page, kind: Kind, record: RecordView, patch: Record<string, unknown>) {
  const response = await browserApi(page, `/${kind === 'stay' ? 'properties' : 'content'}/${record.id}`,
    kind === 'stay' ? 'PATCH' : 'PUT', {
      ...patch, expectedVersion: record.version,
      ...(kind === 'stay' ? { expectedContentVersion: record.contentVersion } : {}),
    });
  return response;
}

for (const kind of ['stay', 'combo', 'destination', 'article', 'page'] as const) {
  test(`${kind}: create auto/manual/generate; edit stable, explicit rename, conflict and restore`, async ({ page }) => {
    test.setTimeout(180_000);
    await signInAsOwner(page);
    const stamp = Date.now() + Math.floor(Math.random() * 1000);
    const screen = screens[kind];
    const titleLabel = kind === 'stay' ? 'Tên nơi lưu trú *' : 'Tiêu đề *';
    const firstTitle = `Slug QA Cúc Phương ${stamp}`;
    const auto = `slug-qa-cuc-phuong-${stamp}`;
    const generated = `slug-qa-generated-${stamp}`;
    const manual = `slug-qa-manual-${stamp}`;
    const endpoint = kind === 'stay' ? '/properties' : '/content';
    let firstId: string | null = null;
    let secondId: string | null = null;

    try {
      // The same active form contract is exercised on all five admin routes.
      await page.goto(`${screen}?action=create`);
      const field = page.getByLabel('Slug đường dẫn');
      await expect(field).toBeVisible();
      await page.getByLabel(titleLabel).fill(firstTitle);
      await expect(field).toHaveValue(auto);
      await expect(page.locator('.admin-slug-field__preview')).toContainText(`${paths[kind]}/${auto}`);
      await field.fill(manual);
      await page.getByLabel(titleLabel).fill(`Slug QA đổi tiêu đề ${stamp}`);
      await expect(field).toHaveValue(manual);
      await page.getByLabel(titleLabel).fill(`Slug QA Generated ${stamp}`);
      await page.getByRole('button', { name: 'Tạo slug từ tiêu đề' }).click();
      await expect(field).toHaveValue(generated);
      // Generate is form-only: cancel leaves the database untouched.
      await page.getByRole('button', { name: 'Quay lại danh sách' }).click();

      const created = await browserApi(page, endpoint, 'POST', createBody(kind, firstTitle, stamp));
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      const first = created.body as RecordView;
      firstId = first.id;
      expect(first.slug).toBe(auto);
      expect(first.path).toBe(`${paths[kind]}/${auto}`);
      const contentId = first.contentId ?? first.id;
      expect(routeRows(contentId)).toMatchObject([{ path: first.path, isCurrent: true }]);

      // Same title + blank slug uses create-only uniqueness, never a hidden update suffix.
      const collision = await browserApi(page, endpoint, 'POST', createBody(kind, firstTitle, stamp + 1, ''));
      expect(collision.status, JSON.stringify(collision.body)).toBe(201);
      secondId = (collision.body as RecordView).id;
      expect((collision.body as RecordView).slug).toBe(`${auto}-2`);

      if (kind === 'article') {
        await page.goto(screen);
        const originalCard = page.locator('.content-manager__item').filter({
          has: page.getByText(`${paths[kind]}/${auto}`, { exact: true }),
        });
        await originalCard.getByRole('button', { name: 'Nhân bản' }).click();
        await expect(field).toHaveValue(`${auto}-ban-sao`);
        await page.getByLabel(titleLabel).fill(`Slug QA bản sao mới ${stamp}`);
        await expect(field).toHaveValue(`slug-qa-ban-sao-moi-${stamp}`);
        await field.fill(`slug-qa-copy-manual-${stamp}`);
        await page.getByLabel(titleLabel).fill(`Slug QA copy title ${stamp}`);
        await expect(field).toHaveValue(`slug-qa-copy-manual-${stamp}`);
        await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
      }

      await page.goto(`${screen}?edit=${firstId}`);
      await expect(field).toHaveValue(auto);
      await page.getByLabel(titleLabel).fill(`Slug QA Generated ${stamp}`);
      await expect(field).toHaveValue(auto); // edit title never follows title
      await page.getByRole('button', { name: 'Tạo slug từ tiêu đề' }).click();
      await expect(field).toHaveValue(generated);
      await expect(page.locator('.admin-slug-field__warning')).toBeVisible();
      await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
      expect((await readRecord(page, kind, firstId)).slug).toBe(auto);

      await page.goto(`${screen}?edit=${firstId}`);
      await expect(field).toHaveValue(auto);
      await page.getByLabel(titleLabel).fill(`Slug QA title only ${stamp}`);
      await expect(field).toHaveValue(auto);
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(page).toHaveURL(screen);
      let current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(auto);
      expect(current.path).toBe(`${paths[kind]}/${auto}`);
      expect(routeRows(contentId)).toHaveLength(1);

      const omitted = await patchRecord(page, kind, current, { title: `Slug QA API title ${stamp}` });
      expect(omitted.status, JSON.stringify(omitted.body)).toBe(200);
      current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(auto);
      expect(routeRows(contentId)).toHaveLength(1);

      const same = await patchRecord(page, kind, current, { slug: `Slug QA Cúc Phương ${stamp}` });
      expect(same.status, JSON.stringify(same.body)).toBe(200);
      current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(auto);
      expect(routeRows(contentId)).toHaveLength(1);

      const foreign = await patchRecord(page, kind, current, { slug: `${auto}-2` });
      expect(foreign.status).toBe(409);
      expect(JSON.stringify(foreign.body)).toContain('Đường dẫn này đã được nội dung khác sử dụng');
      expect((await readRecord(page, kind, firstId)).slug).toBe(auto);
      expect(routeRows(contentId)).toHaveLength(1);

      if (kind === 'page') {
        await page.goto(`${screen}?edit=${firstId}`);
        await expect(field).toHaveValue(auto);
        await field.fill('admin');
        await expect(field).toHaveAttribute('aria-invalid', 'true');
        await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
        const protectedRoute = await patchRecord(page, kind, current, { slug: 'admin' });
        expect(protectedRoute.status).toBe(400);
        expect((await readRecord(page, kind, firstId)).slug).toBe(auto);
      }

      await page.goto(`${screen}?edit=${firstId}`);
      await expect(field).toHaveValue(auto);
      await field.fill(manual);
      await expect(page.locator('.admin-slug-field__warning')).toBeVisible();
      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(page).toHaveURL(screen);
      current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(manual);
      expect(routeRows(contentId)).toEqual([
        { path: `${paths[kind]}/${auto}`, isCurrent: false, redirectStatus: 308 },
        { path: `${paths[kind]}/${manual}`, isCurrent: true, redirectStatus: 308 },
      ]);

      const repeated = await patchRecord(page, kind, current, { slug: manual });
      expect(repeated.status, JSON.stringify(repeated.body)).toBe(200);
      current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(manual);
      expect(routeRows(contentId)).toHaveLength(2);
      const restored = await patchRecord(page, kind, current, { slug: auto });
      expect(restored.status, JSON.stringify(restored.body)).toBe(200);
      current = await readRecord(page, kind, firstId);
      expect(current.slug).toBe(auto);
      expect(current.path).toBe(`${paths[kind]}/${auto}`);
      expect(routeRows(contentId)).toEqual([
        { path: `${paths[kind]}/${auto}`, isCurrent: true, redirectStatus: 308 },
        { path: `${paths[kind]}/${manual}`, isCurrent: false, redirectStatus: 308 },
      ]);
    } finally {
      for (const id of [firstId, secondId]) {
        if (!id) continue;
        const current = await browserApi(page, `${endpoint}/${id}`);
        if (current.status !== 200) continue;
        const record = current.body as RecordView;
        if (record.publicationStatus !== 'draft') throw new Error('Refusing to delete non-draft slug QA record');
        const removed = await browserApi(page, `${endpoint}/${id}?expectedVersion=${record.version}`, 'DELETE');
        expect(removed.status).toBe(204);
      }
    }
  });
}
