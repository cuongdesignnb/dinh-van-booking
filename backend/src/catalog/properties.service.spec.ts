import assert from 'node:assert/strict';
import test from 'node:test';
import { PropertiesService } from './properties.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import type { UpdateRoomDto } from './dto/property.dto';

function roomService() {
  const rateCreates: Array<{ baseRateVnd: bigint }> = [];
  const tx = {
    roomType: { updateMany: async () => ({ count: 1 }) },
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
