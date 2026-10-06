import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '../generated/prisma/client';
import { switchCurrentRoute } from './slug-routes';
import { pathForContent } from './slug';

type Route = { contentId: string; path: string; isCurrent: boolean; redirectStatus: number };

function mockRoutes(initial: Route[]) {
  const routes = new Map(initial.map((route) => [route.path, { ...route }]));
  const tx = {
    publicRoute: {
      findUnique: async ({ where }: { where: { path: string } }) => routes.get(where.path) ?? null,
      updateMany: async ({ where, data }: { where: { contentId: string; isCurrent: boolean }; data: Partial<Route> }) => {
        for (const route of routes.values()) {
          if (route.contentId === where.contentId && route.isCurrent === where.isCurrent) Object.assign(route, data);
        }
      },
      upsert: async ({ where, create, update }: { where: { path: string }; create: Route; update: Partial<Route> }) => {
        const existing = routes.get(where.path);
        if (existing) Object.assign(existing, update);
        else routes.set(where.path, { ...create });
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { routes, tx };
}

for (const kind of ['stay', 'combo', 'destination', 'article', 'page']) {
  test(`${kind}: explicit rename keeps one current route and restores own history`, async () => {
    const original = pathForContent(kind, 'forest-home');
    const newer = pathForContent(kind, 'forest-home-new');
    const { routes, tx } = mockRoutes([
      { contentId: 'own', path: original, isCurrent: true, redirectStatus: 301 },
      { contentId: 'other', path: pathForContent(kind, 'occupied'), isCurrent: true, redirectStatus: 301 },
    ]);

    assert.equal(routes.get(original)?.isCurrent, true);
    await switchCurrentRoute(tx, 'own', kind, 'forest-home-new');
    assert.deepEqual(routes.get(original), { contentId: 'own', path: original, isCurrent: false, redirectStatus: 308 });
    assert.equal(routes.get(newer)?.isCurrent, true);
    assert.equal([...routes.values()].filter((route) => route.contentId === 'own' && route.isCurrent).length, 1);

    await assert.rejects(() => switchCurrentRoute(tx, 'own', kind, 'occupied'), (error: unknown) =>
      !!error && typeof error === 'object' && 'status' in error && error.status === 409);
    assert.equal(routes.get(newer)?.isCurrent, true);

    await switchCurrentRoute(tx, 'own', kind, 'forest-home');
    assert.equal(routes.get(original)?.isCurrent, true);
    assert.equal(routes.get(newer)?.isCurrent, false);
    assert.equal(routes.get(newer)?.redirectStatus, 308);
    assert.equal(routes.size, 3);
    assert.equal([...routes.values()].filter((route) => route.contentId === 'own' && route.isCurrent).length, 1);
    // Every historical path points straight to the only current path: no loop.
    assert.equal([...routes.values()].find((route) => route.contentId === 'own' && route.isCurrent)?.path, original);
  });
}
