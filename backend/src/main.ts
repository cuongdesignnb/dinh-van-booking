import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdir } from 'node:fs/promises';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';
import { enableBigIntJson } from './common/bigint';
import { loadConfig } from './common/config/env';
import { SessionGuard } from './common/guards/session.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap(): Promise<void> {
  enableBigIntJson();
  const config = loadConfig();
  await mkdir(config.mediaRoot, { recursive: true });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: config.mediaMaxBytes + 1024 * 1024 }),
  );

  await app.register(fastifyCookie, { secret: config.sessionSecret });
  await app.register(fastifyMultipart, {
    limits: { fileSize: config.mediaMaxBytes, files: 1, fields: 8 },
  });
  // Processed images are served straight off the volume; the gateway proxies
  // /media/ here. Files are content-addressed, so they can cache for a year.
  await app.register(fastifyStatic, {
    root: config.mediaRoot,
    prefix: `${config.mediaPublicBase}/`,
    decorateReply: false,
    cacheControl: true,
    maxAge: '365d',
    immutable: true,
    index: false,
  });

  app.setGlobalPrefix(config.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new SessionGuard(reflector, app.get(AuthService)),
    new PermissionsGuard(reflector),
  );
  app.enableShutdownHooks();

  await app.listen({ port: config.port, host: '0.0.0.0' });
  new Logger('Bootstrap').log(`API listening on :${config.port}/${config.apiPrefix}`);
}

void bootstrap();
