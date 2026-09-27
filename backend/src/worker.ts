import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { AdminOperationsService } from './admin-operations/admin-operations.service';
import { loadConfig } from './common/config/env';

const QUEUE_NAME = 'dvb-admin-operations';

async function main(): Promise<void> {
  const logger = new Logger('Worker');
  const config = loadConfig();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const operations = app.get(AdminOperationsService);
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
  const worker = new Worker(QUEUE_NAME, async (job) => {
    if (job.name === 'expire-booking-holds') {
      const processed = await operations.expireHolds();
      logger.log(`Expired ${processed} booking hold(s)`);
      return { processed };
    }
    throw new Error(`Unsupported admin operation job: ${job.name}`);
  }, { connection, concurrency: 1, limiter: { max: 10, duration: 1_000 } });

  worker.on('failed', (job, error) => logger.error(`Job ${job?.name ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? 0})`, error.stack));
  worker.on('error', (error) => logger.error('BullMQ worker error', error.stack));
  await worker.waitUntilReady();
  await queue.upsertJobScheduler('expire-booking-holds-periodic', { every: 15_000 }, {
    name: 'expire-booking-holds',
    data: {},
  });
  logger.log(`BullMQ processor ready for queue ${QUEUE_NAME}; hold expiry runs every 15 seconds`);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.log(`Received ${signal}, draining worker`);
    await worker.close();
    await queue.close();
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
