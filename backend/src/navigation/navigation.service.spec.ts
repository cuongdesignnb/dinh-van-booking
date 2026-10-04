import assert from 'node:assert/strict';
import test from 'node:test';
import { NavigationService } from './navigation.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';

test('availability menu filtering is capability-aware without changing admin items or DB', async () => {
  let flag: unknown = false;
  const menu = { id: 'qa', key: 'primary', name: 'Custom', items: [
    { id: 'home', label: 'Nhà', contentId: null, externalUrl: '/', position: 4, enabled: true, content: null },
    { id: 'calendar', label: 'Kiểm tra', contentId: null, externalUrl: '/lich-phong/?rooms=1', position: 9, enabled: true, content: null },
  ] };
  const service = new NavigationService({ navigationMenu: { findUnique: async () => menu } } as unknown as PrismaService,
    { get: async () => flag } as unknown as SettingsService);
  for (const value of [false, undefined, 'true', true]) {
    flag = value; assert.equal((await service.publicMenu('primary')).length, value === true ? 2 : 1);
    assert.equal((await service.adminPrimaryMenu()).items.length, 2);
  }
});
