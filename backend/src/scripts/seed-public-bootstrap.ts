import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';
import { Prisma, type MediaAsset } from '../generated/prisma/client';
import { loadConfig } from '../common/config/env';
import { ROLES } from '../common/permissions';
import { MediaService, encodeMediaWebp, type MediaProcessingSettings } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { SETTINGS_BY_KEY } from '../settings/settings.registry';
import { SettingsService, mergeWithDefault } from '../settings/settings.service';
import { PUBLIC_BOOTSTRAP_MEDIA, PUBLIC_BOOTSTRAP_MENU, publicBootstrapSettings, type BootstrapMediaKey } from './data/public-bootstrap';

type Options = { apply: boolean; replaceExisting: boolean; actorEmail?: string; only?: string[] };
type MediaPlan = { key: BootstrapMediaKey; source: string; filename: string; buffer: Buffer; alt: string; caption: string; sha: string; existing: MediaAsset | null };
type SettingPlan = { key: string; action: 'create' | 'skip' | 'replace'; differs: boolean; before: unknown; after: unknown; version: number | null };

export function parseBootstrapArgs(args: string[]): Options {
  const options: Options = { apply: false, replaceExisting: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error(`Tham số lặp: ${arg}`);
    seen.add(arg);
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg === '--replace-existing') options.replaceExisting = true;
    else if (arg === '--actor-email') {
      const email = args[++index];
      if (!email || email.startsWith('--')) throw new Error('Thiếu email cho --actor-email');
      options.actorEmail = email.trim().toLowerCase();
    } else if (arg === '--only') {
      // Comma-separated key prefixes, e.g. `brand.,site.,home.`; every other key is skipped.
      const value = args[++index];
      const prefixes = (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
      if (!value || value.startsWith('--') || !prefixes.length) throw new Error('Thiếu danh sách key cho --only');
      options.only = prefixes;
    } else throw new Error(`Tham số không hợp lệ: ${arg}`);
  }
  if (seen.has('--apply') && seen.has('--dry-run')) throw new Error('Chỉ chọn --dry-run hoặc --apply');
  if (options.replaceExisting && !options.apply) throw new Error('--replace-existing yêu cầu --apply');
  return options;
}

export function planBootstrapSettings(
  values: Record<string, Record<string, unknown>>,
  existing: Map<string, { value: unknown; version: number }>,
  replaceExisting: boolean,
  only?: string[],
): SettingPlan[] {
  return Object.entries(values).map(([key, value]) => {
    const definition = SETTINGS_BY_KEY.get(key);
    if (!definition?.isPublic) throw new Error(`Key không thuộc registry public: ${key}`);
    const current = existing.get(key);
    const after = mergeWithDefault(definition.defaultValue, value);
    const same = current && isDeepStrictEqual(current.value, after);
    const selected = !only || only.some((prefix) => key.startsWith(prefix));
    return {
      key,
      action: !selected ? 'skip' : current ? (replaceExisting && !same ? 'replace' : 'skip') : 'create',
      differs: !!current && !same,
      before: current?.value ?? null,
      after,
      version: current?.version ?? null,
    };
  });
}

function printCount(key: string, count: number): void { console.log(`${key}=${count}`); }

async function owner(prisma: PrismaService, email?: string): Promise<{ id: string; email: string }> {
  const requested = email ?? process.env.DVB_BOOTSTRAP_ACTOR_EMAIL?.trim().toLowerCase();
  const candidates = await prisma.user.findMany({
    where: { disabledAt: null, roles: { some: { role: { code: ROLES.owner } } }, ...(requested ? { email: requested } : {}) },
    select: { id: true, email: true },
    take: 2,
  });
  if (candidates.length !== 1) throw new Error(requested
    ? `Không tìm thấy đúng một tài khoản Owner đang hoạt động: ${requested}`
    : 'Cần đúng một Owner đang hoạt động; chỉ định --actor-email hoặc DVB_BOOTSTRAP_ACTOR_EMAIL.');
  return candidates[0];
}

async function mediaPlan(prisma: PrismaService, settings: SettingsService): Promise<MediaPlan[]> {
  const config = loadConfig();
  const rules = await settings.get<MediaProcessingSettings>('media.processing');
  if (!rules.convertToWebp || !rules.deleteOriginal || !rules.allowedMimeTypes.includes('image/webp')) {
    throw new Error('Media processing phải cho phép WebP, chuyển đổi và bỏ định dạng gốc.');
  }
  const sourceRoot = process.env.DVB_BOOTSTRAP_ASSETS_DIR
    ? resolve(process.env.DVB_BOOTSTRAP_ASSETS_DIR)
    : resolve(process.cwd(), '..', 'public', 'images', 'dinh-van-booking');
  const result: MediaPlan[] = [];
  for (const source of PUBLIC_BOOTSTRAP_MEDIA) {
    const fullPath = resolve(sourceRoot, source.source);
    if (!fullPath.startsWith(`${sourceRoot}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error(`Đường dẫn ảnh không hợp lệ: ${source.source}`);
    const buffer = await readFile(fullPath);
    if (buffer.byteLength > Math.min(rules.maxBytes, config.mediaMaxBytes)) throw new Error(`Ảnh vượt kích thước: ${source.source}`);
    const probe = await sharp(buffer).metadata();
    if (probe.format !== 'webp' || !probe.width || !probe.height) throw new Error(`Ảnh nguồn không phải WebP hợp lệ: ${source.source}`);
    const encoded = await encodeMediaWebp(buffer, rules, rules.maxWidth, false);
    const sha = createHash('sha256').update(encoded.data).digest('hex');
    const matches = await prisma.mediaAsset.findMany({ where: { sha256: sha }, take: 2 });
    if (matches.length > 1) throw new Error(`Media SHA bị trùng nhiều bản ghi: ${source.source}`);
    const existing = matches[0] ?? null;
    if (existing) {
      if (existing.isDemo || existing.visibility !== 'public' || existing.processingStatus !== 'ready' || existing.mimeType !== 'image/webp') {
        throw new Error(`Media trùng SHA không đủ điều kiện public: ${source.source}`);
      }
      await access(join(config.mediaRoot, existing.storageKey));
    }
    result.push({ key: source.key, source: source.source, filename: basename(source.source), buffer, alt: source.alt, caption: source.caption, sha, existing });
  }
  return result;
}

async function run(): Promise<void> {
  const options = parseBootstrapArgs(process.argv.slice(2));
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const actor = await owner(prisma, options.actorEmail);
    const settings = new SettingsService(prisma);
    const mediaService = new MediaService(prisma, settings);
    const media = await mediaPlan(prisma, settings);
    const existingIds = Object.fromEntries(media.map((item) => [item.key, item.existing?.id ?? `planned:${item.key}`])) as Record<BootstrapMediaKey, string>;
    const previewValues = publicBootstrapSettings(existingIds);
    const existingRows = await prisma.setting.findMany({ where: { key: { in: Object.keys(previewValues) } }, select: { key: true, value: true, version: true } });
    const existing = new Map(existingRows.map((row) => [row.key, { value: row.value, version: row.version }]));
    const plan = planBootstrapSettings(previewValues, existing, options.replaceExisting, options.only);
    const navigation = await prisma.navigationMenu.findUnique({ where: { key: 'primary' }, select: { id: true } });

    console.log('DVB_PUBLIC_BOOTSTRAP_PREVIEW');
    console.log(`MODE=${options.apply ? 'APPLY' : 'DRY_RUN'}`);
    console.log(`ACTOR=${actor.email}`);
    printCount('BRAND_SETTINGS', plan.filter((item) => item.key.startsWith('brand.')).length);
    printCount('HOME_SETTINGS', plan.filter((item) => item.key.startsWith('home.')).length);
    printCount('PAGE_SETTINGS', plan.filter((item) => item.key.startsWith('catalog.') || item.key === 'contact.page' || item.key === 'about.page').length);
    printCount('SEO_SETTINGS', plan.filter((item) => item.key.startsWith('seo.')).length);
    printCount('SETTING_CREATE', plan.filter((item) => item.action === 'create').length);
    printCount('SETTING_SKIP_EXISTING', plan.filter((item) => item.action === 'skip').length);
    printCount('SETTING_REPLACE_CANDIDATE', plan.filter((item) => item.action === 'replace').length);
    printCount('MEDIA_IMPORT', media.filter((item) => !item.existing).length);
    printCount('MEDIA_REUSE', media.filter((item) => item.existing).length);
    printCount('NAV_CREATE', navigation ? 0 : 1);
    printCount('NAV_SKIP', navigation ? 1 : 0);
    printCount('SKIP_EXISTING', plan.filter((item) => item.action === 'skip').length + Number(!!navigation));
    printCount('REPLACE_REQUIRED', plan.filter((item) => item.action === 'skip' && item.differs).length);
    console.log(`NAVIGATION=${navigation ? 'SKIP_EXISTING' : 'CREATE'}`);
    if (options.only) console.log(`ONLY=${options.only.join(',')}`);
    for (const item of plan) console.log(`SETTING_${item.action.toUpperCase()} ${item.key}${item.differs ? ' DIFFERS' : ''}`);
    for (const item of media) console.log(`MEDIA_${item.existing ? 'REUSE' : 'IMPORT'} ${item.source} sha256=${item.sha}`);
    for (const item of plan.filter((entry) => entry.action === 'replace')) {
      console.log(`REPLACE ${item.key} BEFORE=${JSON.stringify(item.before)} AFTER=${JSON.stringify(item.after)}`);
    }
    if (!options.apply) return;

    // Ingest through the normal Media Library pipeline. A DB conflict below may
    // leave reusable media, never partial settings or a duplicate menu.
    const mediaIds = {} as Record<BootstrapMediaKey, string>;
    for (const item of media) {
      const asset = item.existing ?? await mediaService.ingest(
        { buffer: item.buffer, filename: item.filename, mimetype: 'image/webp' },
        { altText: item.alt, caption: item.caption }, actor.id,
      );
      mediaIds[item.key] = asset.id;
    }
    const actualValues = publicBootstrapSettings(mediaIds);
    const finalPlan = planBootstrapSettings(actualValues, existing, options.replaceExisting, options.only);
    await prisma.$transaction(async (tx) => {
      for (const item of finalPlan) {
        const current = await tx.setting.findUnique({ where: { key: item.key } });
        if ((current?.version ?? null) !== item.version) throw new Error(`Setting thay đổi trong lúc import: ${item.key}`);
        if (item.action === 'skip') continue;
        const definition = SETTINGS_BY_KEY.get(item.key)!;
        if (item.action === 'create') {
          await tx.setting.create({ data: {
            key: item.key, value: item.after as Prisma.InputJsonValue, version: 1,
            schemaVersion: definition.schemaVersion, isPublic: true, updatedById: actor.id,
          } });
        } else {
          const updated = await tx.setting.updateMany({ where: { key: item.key, version: item.version! }, data: {
            value: item.after as Prisma.InputJsonValue, version: { increment: 1 },
            schemaVersion: definition.schemaVersion, isPublic: true, updatedById: actor.id,
          } });
          if (updated.count !== 1) throw new Error(`Version conflict: ${item.key}`);
        }
        await tx.auditLog.create({ data: {
          actorId: actor.id, action: item.action === 'create' ? 'public-bootstrap.create' : 'public-bootstrap.replace',
          entityType: 'setting', diff: { key: item.key, from: item.before, to: item.after } as Prisma.InputJsonValue,
        } });
      }
      const liveMenu = await tx.navigationMenu.findUnique({ where: { key: 'primary' }, select: { id: true } });
      if ((liveMenu?.id ?? null) !== (navigation?.id ?? null)) throw new Error('Menu chính thay đổi trong lúc import.');
      if (!liveMenu) {
        const menu = await tx.navigationMenu.create({ data: { key: 'primary', name: 'Menu chính' } });
        for (const [position, item] of PUBLIC_BOOTSTRAP_MENU.entries()) {
          await tx.navigationItem.create({ data: { menuId: menu.id, label: item.label, externalUrl: item.externalUrl, position, enabled: true } });
        }
        await tx.auditLog.create({ data: { actorId: actor.id, action: 'public-bootstrap.create', entityType: 'navigation_menu', entityId: menu.id,
          diff: { key: 'primary', items: PUBLIC_BOOTSTRAP_MENU } as Prisma.InputJsonValue } });
      }
      for (const item of media) {
        if (!item.existing || (item.existing.altText && item.existing.caption)) continue;
        const update = { ...(item.existing.altText ? {} : { altText: item.alt }), ...(item.existing.caption ? {} : { caption: item.caption }) };
        await tx.mediaAsset.update({ where: { id: item.existing.id }, data: update });
        await tx.auditLog.create({ data: { actorId: actor.id, action: 'public-bootstrap.media-meta', entityType: 'media_asset', entityId: item.existing.id,
          diff: { filled: Object.keys(update) } as Prisma.InputJsonValue } });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
    printCount('SETTING_CREATED', finalPlan.filter((item) => item.action === 'create').length);
    printCount('SETTING_REPLACED', finalPlan.filter((item) => item.action === 'replace').length);
    printCount('MEDIA_IMPORTED', media.filter((item) => !item.existing).length);
    printCount('NAV_CREATED', navigation ? 0 : 1);
    console.log('DVB_PUBLIC_BOOTSTRAP_APPLY=PASS');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
