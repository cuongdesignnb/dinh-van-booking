import assert from 'node:assert/strict';
import test from 'node:test';
import { hasSellableStayRoom } from './public-catalog.service';
import { PublicCatalogService } from './public-catalog.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';

test('public site exposes only the availability capability, false unless explicitly true', async () => {
  const service = Object.create(PublicCatalogService.prototype) as PublicCatalogService;
  let flag: unknown = false;
  Object.defineProperty(service, 'prisma', { value: {} as PrismaService });
  Object.defineProperty(service, 'settings', { value: {
    publicSnapshot: async () => ({ 'brand.identity': { name: 'QA' } }),
    get: async (key: string) => { assert.equal(key, 'publicAvailability.enabled'); return flag; },
  } as unknown as SettingsService });
  for (const value of [false, true, undefined, 'true']) {
    flag = value;
    const result = await service.site();
    assert.deepEqual(result.features, { publicAvailability: value === true });
    assert.equal('publicAvailability.enabled' in result.settings, false);
    assert.equal('partnerPortal.enabled' in result.settings, false);
    assert.equal('sheetsSync.enabled' in result.settings, false);
  }
});

test('public stay needs an active room unit and active rate; zero means contact-only', () => {
  assert.equal(hasSellableStayRoom([{ capacityVerified: true, units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), true);
  assert.equal(hasSellableStayRoom([{ capacityVerified: false, units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ capacityVerified: true, units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ capacityVerified: true, units: [{ active: false }], ratePlans: [{ active: true, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([{ capacityVerified: true, units: [{ active: true }], ratePlans: [{ active: true, baseRateVnd: 0n }] }]), true);
  assert.equal(hasSellableStayRoom([{ capacityVerified: true, units: [{ active: true }], ratePlans: [{ active: false, baseRateVnd: 500000n }] }]), false);
  assert.equal(hasSellableStayRoom([
    { capacityVerified: true, units: [{ active: true }], ratePlans: [] },
    { capacityVerified: true, units: [], ratePlans: [{ active: true, baseRateVnd: 500000n }] },
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
