import { randomUUID } from 'node:crypto';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { hashPassword } from '../dist/common/crypto.js';

if (process.env.DB_NAME !== 'dvb_partner_qa2' || process.env.DB_HOST !== '127.0.0.1') {
  throw new Error('Refusing to seed: only the isolated dvb_partner_qa2 database is allowed.');
}
const password = process.env.DVB_QA_PARTNER_PASSWORD;
if (!password || password.length < 12) throw new Error('Set DVB_QA_PARTNER_PASSWORD to a disposable QA-only password.');

const prisma = new PrismaService();
const id = randomUUID().replaceAll('-', '').slice(0, 12);
const email = `partner-ui-${id}@example.test`;
try {
  await prisma.$connect();
  const user = await prisma.user.create({ data: { email, fullName: 'Isolated partner UI tester', passwordHash: await hashPassword(password) } });
  const organization = await prisma.partnerOrganization.create({ data: {
    name: `QA partner ${id}`, contactName: user.fullName, email, phone: '0900000000',
    status: 'active', verificationStatus: 'verified', createdById: user.id,
  } });
  await prisma.partnerMembership.create({ data: { organizationId: organization.id, userId: user.id, role: 'owner', status: 'active' } });
  const slug = `qa-partner-${id.toLowerCase()}`;
  const property = await prisma.property.create({ data: {
    code: `QA-UI-${id.toUpperCase()}`, kind: 'homestay', area: 'Isolated UI QA', address: 'Disposable test data only', operatingStatus: 'active',
    content: { create: {
      kind: 'stay', title: `QA partner property ${id}`, slugSource: slug, excerpt: 'Isolated partner UI test fixture',
      bodyDocument: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Disposable UI test content.' }] }] },
      publicationStatus: 'published', noindex: false,
      routes: { create: { path: `/phong-nghi/${slug}` } },
    } },
    roomTypes: { create: { code: 'QA-ROOM', name: 'Phòng kiểm thử', maxAdults: 2, maxChildren: 1, maxOccupancy: 3, capacityVerified: true, status: 'active' } },
  }, include: { roomTypes: true } });
  const room = property.roomTypes[0];
  await prisma.ratePlan.create({ data: { roomTypeId: room.id, code: 'QA-RATE', name: 'Giá kiểm thử', baseRateVnd: 0n } });
  await prisma.roomUnit.create({ data: { roomTypeId: room.id, code: 'QA-UNIT-1', label: 'Đơn vị QA' } });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const firstNight = new Date(`${today}T00:00:00.000Z`);
  await prisma.inventoryDay.createMany({ data: Array.from({ length: 8 }, (_, offset) => {
    const stayDate = new Date(firstNight);
    stayDate.setUTCDate(stayDate.getUTCDate() + offset);
    return { roomTypeId: room.id, stayDate, capacity: 2, blockedCount: 0, heldCount: 0, reservedCount: 0, stopSell: false, lastConfirmedAt: new Date() };
  }) });
  await prisma.partnerPropertyGrant.create({ data: {
    organizationId: organization.id, propertyId: property.id, status: 'active', canReadInventory: true, canWriteInventory: true,
    canEditRates: true, canEditProfile: true, canUploadMedia: false, roomTypeScope: ['*'], approvedById: user.id, approvedAt: new Date(),
  } });
  for (const key of ['partnerPortal.enabled', 'inventoryCalendar.enabled', 'publicAvailability.enabled']) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: true, schemaVersion: 1, isPublic: false }, update: { value: true, version: { increment: 1 } } });
  }
  console.log(JSON.stringify({ email, propertyId: property.id, organizationId: organization.id, slug }));
} finally {
  await prisma.$disconnect();
}
