import assert from 'node:assert/strict';
import test from 'node:test';
import { PropertiesService } from './properties.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import type { CreateRoomDto, UpdateRoomDto } from './dto/property.dto';
import { ROOM_AMENITY_CODES } from './room-amenities';

function createRoomService(existingRooms: Array<{ id: string; propertyId: string; name: string }> = []) {
  const created: Array<{ status: string; propertyId: string; capacityVerified: boolean; maxAdults: number; unitKind: string | null; bedroomCount: number | null; bathroomCount: number | null }> = [];
  const units: unknown[] = [];
  const rates: unknown[] = [];
  const roomAmenities: Array<{ roomTypeId: string; amenityId: string }> = [];
  const tx = {
    roomType: {
      count: async () => 0,
      findMany: async ({ where }: { where: { propertyId: string } }) => existingRooms.filter((room) => room.propertyId === where.propertyId),
      create: async ({ data }: { data: { status: string; propertyId: string; capacityVerified: boolean; maxAdults: number; unitKind: string | null; bedroomCount: number | null; bathroomCount: number | null } }) => {
        created.push(data);
        return { id: 'new-room-id' };
      },
    },
    roomUnit: { createMany: async ({ data }: { data: unknown[] }) => { units.push(...data); } },
    ratePlan: { create: async ({ data }: { data: unknown }) => { rates.push(data); } },
    amenity: { upsert: async ({ where }: { where: { code: string } }) => ({ id: where.code }) },
    roomTypeAmenity: {
      deleteMany: async () => undefined,
      create: async ({ data }: { data: { roomTypeId: string; amenityId: string } }) => { roomAmenities.push(data); },
    },
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
  return { service, created, units, rates, roomAmenities };
}

const draftCreate = {
  code: 'DRAFT', name: 'Hạng phòng chờ xác minh',
  status: 'inactive',
} satisfies CreateRoomDto;

test('each property can create an inactive room type without inventing units or rates', async () => {
  const { service, created, units, rates } = createRoomService();
  await service.createRoom('property-id', draftCreate, 'user-id');
  assert.equal(created.length, 1);
  assert.equal(created[0].propertyId, 'property-id');
  assert.equal(created[0].status, 'inactive');
  assert.equal(created[0].capacityVerified, false);
  assert.equal(created[0].maxAdults, 1); // Technical storage sentinel, never exposed as verified capacity.
  assert.equal(created[0].unitKind, null);
  assert.equal(created[0].bedroomCount, null);
  assert.equal(units.length, 0);
  assert.equal(rates.length, 0);
});

test('different room layouts stay attached to their own property, with no shared template', async () => {
  const { service, created } = createRoomService();
  await service.createRoom('resort-id', { ...draftCreate, code: 'VILLA', name: 'Villa hồ', unitKind: 'villa', bedroomCount: 2, bathroomCount: 2 }, 'user-id');
  await service.createRoom('homestay-id', { ...draftCreate, code: 'BUNGALOW', name: 'Bungalow đôi', unitKind: 'bungalow', bedroomCount: 1, bathroomCount: 1 }, 'user-id');
  assert.deepEqual(created.map(({ propertyId, unitKind, bedroomCount, bathroomCount }) => ({ propertyId, unitKind, bedroomCount, bathroomCount })), [
    { propertyId: 'resort-id', unitKind: 'villa', bedroomCount: 2, bathroomCount: 2 },
    { propertyId: 'homestay-id', unitKind: 'bungalow', bedroomCount: 1, bathroomCount: 1 },
  ]);
});

test('an existing category cannot be recreated under another code or Vietnamese accent variant', async () => {
  const { service, created } = createRoomService([{ id: 'executive', propertyId: 'resort-id', name: 'Executive Villa' }]);
  await assert.rejects(service.createRoom('resort-id', { ...draftCreate, code: 'ANOTHER-CODE', name: '  executive   villa  ' }, 'user-id'), /đã có trong nơi lưu trú/);
  await service.createRoom('other-resort-id', { ...draftCreate, code: 'EXECUTIVE', name: 'Executive Villa' }, 'user-id');
  assert.equal(created.length, 1);
  assert.equal(created[0].propertyId, 'other-resort-id');
});

test('verified facilities attach only to the newly created room category', async () => {
  const { service, roomAmenities } = createRoomService();
  await service.createRoom('resort-id', { ...draftCreate, amenityCodes: ['room_wifi', 'room_balcony'] }, 'user-id');
  assert.deepEqual(roomAmenities, [
    { roomTypeId: 'new-room-id', amenityId: 'room_wifi' },
    { roomTypeId: 'new-room-id', amenityId: 'room_balcony' },
  ]);
});

test('an active room type cannot be created with unverified price or room count', async () => {
  const { service, created } = createRoomService();
  await assert.rejects(service.createRoom('property-id', { ...draftCreate, status: 'active', capacityVerified: true, maxAdults: 2, maxChildren: 0 }, 'user-id'), /cần số phòng và giá/);
  assert.equal(created.length, 0);
});

test('an unverified room cannot be active even with units and a rate', async () => {
  const { service, created } = createRoomService();
  await assert.rejects(service.createRoom('property-id', { ...draftCreate, status: 'active', unitCount: 1, rateVnd: 100000 }, 'user-id'), /cần xác minh sức chứa/);
  assert.equal(created.length, 0);
});

function roomService(existingRooms: Array<{ id: string; name: string }> = []) {
  const rateCreates: Array<{ baseRateVnd: bigint }> = [];
  const updates: Array<Record<string, unknown>> = [];
  const roomAmenityReplacements: unknown[] = [];
  const tx = {
    roomType: {
      findMany: async () => existingRooms,
      updateMany: async ({ data }: { data: Record<string, unknown> }) => { updates.push(data); return { count: 1 }; },
    },
    roomUnit: { findMany: async () => [] },
    ratePlan: {
      create: async ({ data }: { data: { baseRateVnd: bigint } }) => { rateCreates.push(data); },
      update: async () => undefined,
    },
    amenity: { upsert: async ({ where }: { where: { code: string } }) => ({ id: where.code }) },
    roomTypeAmenity: {
      deleteMany: async ({ where }: { where: unknown }) => { roomAmenityReplacements.push(where); },
      create: async ({ data }: { data: unknown }) => { roomAmenityReplacements.push(data); },
    },
    contentNode: { update: async () => undefined },
    auditLog: { create: async () => undefined },
  };
  const prisma = {
    roomType: { findUnique: async () => ({
      id: 'room-id', propertyId: 'property-id', code: 'DRAFT', version: 1,
      maxAdults: 1, maxChildren: 0, capacityVerified: false,
      unitKind: 'villa', bedroomCount: 2, bathroomCount: 2,
      property: { contentId: 'content-id', content: { publicationStatus: 'draft' } },
      ratePlans: [],
    }) },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  const service = new PropertiesService(prisma, undefined as unknown as SettingsService);
  Object.defineProperty(service, 'getOne', { value: async () => ({}) });
  return { service, rateCreates, updates, roomAmenityReplacements };
}

const draftUpdate = {
  name: 'Phòng chờ xác minh', maxAdults: 2, maxChildren: 0,
  status: 'inactive', expectedVersion: 1,
} satisfies UpdateRoomDto;

test('editing an unpriced draft room does not silently create a 0đ rate', async () => {
  const { service, rateCreates, updates } = roomService();
  await service.updateRoom('property-id', 'room-id', draftUpdate, 'user-id');
  assert.equal(rateCreates.length, 0);
  assert.deepEqual([updates[0].unitKind, updates[0].bedroomCount, updates[0].bathroomCount], ['villa', 2, 2]);
});

test('editing one room can explicitly replace its own layout without touching another', async () => {
  const { service, updates } = roomService();
  await service.updateRoom('property-id', 'room-id', { ...draftUpdate, unitKind: 'suite', bedroomCount: 1, bathroomCount: null }, 'user-id');
  assert.deepEqual([updates[0].unitKind, updates[0].bedroomCount, updates[0].bathroomCount], ['suite', 1, null]);
});

test('renaming a category to another category at the same property is rejected', async () => {
  const { service, updates } = roomService([{ id: 'room-id', name: 'Villa vườn' }, { id: 'other-room-id', name: 'Suite hướng hồ' }]);
  await assert.rejects(service.updateRoom('property-id', 'room-id', { ...draftUpdate, name: 'suite  huong ho' }, 'user-id'), /Tên hạng phòng đã có/);
  assert.equal(updates.length, 0);
});

test('editing facilities replaces only managed choices of the requested room', async () => {
  const { service, roomAmenityReplacements } = roomService();
  await service.updateRoom('property-id', 'room-id', { ...draftUpdate, amenityCodes: ['room_kitchen'] }, 'user-id');
  assert.deepEqual(roomAmenityReplacements[0], { roomTypeId: 'room-id', amenity: { code: { in: ROOM_AMENITY_CODES } } });
  assert.deepEqual(roomAmenityReplacements[1], { roomTypeId: 'room-id', amenityId: 'room_kitchen' });
});

test('explicit 0đ on an unpriced room creates a contact-only rate', async () => {
  const { service, rateCreates } = roomService();
  await service.updateRoom('property-id', 'room-id', { ...draftUpdate, rateVnd: 0 }, 'user-id');
  assert.equal(rateCreates.length, 1);
  assert.equal(rateCreates[0].baseRateVnd, 0n);
});

test('an unpriced draft room cannot be activated without verified units and rate', async () => {
  const { service, rateCreates } = roomService();
  await assert.rejects(service.updateRoom('property-id', 'room-id', { ...draftUpdate, status: 'active', capacityVerified: true }, 'user-id'), /cần số phòng và giá/);
  assert.equal(rateCreates.length, 0);
});
