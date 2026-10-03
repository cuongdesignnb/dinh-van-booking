import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { AdminOperationsService } from './admin-operations/admin-operations.service';
import { SheetsService } from './sheets/sheets.service';
import { PartnerService } from './partners/partner.service';
import { loadConfig } from './common/config/env';

const QUEUE_NAME = 'dvb-admin-operations';
const SHEETS_QUEUE_NAME = 'dvb-sheets-sync';

async function main(): Promise<void> {
  const logger = new Logger('Worker');
  const config = loadConfig();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const operations = app.get(AdminOperationsService);
  const sheets = app.get(SheetsService);
  const partners = app.get(PartnerService);
  const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: true });
  const queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  const sheetsQueue = new Queue(SHEETS_QUEUE_NAME, {
    connection,
    defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 100, removeOnFail: 500 },
  });
  const worker = new Worker(QUEUE_NAME, async (job) => {
    if (job.name === 'expire-booking-holds') {
      const processed = await operations.expireHolds();
      logger.log(`Expired ${processed} booking hold(s)`);
      return { processed };
    }
    throw new Error(`Unsupported admin operation job: ${job.name}`);
  }, { connection, concurrency: 1, limiter: { max: 10, duration: 1_000 } });

  // Sheets runs on a distinct queue so provider timeouts/retries cannot block hold expiry.
  const sheetsWorker = new Worker(SHEETS_QUEUE_NAME, async (job) => {
    if (job.name === 'poll-sheet-imports') return sheets.pollScheduled();
    if (job.name === 'export-inventory-outbox') return sheets.exportPending();
    if (job.name === 'notify-stale-partner-inventory') return partners.notifyStaleInventory();
    throw new Error(`Unsupported Sheets sync job: ${job.name}`);
  }, { connection, concurrency: 2, limiter: { max: 4, duration: 1_000 } });

  worker.on('failed', (job, error) => logger.error(`Job ${job?.name ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? 0})`, error.stack));
  worker.on('error', (error) => logger.error('BullMQ worker error', error.stack));
  sheetsWorker.on('failed', (job, error) => logger.error(`Sheets job ${job?.name ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? 0})`, error.stack));
  sheetsWorker.on('error', (error) => logger.error('Sheets worker error', error.stack));
  await worker.waitUntilReady();
  await queue.upsertJobScheduler('expire-booking-holds-periodic', { every: 15_000 }, {
    name: 'expire-booking-holds',
    data: {},
  });
  await sheetsWorker.waitUntilReady();
  await sheetsQueue.upsertJobScheduler('sheets-import-periodic', { every: 60_000 }, { name: 'poll-sheet-imports', data: {} });
  await sheetsQueue.upsertJobScheduler('sheets-export-outbox-periodic', { every: 15_000 }, { name: 'export-inventory-outbox', data: {} });
  await sheetsQueue.upsertJobScheduler('partner-inventory-reminders-hourly', { every: 60 * 60_000 }, { name: 'notify-stale-partner-inventory', data: {} });
  logger.log(`BullMQ processor ready for ${QUEUE_NAME} (hold expiry 15s) and ${SHEETS_QUEUE_NAME} (outbox export 15s, import poll 60s, partner reminders 60m)`);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.log(`Received ${signal}, draining worker`);
    await worker.close();
    await sheetsWorker.close();
    await queue.close();
    await sheetsQueue.close();
    await connection.quit();
    await app.close();
  };
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });
}

void main().catch((error: unknown) => {
  const logger = new Logger('Worker');
  logger.error('Worker startup failed', error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
