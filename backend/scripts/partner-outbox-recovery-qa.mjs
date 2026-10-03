import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { InventoryMutationService } from '../dist/inventory/inventory-mutation.service.js';

// Never select project credentials, contact Google, or target a durable DB.
assert.equal(process.env.DB_HOST, '127.0.0.1');
assert.equal(process.env.DB_NAME, 'dvb_partner_qa2');
const redisUrl = new URL(process.env.REDIS_URL);
assert.equal(redisUrl.hostname, '127.0.0.1');
assert.ok(process.env.DVB_QA_DISPOSABLE_REDIS === '1', 'Explicit disposable Redis acknowledgement required');
const prisma = new PrismaService();
const connection = new Redis(redisUrl.href, { maxRetriesPerRequest: null });
const sheetsQueue = new Queue('dvb-sheets-sync', { connection });
const holdsQueue = new Queue('dvb-admin-operations', { connection });
const children = new Set();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate, description, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await predicate()) return; await delay(250); }
  throw new Error(`Timed out: ${description}`);
}
async function launchWorker() {
  const child = spawn(process.execPath, [fileURLToPath(new URL('../dist/worker.js', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), windowsHide: true,
    env: { ...process.env, DVB_SHEETS_ADAPTER: 'fake' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  let output = '';
  child.stdout.on('data', (chunk) => { output = (output + chunk.toString()).slice(-12_000); });
  child.stderr.on('data', (chunk) => { output = (output + chunk.toString()).slice(-12_000); });
  let failure;
  child.on('error', (error) => { failure = error; });
  await until(() => {
    if (failure || child.exitCode !== null) throw new Error('QA worker failed to start');
    return output.includes('BullMQ processor ready');
  }, 'compiled production worker ready');
  return child;
}
async function stopWorker(child) {
  if (child.exitCode === null && child.signalCode === null) {
    const stopped = once(child, 'exit');
    child.kill('SIGKILL'); // Kill only the exact test-owned child; simulate abrupt interruption.
    await stopped;
  }
  children.delete(child);
}

const originalFlag = await prisma.setting.findUnique({ where: { key: 'sheetsSync.enabled' } });
try {
  await prisma.$connect();
  await prisma.setting.upsert({ where: { key: 'sheetsSync.enabled' },
    create: { key: 'sheetsSync.enabled', value: true, schemaVersion: 1, isPublic: false }, update: { value: true } });
  const id = randomUUID();
  const user = await prisma.user.create({ data: { email: `qa-outbox-${id}@example.test`, fullName: 'Isolated outbox recovery QA', passwordHash: 'not-a-login-hash' } });
  const org = await prisma.partnerOrganization.create({ data: {
    name: `QA outbox ${id}`, contactName: user.fullName, email: user.email, phone: '0900000000', status: 'active', createdById: user.id,
  } });
  const property = await prisma.property.create({ data: {
    code: `QA-OUTBOX-${id}`, kind: 'homestay', area: 'Disposable QA', address: 'Not a business property',
    content: { create: { kind: 'stay', title: 'Disposable outbox QA', slugSource: `qa-outbox-${id}`, publicationStatus: 'draft', noindex: true } },
    roomTypes: { create: { code: 'QA-ROOM', name: 'Recovery QA', maxAdults: 2, maxChildren: 0, maxOccupancy: 2, status: 'active' } },
  }, include: { roomTypes: true } });
  const room = property.roomTypes[0];
  await prisma.partnerPropertyGrant.create({ data: { organizationId: org.id, propertyId: property.id, canReadInventory: true, roomTypeScope: [room.id] } });
  const today = new Date().toISOString().slice(0, 10);
  const stayDate = new Date(`${today}T00:00:00.000Z`);
  const nextDay = new Date(stayDate.getTime() + 86_400_000).toISOString().slice(0, 10);
  const workbook = await prisma.sheetWorkbook.create({ data: {
    spreadsheetId: `fake-qa-recovery-${id}`, title: 'Fake recovery only',
    periodStart: new Date(Date.UTC(stayDate.getUTCFullYear(), stayDate.getUTCMonth(), 1)),
    periodEndExclusive: new Date(Date.UTC(stayDate.getUTCFullYear(), stayDate.getUTCMonth() + 1, 1)),
    createdById: user.id, exportPaused: false, importPaused: true,
    bindings: { create: { organizationId: org.id, propertyId: property.id, sheetId: 'qa-tab', sheetTitle: 'QA recovery', outputRange: 'A1:L100', inputRange: 'N1:AC100', resultRange: 'AE1:AM100' } },
  } });
  const mutation = new InventoryMutationService(prisma);
  const key = `qa-outbox-${id}`;
  const command = { from: today, to: nextDay, capacity: 3, blockedCount: 1, expectedVersions: { [today]: 0 } };
  await mutation.updateAdminRange(room.id, command, user.id, key);
  const event = await prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId: room.id, eventType: 'inventory.changed', processedAt: null } });
  const baseline = await prisma.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: room.id, stayDate } } });
  // Advance only this QA event's delivery time, not inventory or confirmation timestamps.
  await prisma.outboxEvent.update({ where: { id: event.id }, data: { availableAt: new Date() } });
  await sheetsQueue.pause();
  const first = await launchWorker();
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).processedAt, null);
  const holdJob = await holdsQueue.add('expire-booking-holds', {}, { jobId: `qa-recovery-${id}`, removeOnComplete: false });
  await until(async () => await holdJob.getState() === 'completed', 'hold expiry executes while Sheets queue paused');
  assert.notEqual(holdsQueue.name, sheetsQueue.name);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).processedAt, null);
  await stopWorker(first);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).processedAt, null);
  const second = await launchWorker();
  assert.notEqual(first.pid, second.pid);
  await sheetsQueue.resume();
  await sheetsQueue.add('export-inventory-outbox', {}, { jobId: `qa-recovery-export-${id}` });
  await until(async () => !!(await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).processedAt, 'persisted outbox consumed after restart');
  const runs = await prisma.sheetSyncRun.findMany({ where: { workbookId: workbook.id, direction: 'export', status: 'succeeded' } });
  assert.ok(runs.some((run) => run.detail?.outputOnly === true && run.detail?.exportedBindings === 1), 'actual worker completed the fake OUTPUT projection');
  const after = await prisma.inventoryDay.findUniqueOrThrow({ where: { roomTypeId_stayDate: { roomTypeId: room.id, stayDate } } });
  assert.deepEqual(after, baseline, 'export/restart does not rerun mutation or change confirmation/commitment counters');
  const replay = await mutation.updateAdminRange(room.id, command, user.id, key);
  assert.equal(replay.replayed, true);
  assert.equal(await prisma.inventoryChange.count({ where: { roomTypeId: room.id, idempotencyKey: key } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { aggregateId: room.id, eventType: 'inventory.changed' } }), 1);
  assert.equal(await prisma.auditLog.count({ where: { entityId: room.id, action: 'inventory.bulk_updated' } }), 1);
  await stopWorker(second);
  console.log('OUTBOX_WORKER_RESTART_RECOVERY=PASS');
  console.log('WORKER_RESTARTS=1 PERSISTED_EVENT_CONSUMED=YES MUTATION_COUNT=1 OUTBOX_COUNT=1');
  console.log('BOOKING_HOLD_EXPIRY_SEPARATE_QUEUE=PASS GOOGLE_RECOVERY=NOT_RUN');
} finally {
  for (const child of children) await stopWorker(child);
  await sheetsQueue.resume();
  await sheetsQueue.close();
  await holdsQueue.close();
  await connection.quit();
  if (originalFlag) await prisma.setting.update({ where: { key: originalFlag.key }, data: { value: originalFlag.value } });
  else await prisma.setting.deleteMany({ where: { key: 'sheetsSync.enabled' } });
  await prisma.$disconnect();
  // All QA rows/projections/queues belong to disposable PG/Redis, removed by the caller.
}
