import assert from 'node:assert/strict';
import test from 'node:test';
import { InquiryService } from './inquiry.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateInquiryDto } from './dto/inquiry.dto';

function fixture() {
  const records = new Map<string, { id: string; requestHash: string; responseSnapshot: object | null }>();
  let inquiryCreates = 0;
  const inquiryData: Array<Record<string, unknown>> = [];
  const findKey = async ({ where }: { where: { principalScope_operation_key: { principalScope: string; operation: string; key: string } } }) => {
    const scope = where.principalScope_operation_key;
    return records.get(`${scope.principalScope}:${scope.operation}:${scope.key}`) ?? null;
  };
  const tx = {
    idempotencyKey: {
      findUnique: findKey,
      create: async ({ data }: { data: { principalScope: string; operation: string; key: string; requestHash: string } }) => {
        const record = { id: `key-${records.size + 1}`, requestHash: data.requestHash, responseSnapshot: null };
        records.set(`${data.principalScope}:${data.operation}:${data.key}`, record);
        return record;
      },
      update: async ({ where, data }: { where: { id: string }; data: { responseSnapshot: object } }) => {
        const record = [...records.values()].find((item) => item.id === where.id);
        if (record) record.responseSnapshot = data.responseSnapshot;
      },
    },
    customer: {
      findFirst: async () => null,
      create: async () => ({ id: 'customer-id' }),
    },
    inquiry: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        inquiryCreates += 1;
        inquiryData.push(data);
        return { id: `inquiry-${inquiryCreates}`, createdAt: new Date('2026-09-29T00:00:00.000Z') };
      },
    },
    auditLog: { create: async () => undefined },
  };
  const prisma = {
    idempotencyKey: { findUnique: findKey },
    contentNode: {
      findFirst: async ({ where }: { where: { slugSource: string; kind: string } }) =>
        where.slugSource === 'published-stay' && where.kind === 'stay'
          ? { id: 'content-stay', property: { id: 'property-stay' } }
          : null,
    },
    roomType: {
      findFirst: async ({ where }: { where: { id: string; propertyId: string } }) =>
        where.id === 'room-in-stay' && where.propertyId === 'property-stay' ? { id: 'room-in-stay' } : null,
    },
    $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService;
  return { service: new InquiryService(prisma), getInquiryCreates: () => inquiryCreates, inquiryData };
}

const draft = {
  name: 'Khách kiểm thử', phone: '0912345678', message: 'Cần tư vấn lưu trú',
} satisfies CreateInquiryDto;

test('contact inquiry replays the same receipt after a lost response without a second insert', async () => {
  const { service, getInquiryCreates } = fixture();
  const first = await service.createPublic(draft, 'request-12345678', 'guest:session-a');
  const replay = await service.createPublic(draft, 'request-12345678', 'guest:session-a');
  assert.deepEqual(replay, first);
  assert.equal(getInquiryCreates(), 1);
});

test('contact inquiry rejects reuse of one key with changed content', async () => {
  const { service, getInquiryCreates } = fixture();
  await service.createPublic(draft, 'request-12345678', 'guest:session-a');
  await assert.rejects(service.createPublic({ ...draft, message: 'Nhu cầu khác' }, 'request-12345678', 'guest:session-a'), /nội dung khác/);
  assert.equal(getInquiryCreates(), 1);
});

test('contact inquiry requires a valid key and scopes replay to the current session', async () => {
  const { service, getInquiryCreates } = fixture();
  await assert.rejects(service.createPublic(draft, '', 'guest:session-a'), /Idempotency-Key/);
  await service.createPublic(draft, 'request-12345678', 'guest:session-a');
  await service.createPublic(draft, 'request-12345678', 'guest:session-b');
  assert.equal(getInquiryCreates(), 2);
});

test('contact inquiry stores a verified room only under its published stay, plus dates and room count', async () => {
  const { service, inquiryData } = fixture();
  await service.createPublic({
    ...draft, intent: 'stay', relatedSlug: 'published-stay', roomTypeId: 'room-in-stay',
    checkIn: '2026-10-03', checkOut: '2026-10-05', adults: 3, children: 1, rooms: 2,
  }, 'request-room-1234', 'guest:session-a');
  assert.equal(inquiryData.length, 1);
  assert.equal(inquiryData[0].relatedContentId, 'content-stay');
  assert.equal(inquiryData[0].relatedRoomTypeId, 'room-in-stay');
  assert.equal(inquiryData[0].requestedRooms, 2);
  assert.equal((inquiryData[0].desiredCheckOut as Date).toISOString().slice(0, 10), '2026-10-05');
});

test('contact inquiry rejects a room outside the selected property and an unpublished slug', async () => {
  const { service, getInquiryCreates } = fixture();
  await assert.rejects(service.createPublic({ ...draft, intent: 'stay', relatedSlug: 'published-stay', roomTypeId: 'room-elsewhere' }, 'request-room-1234', 'guest:session-a'), /không thuộc nơi lưu trú/);
  await assert.rejects(service.createPublic({ ...draft, intent: 'stay', relatedSlug: 'not-public' }, 'request-room-1235', 'guest:session-a'), /không còn công khai/);
  await assert.rejects(service.createPublic({ ...draft, intent: 'combo', relatedSlug: 'published-stay', roomTypeId: 'room-in-stay' }, 'request-room-1236', 'guest:session-a'), /Hạng phòng tư vấn/);
  assert.equal(getInquiryCreates(), 0);
});

test('CRM list projects human content and room names without losing original IDs', async () => {
  const row = {
    id: 'inquiry-id', customerId: 'customer-id', source: 'website', intent: 'stay',
    relatedContentId: 'content-stay', relatedRoomTypeId: 'room-in-stay',
    desiredCheckIn: new Date('2026-10-03T00:00:00.000Z'), desiredCheckOut: new Date('2026-10-05T00:00:00.000Z'),
    adults: 3, children: 1, requestedRooms: 2, message: 'Tư vấn', stage: 'new', priority: false,
    version: 1, createdAt: new Date('2026-09-29T00:00:00.000Z'), updatedAt: new Date('2026-09-29T00:00:00.000Z'),
    customer: { fullName: 'Khách kiểm thử', phone: '0912345678', email: null }, roomType: { name: 'Bungalow gia đình' },
  };
  const prisma = {
    inquiry: { findMany: async () => [row], count: async () => 1 },
    contentNode: { findMany: async () => [{ id: 'content-stay', title: 'Khu nghỉ Cúc Phương' }] },
  } as unknown as PrismaService;
  const result = await new InquiryService(prisma).list({ page: 1, pageSize: 10 });
  assert.deepEqual(result.items[0], {
    id: 'inquiry-id', customerId: 'customer-id', customer: { name: 'Khách kiểm thử', phone: '0912345678', email: null },
    source: 'website', intent: 'stay', relatedContentId: 'content-stay', relatedContentTitle: 'Khu nghỉ Cúc Phương',
    relatedRoomTypeId: 'room-in-stay', relatedRoomName: 'Bungalow gia đình', desiredCheckIn: '2026-10-03',
    desiredCheckOut: '2026-10-05', adults: 3, children: 1, requestedRooms: 2, message: 'Tư vấn', stage: 'new',
    priority: false, version: 1, createdAt: '2026-09-29T00:00:00.000Z', updatedAt: '2026-09-29T00:00:00.000Z',
  });
});
