import assert from 'node:assert/strict';
import test from 'node:test';
import { PropertiesService } from './properties.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import type { CreateRoomDto, UpdateRoomDto } from './dto/property.dto';

function createRoomService() {
  const created: Array<{ status: string; propertyId: string }> = [];
  const units: unknown[] = [];
  const rates: unknown[] = [];
  const tx = {
    roomType: {
      count: async () => 0,
      create: async ({ data }: { data: { status: string; propertyId: string } }) => {
        created.push(data);
        return { id: 'new-room-id' };
      },
    },
    roomUnit: { createMany: async ({ data }: { data: unknown[] }) => { units.push(...data); } },
    ratePlan: { create: async ({ data }: { data: unknown }) => { rates.push(data); } },
    contentMedia: { deleteMany: async () => undefined },
    contentNode: { update: async () => undefined },
    auditLog: { create: async () => undefined },
  };
  const prisma = {
    property: { findUnique: async () => ({ id: 'property-id', contentId: 'content-id', content: { publicationStatus: 'draft' } }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const service = new PropertiesService(prisma, undefined as unknown as SettingsService);
  Object.defineProperty(service, 'getOne', { value: async () => ({}) });
  return { service, created, units, rates };
}

const draftCreate = {
  code: 'DRAFT', name: 'Hạng phòng chờ xác minh', maxAdults: 2, maxChildren: 0,
  status: 'inactive',
} satisfies CreateRoomDto;

test('each property can create an inactive room type without inventing units or rates', async () => {
  const { service, created, units, rates } = createRoomService();
  await service.createRoom('property-id', draftCreate, 'user-id');
  assert.equal(created.length, 1);
  assert.equal(created[0].propertyId, 'property-id');
  assert.equal(created[0].status, 'inactive');
  assert.equal(units.length, 0);
  assert.equal(rates.length, 0);
});

test('an active room type cannot be created with unverified price or room count', async () => {
  const { service, created } = createRoomService();
  await assert.rejects(service.createRoom('property-id', { ...draftCreate, status: 'active' }, 'user-id'), /cần số phòng và giá/);
  assert.equal(created.length, 0);
});

function roomService() {
  const rateCreates: Array<{ baseRateVnd: bigint }> = [];
  const tx = {
    roomType: { updateMany: async () => ({ count: 1 }) },
    roomUnit: { findMany: async () => [] },
    ratePlan: {
      create: async ({ data }: { data: { baseRateVnd: bigint } }) => { rateCreates.push(data); },
      update: async () => undefined,
    },
    contentNode: { update: async () => undefined },
    auditLog: { create: async () => undefined },
  };
  const prisma = {
    roomType: { findUnique: async () => ({
      id: 'room-id', propertyId: 'property-id', code: 'DRAFT', version: 1,
      property: { contentId: 'content-id', content: { publicationStatus: 'draft' } },
      ratePlans: [],
    }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const service = new PropertiesService(prisma, undefined as unknown as SettingsService);
  Object.defineProperty(service, 'getOne', { value: async () => ({}) });
  return { service, rateCreates };
}

const draftUpdate = {
  name: 'Phòng chờ xác minh', maxAdults: 2, maxChildren: 0,
  status: 'inactive', expectedVersion: 1,
} satisfies UpdateRoomDto;

test('editing an unpriced draft room does not silently create a 0đ rate', async () => {
  const { service, rateCreates } = roomService();
  await service.updateRoom('property-id', 'room-id', draftUpdate, 'user-id');
  assert.equal(rateCreates.length, 0);
});

test('explicit 0đ on an unpriced room creates a contact-only rate', async () => {
  const { service, rateCreates } = roomService();
  await service.updateRoom('property-id', 'room-id', { ...draftUpdate, rateVnd: 0 }, 'user-id');
  assert.equal(rateCreates.length, 1);
  assert.equal(rateCreates[0].baseRateVnd, 0n);
});

test('an unpriced draft room cannot be activated without verified units and rate', async () => {
  const { service, rateCreates } = roomService();
  await assert.rejects(service.updateRoom('property-id', 'room-id', { ...draftUpdate, status: 'active' }, 'user-id'), /cần số phòng và giá/);
  assert.equal(rateCreates.length, 0);
});
