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
import { PrismaService } from './prisma/prisma.service';
import { PERMISSIONS } from './common/permissions';
import { SESSION_COOKIE } from './common/guards/session.guard';

async function bootstrap(): Promise<void> {
  enableBigIntJson();
  const config = loadConfig();
  await mkdir(config.mediaRoot, { recursive: true });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Slugs may be 120 characters plus a uniqueness suffix; Fastify's default
    // 100-character param limit otherwise turns valid published URLs into 414.
    new FastifyAdapter({ trustProxy: true, bodyLimit: config.mediaMaxBytes + 1024 * 1024, maxParamLength: 200 }),
  );

  await app.register(fastifyCookie, { secret: config.sessionSecret });
  await app.register(fastifyMultipart, {
    limits: { fileSize: config.mediaMaxBytes, files: 1, fields: 8 },
  });
  const fastify = app.getHttpAdapter().getInstance();
  const prisma = app.get(PrismaService);
  const auth = app.get(AuthService);
  const privateMediaRequests = new WeakSet<object>();
  const mediaPrefix = `${config.mediaPublicBase.replace(/\/$/, '')}/`;
  fastify.addHook('preHandler', async (request, reply) => {
    const requestUrl = request.raw.url ?? '';
    const path = new URL(requestUrl, 'http://localhost').pathname;
    if (!path.startsWith(mediaPrefix)) return;

    let storageKey: string;
    try {
      storageKey = decodeURIComponent(path.slice(mediaPrefix.length));
    } catch {
      reply.header('Cache-Control', 'no-store').header('X-Robots-Tag', 'noindex').code(404).send();
      return;
    }
    const pathSegments = storageKey.split('/');
    if (
      !storageKey ||
      storageKey.includes('\\') ||
      pathSegments.some((segment) => !segment || segment === '.' || segment === '..')
    ) {
      reply.header('Cache-Control', 'no-store').header('X-Robots-Tag', 'noindex').code(404).send();
      return;
    }

    const asset = await prisma.mediaAsset.findUnique({
      where: { storageKey },
      select: { visibility: true, isDemo: true, processingStatus: true, ownerOrganizationId: true },
    });
    const isPublicReady = asset?.visibility === 'public' && asset.isDemo === false && asset.processingStatus === 'ready';
    if (isPublicReady) return;

    const cookies = (request as typeof request & { cookies?: Record<string, string> }).cookies;
    const token = cookies?.[SESSION_COOKIE];
    const user = token ? await auth.resolveSession(token) : null;
    const partnerOwnsAsset = user && asset?.ownerOrganizationId
      ? !!(await prisma.partnerMembership.findFirst({ where: {
        userId: user.id, organizationId: asset.ownerOrganizationId, status: 'active', organization: { status: 'active' },
      }, select: { organizationId: true } }))
      : false;
    if (!user?.permissions.includes(PERMISSIONS.mediaRead) && !partnerOwnsAsset) {
      reply.header('Cache-Control', 'no-store').header('X-Robots-Tag', 'noindex').code(404).send();
      return;
    }
    privateMediaRequests.add(request);
    reply.header('Cache-Control', 'private, no-store');
  });
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (privateMediaRequests.has(request)) reply.header('Cache-Control', 'private, no-store');
    return payload;
  });

  // Public files are immutable, while the hook above checks visibility and
  // session permissions before any static file can be served.
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
