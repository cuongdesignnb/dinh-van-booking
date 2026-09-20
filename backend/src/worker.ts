import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { enableBigIntJson } from './common/bigint';
import { loadConfig } from './common/config/env';

// Background jobs (hold expiry, outbox dispatch, media derivatives) run here so
// a slow job never blocks an HTTP request. Queues are added per phase.
async function main(): Promise<void> {
  enableBigIntJson();
  const config = loadConfig();
  const logger = new Logger('Worker');
  logger.log(`Worker started (redis ${config.redisUrl.replace(/\/\/.*@/, '//')})`);

  const shutdown = (signal: string) => {
    logger.log(`Received ${signal}, shutting down`);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keeps the process alive until a queue processor is registered.
  setInterval(() => undefined, 1 << 30);
}

void main();
