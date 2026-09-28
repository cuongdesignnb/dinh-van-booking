import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSellableStayRoom } from './public-catalog.service';
import { PublicCatalogService } from './public-catalog.service';
import type { PrismaService } from '../prisma/prisma.service';

test('public stay needs an active room unit and a positive active rate on the same room type', () => {
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), true);
  assert.equal(hasSellableStayRoom([{ units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: false }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 0n }] }]), false);
  assert.equal(hasSellableStayRoom([{ units: [{ active: true }], ratePlans: [{ active: false, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([
    { units: [{ active: true }], ratePlans: [] },
    { units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] },
  ]), false);
});

test('historical rows with legacy 301 resolve as 308 directly to the single current path', async () => {
  const prisma = {
    publicRoute: {
      findUnique: async () => ({
        isCurrent: false, redirectStatus: 301,
        content: {
          isDemo: false, publicationStatus: 'published', publishAt: null,
          routes: [{ path: '/phong-nghi/forest-home' }],
        },
      }),
    },
  } as unknown as PrismaService;
  // The resolver needs only Prisma; bypass the constructor's unrelated runtime
  // environment initialization in this isolated unit test.
  const service = Object.create(PublicCatalogService.prototype) as PublicCatalogService;
  Object.defineProperty(service, 'prisma', { value: prisma });
  assert.deepEqual(await service.resolveRoute('/phong-nghi/forest-home-2'), {
    kind: 'redirect', path: '/phong-nghi/forest-home', status: 308,
  });
  await assert.rejects(() => service.resolveRoute('/phong-nghi/forest-home'), /Không tìm thấy đường dẫn công khai/);
});
