import 'reflect-metadata';
import { isDeepStrictEqual } from 'node:util';
import { ROLES } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { paragraphDoc, publicBootstrapSettings, type BootstrapMediaKey } from './data/public-bootstrap';

type StoredSetting = { key: string; value: unknown; version: number };
type CopyChange = { key: string; field: string; previous: unknown };
type PlannedSetting = {
  key: string;
  version: number;
  value: Record<string, unknown>;
  updatedFields: string[];
  preservedFields: string[];
};

const previousCopy: readonly CopyChange[] = [
  { key: 'catalog.staysPage', field: 'emptyResultTitle', previous: 'Chưa có nơi lưu trú được xuất bản' },
  { key: 'catalog.destinationsPage', field: 'listSubtitle', previous: paragraphDoc('Thông tin điểm đến sẽ hiển thị khi được quản trị viên xuất bản.') },
  { key: 'catalog.destinationsPage', field: 'emptyTitle', previous: 'Chưa có điểm đến được xuất bản' },
  { key: 'catalog.combosPage', field: 'listSubtitle', previous: paragraphDoc('Các lựa chọn sẽ xuất hiện khi được quản trị viên xuất bản.') },
  { key: 'catalog.combosPage', field: 'emptyTitle', previous: 'Chưa có combo được xuất bản' },
  { key: 'catalog.staticPages', field: 'description', previous: paragraphDoc('Thông tin chính sách và hướng dẫn sẽ xuất hiện khi được quản trị viên xuất bản.') },
  { key: 'catalog.articlesPage', field: 'description', previous: paragraphDoc('Bài viết và kinh nghiệm khám phá sẽ xuất hiện khi được quản trị viên xuất bản.') },
];

const noMedia: Record<BootstrapMediaKey, null> = {
  hero: null,
  promo: null,
  staysHero: null,
  destinationsHero: null,
  combosHero: null,
  bookingHero: null,
  partner: null,
};

/** Only exact old bootstrap fields are eligible; every other Admin edit survives. */
export function planPublicCatalogCopyRefresh(rows: StoredSetting[]): PlannedSetting[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const nextBootstrap = publicBootstrapSettings(noMedia);
  return [...new Set(previousCopy.map((change) => change.key))].flatMap((key) => {
    const row = byKey.get(key);
    if (!row || !row.value || typeof row.value !== 'object' || Array.isArray(row.value)) return [];
    const value = structuredClone(row.value) as Record<string, unknown>;
    const updatedFields: string[] = [];
    const preservedFields: string[] = [];
    for (const change of previousCopy.filter((item) => item.key === key)) {
      const next = nextBootstrap[key]?.[change.field];
      if (next === undefined) throw new Error(`Thiếu bootstrap copy: ${key}.${change.field}`);
      if (isDeepStrictEqual(value[change.field], change.previous)) {
        value[change.field] = next;
        updatedFields.push(change.field);
      } else if (!isDeepStrictEqual(value[change.field], next)) {
        preservedFields.push(change.field);
      }
    }
    return [{ key, version: row.version, value, updatedFields, preservedFields }];
  });
}

function options(args: string[]): { apply: boolean; actorEmail: string | null } {
  let apply = false;
  let actorEmail: string | null = null;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error(`Tham số lặp: ${arg}`);
    seen.add(arg);
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg === '--actor-email') {
      actorEmail = args[++index]?.trim().toLowerCase() ?? null;
      if (!actorEmail || actorEmail.startsWith('--')) throw new Error('Thiếu email cho --actor-email');
    } else throw new Error(`Tham số không hợp lệ: ${arg}`);
  }
  if (seen.has('--apply') && seen.has('--dry-run')) throw new Error('Chỉ chọn --dry-run hoặc --apply');
  if (apply && !actorEmail) throw new Error('--apply yêu cầu --actor-email để ghi audit đúng Owner');
  return { apply, actorEmail };
}

async function run(): Promise<void> {
  const { apply, actorEmail } = options(process.argv.slice(2));
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [...new Set(previousCopy.map((item) => item.key))] } },
      select: { key: true, value: true, version: true },
    });
    const plan = planPublicCatalogCopyRefresh(rows);
    console.log('DVB_PUBLIC_CATALOG_COPY_REFRESH');
    console.log(`MODE=${apply ? 'APPLY' : 'DRY_RUN'}`);
    for (const item of plan) {
      console.log(`${item.key}: update=[${item.updatedFields.join(',')}] preserve=[${item.preservedFields.join(',')}] version=${item.version}`);
    }
    console.log(`FIELDS_TO_UPDATE=${plan.reduce((sum, item) => sum + item.updatedFields.length, 0)}`);
    if (!apply) return;

    const actors = await prisma.user.findMany({
      where: { email: actorEmail!, disabledAt: null, roles: { some: { role: { code: ROLES.owner } } } },
      select: { id: true }, take: 2,
    });
    if (actors.length !== 1) throw new Error('Không tìm thấy đúng một Owner đang hoạt động cho --actor-email');
    const settings = new SettingsService(prisma);
    for (const item of plan.filter((entry) => entry.updatedFields.length > 0)) {
      await settings.update(item.key, item.value, item.version, actors[0].id);
      console.log(`UPDATED ${item.key} ${item.updatedFields.join(',')}`);
    }
    console.log('DVB_PUBLIC_CATALOG_COPY_REFRESH=PASS');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
