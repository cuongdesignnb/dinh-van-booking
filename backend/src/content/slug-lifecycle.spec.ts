import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '../generated/prisma/client';
import { applyGeneratedSlug, assertCreateSlug, previewSlug, routeHistory } from './slug-lifecycle';
import { ContentService } from './content.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';

type Node = { id: string; kind: string; slugSource: string | null; version: number; publicationStatus: string; lastPublicChangedAt?: Date };
type Route = { contentId: string; path: string; isCurrent: boolean; redirectStatus: number; createdAt: Date };
type Audit = { actorId: string; action: string; entityType: string; entityId: string; diff: Record<string, unknown>; createdAt: Date };

/** Small in-memory stand-in for the Prisma calls the slug lifecycle makes. */
function fakeDb(nodes: Node[], routes: Array<Omit<Route, 'createdAt'>> = []) {
  let clock = Date.parse('2026-10-01T00:00:00Z');
  const tick = () => new Date((clock += 1000));
  const state = {
    nodes: new Map(nodes.map((node) => [node.id, { ...node }])),
    routes: new Map(routes.map((route) => [route.path, { ...route, createdAt: tick() }])),
    audits: [] as Audit[],
  };
  const db = {
    contentNode: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const node = state.nodes.get(where.id);
        return node ? { ...node } : null;
      },
      findMany: async ({ where }: { where: { kind: string } }) =>
        [...state.nodes.values()].filter((node) => node.kind === where.kind && node.slugSource !== null),
      updateMany: async ({ where, data }: { where: { id: string; version: number }; data: { slugSource: string; lastPublicChangedAt?: Date } }) => {
        const node = state.nodes.get(where.id);
        if (!node || node.version !== where.version) return { count: 0 };
        node.slugSource = data.slugSource;
        node.version += 1;
        if (data.lastPublicChangedAt) node.lastPublicChangedAt = data.lastPublicChangedAt;
        return { count: 1 };
      },
    },
    publicRoute: {
      findMany: async ({ where }: { where: { path?: { startsWith: string }; contentId?: string } }) =>
        [...state.routes.values()]
          .filter((route) => (where.path ? route.path.startsWith(where.path.startsWith) : true)
            && (where.contentId ? route.contentId === where.contentId : true))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      findFirst: async ({ where }: { where: { contentId: string; isCurrent: boolean } }) =>
        [...state.routes.values()].find((route) => route.contentId === where.contentId && route.isCurrent === where.isCurrent) ?? null,
      findUnique: async ({ where }: { where: { path: string } }) => state.routes.get(where.path) ?? null,
      updateMany: async ({ where, data }: { where: { contentId: string; isCurrent: boolean }; data: Partial<Route> }) => {
        for (const route of state.routes.values()) {
          if (route.contentId === where.contentId && route.isCurrent === where.isCurrent) Object.assign(route, data);
        }
      },
      upsert: async ({ where, create, update }: { where: { path: string }; create: Omit<Route, 'createdAt'>; update: Partial<Route> }) => {
        const existing = state.routes.get(where.path);
        if (existing) Object.assign(existing, update);
        else state.routes.set(where.path, { ...create, createdAt: tick() });
      },
    },
    auditLog: {
      create: async ({ data }: { data: Omit<Audit, 'createdAt'> }) => { state.audits.push({ ...data, createdAt: tick() }); },
      findMany: async ({ where }: { where: { entityId: string; action: string } }) =>
        state.audits
          .filter((audit) => audit.entityId === where.entityId && audit.action === where.action)
          .reverse()
          .map((audit) => ({ ...audit, actor: { fullName: 'Owner QA' } })),
    },
  };
  return { db: db as unknown as Prisma.TransactionClient, state };
}

/** Mirrors PublicCatalogService.resolveRoute: every old path → the current path, one hop. */
function resolve(state: ReturnType<typeof fakeDb>['state'], path: string): { kind: 'current' } | { kind: 'redirect'; path: string; status: 308 } | null {
  const route = state.routes.get(path);
  if (!route) return null;
  if (route.isCurrent) return { kind: 'current' };
  const current = [...state.routes.values()].find((item) => item.contentId === route.contentId && item.isCurrent);
  return current && current.path !== path ? { kind: 'redirect', path: current.path, status: 308 } : null;
}

const status = (code: number, errorCode?: string) => (error: unknown) => {
  const err = error as { status?: number; response?: { code?: string } };
  return err.status === code && (errorCode === undefined || err.response?.code === errorCode);
};

test('CREATE: only an exact Generate slug is accepted; reserved, malformed and occupied are rejected', async () => {
  const { db } = fakeDb(
    [{ id: 'old', kind: 'stay', slugSource: 'forest-home-moi', version: 3, publicationStatus: 'published' }],
    [
      { contentId: 'old', path: '/phong-nghi/forest-home', isCurrent: false, redirectStatus: 308 },
      { contentId: 'old', path: '/phong-nghi/forest-home-moi', isCurrent: true, redirectStatus: 308 },
    ],
  );
  await assertCreateSlug(db, 'stay', 'nha-san-forest-home');
  await assert.rejects(() => assertCreateSlug(db, 'stay', 'Nhà Sàn Forest Home'), status(400, 'slug_invalid'));
  await assert.rejects(() => assertCreateSlug(db, 'page', 'admin'), status(400, 'slug_reserved'));
  // A historical (redirecting) path stays owned by its old content.
  await assert.rejects(() => assertCreateSlug(db, 'stay', 'forest-home'), (error: unknown) =>
    status(409, 'slug_conflict')(error) && (error as { response: { suggestion: string } }).response.suggestion === 'forest-home-2');
});

test('CREATE preview: collision is shown with an explicit -2 suggestion, nothing is written', async () => {
  const { db, state } = fakeDb(
    [{ id: 'a', kind: 'article', slugSource: 'phong-nghi-dep-o-cuc-phuong', version: 1, publicationStatus: 'draft' }],
    [{ contentId: 'a', path: '/bai-viet/phong-nghi-dep-o-cuc-phuong', isCurrent: true, redirectStatus: 308 }],
  );
  const preview = await previewSlug(db, { kind: 'article', source: 'Phòng Nghỉ Đẹp Ở Cúc Phương' });
  assert.equal(preview.slug, 'phong-nghi-dep-o-cuc-phuong');
  assert.equal(preview.path, '/bai-viet/phong-nghi-dep-o-cuc-phuong');
  assert.equal(preview.available, false);
  assert.equal(preview.conflict, true);
  assert.equal(preview.suggestion, 'phong-nghi-dep-o-cuc-phuong-2');
  assert.equal(preview.suggestionPath, '/bai-viet/phong-nghi-dep-o-cuc-phuong-2');
  assert.equal(state.routes.size, 1);

  const reserved = await previewSlug(db, { kind: 'page', source: 'Liên hệ' });
  assert.equal(reserved.reserved, true);
  assert.equal(reserved.available, false);
  assert.equal(reserved.suggestion, null);
});

test('GENERATE: first slug for an item created without one (no redirect)', async () => {
  const { db, state } = fakeDb([{ id: 'n', kind: 'stay', slugSource: null, version: 1, publicationStatus: 'draft' }]);
  const result = await applyGeneratedSlug(db, { contentId: 'n', source: 'Nhà Sàn Forest Home', expectedVersion: 1, userId: 'u' });
  assert.deepEqual(result, {
    slug: 'nha-san-forest-home', path: '/phong-nghi/nha-san-forest-home', previousPath: null, redirectCreated: false, version: 2, unchanged: false,
  });
  assert.equal(state.nodes.get('n')?.slugSource, 'nha-san-forest-home');
  assert.equal(state.routes.get('/phong-nghi/nha-san-forest-home')?.isCurrent, true);
  assert.equal(state.audits[0].action, 'content.slug_generated');
});

test('GENERATE: changes slug, old URL 308 one hop, history never chains or loops, own history can be reactivated', async () => {
  const { db, state } = fakeDb(
    [{ id: 's', kind: 'stay', slugSource: 'nha-san-forest-home', version: 12, publicationStatus: 'published' }],
    [{ contentId: 's', path: '/phong-nghi/nha-san-forest-home', isCurrent: true, redirectStatus: 308 }],
  );
  // Published: an unconfirmed change is refused and nothing moves.
  await assert.rejects(
    () => applyGeneratedSlug(db, { contentId: 's', source: 'Nhà Sàn Forest Home Cúc Phương', expectedVersion: 12, userId: 'u' }),
    status(400, 'public_url_change_unconfirmed'),
  );
  assert.equal(state.nodes.get('s')?.version, 12);

  const first = await applyGeneratedSlug(db, { contentId: 's', source: 'Nhà Sàn Forest Home Cúc Phương', expectedVersion: 12, confirmPublicChange: true, userId: 'u' });
  assert.deepEqual(first, {
    slug: 'nha-san-forest-home-cuc-phuong',
    path: '/phong-nghi/nha-san-forest-home-cuc-phuong',
    previousPath: '/phong-nghi/nha-san-forest-home',
    redirectCreated: true,
    version: 13,
    unchanged: false,
  });
  assert.ok(state.nodes.get('s')?.lastPublicChangedAt, 'sitemap lastmod moves for a published URL change');
  assert.deepEqual(state.audits.at(-1)?.diff, {
    fromSlug: 'nha-san-forest-home', toSlug: 'nha-san-forest-home-cuc-phuong',
    fromPath: '/phong-nghi/nha-san-forest-home', toPath: '/phong-nghi/nha-san-forest-home-cuc-phuong',
    redirectCreated: true, expectedVersion: 12, version: 13,
  });

  await applyGeneratedSlug(db, { contentId: 's', source: 'Forest Home Ninh Bình', expectedVersion: 13, confirmPublicChange: true, userId: 'u' });
  // old1 → current and old2 → current directly (no old1 → old2 → current chain).
  assert.deepEqual(resolve(state, '/phong-nghi/nha-san-forest-home'), { kind: 'redirect', path: '/phong-nghi/forest-home-ninh-binh', status: 308 });
  assert.deepEqual(resolve(state, '/phong-nghi/nha-san-forest-home-cuc-phuong'), { kind: 'redirect', path: '/phong-nghi/forest-home-ninh-binh', status: 308 });
  assert.deepEqual(resolve(state, '/phong-nghi/forest-home-ninh-binh'), { kind: 'current' });
  assert.equal([...state.routes.values()].filter((route) => route.isCurrent).length, 1);

  // Going back to an own old slug reactivates that row instead of duplicating it.
  await applyGeneratedSlug(db, { contentId: 's', source: 'nha san forest home', expectedVersion: 14, confirmPublicChange: true, userId: 'u' });
  assert.equal(state.routes.size, 3);
  assert.deepEqual(resolve(state, '/phong-nghi/nha-san-forest-home'), { kind: 'current' });
  for (const path of ['/phong-nghi/nha-san-forest-home-cuc-phuong', '/phong-nghi/forest-home-ninh-binh']) {
    const hop = resolve(state, path);
    assert.deepEqual(hop, { kind: 'redirect', path: '/phong-nghi/nha-san-forest-home', status: 308 });
    assert.deepEqual(resolve(state, (hop as { path: string }).path), { kind: 'current' }, 'redirect target is never itself a redirect');
  }

  const history = await routeHistory(db, 's');
  assert.equal(history.current?.path, '/phong-nghi/nha-san-forest-home');
  assert.equal(history.history.length, 2);
  for (const entry of history.history) {
    assert.equal(entry.redirectStatus, 308);
    assert.equal(entry.actor, 'Owner QA');
    assert.ok(entry.replacedAt);
  }
});

test('GENERATE: stale expectedVersion → 409 version_conflict; collision → 409 slug_conflict; reserved → 400; same slug → no-op', async () => {
  const { db, state } = fakeDb(
    [
      { id: 'a', kind: 'destination', slugSource: 'hang-nguoi-xua', version: 5, publicationStatus: 'draft' },
      { id: 'b', kind: 'destination', slugSource: 'cay-cho-ngan-nam', version: 2, publicationStatus: 'draft' },
    ],
    [
      { contentId: 'a', path: '/diem-den/hang-nguoi-xua', isCurrent: true, redirectStatus: 308 },
      { contentId: 'b', path: '/diem-den/cay-cho-ngan-nam', isCurrent: true, redirectStatus: 308 },
      { contentId: 'b', path: '/diem-den/cay-cho', isCurrent: false, redirectStatus: 308 },
    ],
  );
  await assert.rejects(() => applyGeneratedSlug(db, { contentId: 'a', source: 'Động Người Xưa', expectedVersion: 4, userId: 'u' }), status(409, 'version_conflict'));
  await assert.rejects(() => applyGeneratedSlug(db, { contentId: 'a', source: 'Cây chò ngàn năm', expectedVersion: 5, userId: 'u' }), (error: unknown) =>
    status(409, 'slug_conflict')(error) && (error as { response: { suggestion: string } }).response.suggestion === 'cay-cho-ngan-nam-2');
  // Historical slug of another item is still occupied.
  await assert.rejects(() => applyGeneratedSlug(db, { contentId: 'a', source: 'Cây chò', expectedVersion: 5, userId: 'u' }), status(409, 'slug_conflict'));
  await assert.rejects(() => applyGeneratedSlug(db, { contentId: 'a', source: 'Phòng nghỉ', expectedVersion: 5, userId: 'u' }), status(400, 'slug_reserved'));
  await assert.rejects(() => applyGeneratedSlug(db, { contentId: 'a', source: '  ', expectedVersion: 5, userId: 'u' }), status(400, 'slug_source_required'));
  assert.equal(state.nodes.get('a')?.slugSource, 'hang-nguoi-xua');
  assert.equal(state.nodes.get('a')?.version, 5);

  const same = await applyGeneratedSlug(db, { contentId: 'a', source: 'Hang Người Xưa', expectedVersion: 5, userId: 'u' });
  assert.equal(same.unchanged, true);
  assert.equal(same.version, 5);
  assert.equal(state.audits.length, 0);
});

test('EDIT preview: published item requires confirmation; own history is reactivation, not a conflict', async () => {
  const { db } = fakeDb(
    [{ id: 'p', kind: 'page', slugSource: 'chinh-sach-moi', version: 2, publicationStatus: 'published' }],
    [
      { contentId: 'p', path: '/chinh-sach', isCurrent: false, redirectStatus: 308 },
      { contentId: 'p', path: '/chinh-sach-moi', isCurrent: true, redirectStatus: 308 },
    ],
  );
  const back = await previewSlug(db, { contentId: 'p', source: 'Chính sách' });
  assert.equal(back.available, true);
  assert.equal(back.reactivatesHistory, true);
  assert.equal(back.requiresConfirmation, true);
  assert.equal(back.currentPath, '/chinh-sach-moi');
  const same = await previewSlug(db, { contentId: 'p', source: 'Chính sách mới' });
  assert.equal(same.unchanged, true);
  assert.equal(same.requiresConfirmation, false);
});

function serviceWith(prisma: Record<string, unknown>) {
  const settings = { get: async () => ({ allowedBlocks: ['paragraph'] }) };
  return new ContentService(prisma as unknown as PrismaService, settings as unknown as SettingsService);
}

test('ContentService.create without Generate stores no slug and no route (no hidden title→slug)', async () => {
  const writes: Array<{ model: string; data: Record<string, unknown> }> = [];
  const tx = {
    contentNode: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ model: 'contentNode', data }); return { id: 'new', ...data, publishAt: null, version: 1 }; } },
    publicRoute: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ model: 'publicRoute', data }); } },
    contentRevision: { create: async () => undefined },
    article: { upsert: async () => undefined },
  };
  const prisma = {
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    auditLog: { create: async () => undefined },
    mediaAsset: { count: async () => 0 },
    contentNode: { findUnique: async () => ({ id: 'new', kind: 'article', title: 'Nhà Sàn Cúc Phương', slugSource: null, excerpt: null, bodyDocument: null, publicationStatus: 'draft', publishAt: null, metaTitle: null, metaDescription: null, noindex: false, ogMediaId: null, featured: false, version: 1, updatedAt: new Date(), media: [], routes: [] }) },
  };
  const view = await serviceWith(prisma).create({ kind: 'article', title: 'Nhà Sàn Cúc Phương' }, 'u');
  assert.equal(view.slug, null);
  assert.equal(view.path, null);
  assert.equal(writes.find((write) => write.model === 'contentNode')?.data.slugSource, null);
  assert.equal(writes.some((write) => write.model === 'publicRoute'), false);
});

test('ContentService.update refuses a slug and never touches slug/routes on title, body, SEO or media edits', async () => {
  let updateData: Record<string, unknown> | undefined;
  let routeWrites = 0;
  const node = { id: 'c', kind: 'article', title: 'Cũ', slugSource: 'nha-san-forest-home', version: 7, publicationStatus: 'published', bodyDocument: null };
  const tx = {
    contentNode: {
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { updateData = data; return { count: 1 }; },
      findUnique: async () => ({ ...node, excerpt: null, publishAt: null, metaTitle: null, metaDescription: null, noindex: false, ogMediaId: null, featured: false }),
    },
    publicRoute: new Proxy({}, { get: () => async () => { routeWrites += 1; } }),
    contentMedia: { deleteMany: async () => undefined, createMany: async () => undefined, findMany: async () => [] },
    contentRevision: { create: async () => undefined },
  };
  const prisma = {
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
    auditLog: { create: async () => undefined },
    mediaAsset: { count: async () => 0 },
    contentNode: { findUnique: async ({ include }: { include?: unknown }) => include ? { ...node, excerpt: null, publishAt: null, metaTitle: null, metaDescription: null, noindex: false, ogMediaId: null, featured: false, updatedAt: new Date(), media: [], routes: [{ path: '/bai-viet/nha-san-forest-home' }] } : node },
  };
  const service = serviceWith(prisma);
  await assert.rejects(() => service.update('c', { slug: 'khac', expectedVersion: 7 }, 'u'), status(400, 'slug_not_editable'));

  const view = await service.update('c', {
    title: 'Nhà Sàn Forest Home Cúc Phương',
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mới' }] }] },
    metaTitle: 'SEO mới',
    metaDescription: 'Mô tả mới',
    media: [],
    expectedVersion: 7,
  }, 'u');
  assert.ok(updateData);
  assert.equal('slugSource' in updateData, false);
  assert.equal(routeWrites, 0);
  assert.equal(view.slug, 'nha-san-forest-home');
  assert.equal(view.path, '/bai-viet/nha-san-forest-home');
});

test('publish checklist asks for Generate when the slug is missing', () => {
  const service = serviceWith({});
  const problems = service.publishChecklist({ kind: 'article', title: 'A', slugSource: null, metaTitle: 'A', metaDescription: 'B', bodyDocument: null, article: { authorName: null } });
  assert.ok(problems.includes('Slug/đường dẫn chưa được tạo. Hãy bấm Generate trước khi xuất bản.'));
  assert.ok(problems.includes('Bài viết chưa có tác giả'));
});
