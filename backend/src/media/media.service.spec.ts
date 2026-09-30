import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import { MediaService } from './media.service';

const MEDIA_ID = 'media-test-id';
const asset = {
  id: MEDIA_ID,
  storageKey: 'qa-only/not-created.webp',
  originalFilename: 'qa-only.webp',
  mimeType: 'image/webp',
  byteSize: 12n,
  width: 10,
  height: 8,
  altText: 'Ảnh kiểm thử',
  caption: null,
  renditions: {},
  createdAt: new Date('2026-09-30T00:00:00.000Z'),
};

function withMediaEnvironment<T>(run: () => T): T {
  const names = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET', 'MEDIA_ROOT', 'MEDIA_PUBLIC_BASE'];
  const original = new Map(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    DB_HOST: '127.0.0.1',
    DB_NAME: 'media_test',
    DB_USER: 'media_test',
    DB_PASSWORD: 'media_test_only',
    SESSION_SECRET: 'media_test_session_only',
    MEDIA_ROOT: `${process.env.TEMP ?? process.env.TMP ?? '.'}/dvb-media-service-test-do-not-create`,
    MEDIA_PUBLIC_BASE: '/media',
  });
  try {
    return run();
  } finally {
    for (const [name, value] of original) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function createService(references: {
  contentMedia?: Array<{ mediaId: string }>;
  openGraphContent?: Array<{ ogMediaId: string | null }>;
  settings?: Array<{ key: string; value: unknown }>;
} = {}) {
  let deleted = false;
  const prisma = {
    mediaAsset: {
      findMany: async () => [asset],
      count: async () => 1,
      findUnique: async () => asset,
      delete: async () => { deleted = true; return asset; },
    },
    contentMedia: { findMany: async () => references.contentMedia ?? [] },
    contentNode: { findMany: async () => references.openGraphContent ?? [] },
    setting: { findMany: async () => references.settings ?? [] },
    auditLog: { create: async () => ({}) },
  } as unknown as PrismaService;
  const service = withMediaEnvironment(() => new MediaService(prisma, {} as SettingsService));
  return { service, wasDeleted: () => deleted };
}

test('media list/get report every content, Open Graph and registered-setting reference', async () => {
  const { service } = createService({
    contentMedia: [{ mediaId: MEDIA_ID }],
    openGraphContent: [{ ogMediaId: MEDIA_ID }],
    settings: [{ key: 'brand.identity', value: { logoMediaId: MEDIA_ID } }],
  });

  const listed = await service.list({ page: 1, pageSize: 24 });
  assert.deepEqual(listed.items[0].usage, { count: 3, inUse: true });
  assert.deepEqual((await service.getOne(MEDIA_ID)).usage, { count: 3, inUse: true });
});

test('delete keeps the API conflict guard for an asset in use', async () => {
  const { service, wasDeleted } = createService({ contentMedia: [{ mediaId: MEDIA_ID }] });

  await assert.rejects(service.remove(MEDIA_ID, 'owner'), (error: unknown) => {
    assert.ok(error instanceof ConflictException);
    assert.equal((error.getResponse() as { code: string }).code, 'media_in_use');
    return true;
  });
  assert.equal(wasDeleted(), false);
});

test('unused asset is deletable and its API usage is zero', async () => {
  const { service, wasDeleted } = createService();

  assert.deepEqual((await service.getOne(MEDIA_ID)).usage, { count: 0, inUse: false });
  await service.remove(MEDIA_ID, 'owner');
  assert.equal(wasDeleted(), true);
});
