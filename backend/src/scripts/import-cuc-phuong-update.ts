import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client';
import { buildDatabaseUrl } from '../common/config/env';
import { ROOM_AMENITIES } from '../catalog/room-amenities';
import {
  CUC_PHUONG_NEW_STAYS,
  CUC_PHUONG_SUPPLEMENTS,
  CUC_PHUONG_UPDATE_CHECKED_AT,
  CUC_PHUONG_UPDATE_VERSION,
  type PropertySupplement,
  type UpdateStay,
  validateCucPhuongUpdate,
} from './data/cuc-phuong-update-2026-10-08';

type ImportMode = 'dry-run' | 'apply';
type Tx = Prisma.TransactionClient;

type PlanItem = {
  target: string;
  action: 'create' | 'skipped' | 'conflict' | 'add-room' | 'update-copy';
  reason?: string;
};

function parseMode(): ImportMode {
  const args = process.argv.slice(2);
  const modes = args.filter((arg) => arg === '--dry-run' || arg === '--apply');
  if (args.some((arg) => arg !== '--dry-run' && arg !== '--apply') || modes.length !== 1) {
    throw new Error('Cú pháp: npm run import:business:cuc-phuong:update -- --dry-run|--apply');
  }
  return modes[0] === '--apply' ? 'apply' : 'dry-run';
}

function paragraphDocument(text: string): object {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Plans against the live rows; every decision is re-checked inside the apply transaction. */
async function buildPlan(db: PrismaClient | Tx): Promise<PlanItem[]> {
  const plan: PlanItem[] = [];
  const stays = await db.contentNode.findMany({ where: { kind: 'stay' }, select: { title: true } });
  const titles = new Set(stays.map((node) => normalized(node.title)));

  for (const item of CUC_PHUONG_NEW_STAYS) {
    const existing = await db.property.findUnique({ where: { code: item.code }, select: { id: true } });
    if (existing) plan.push({ target: item.code, action: 'skipped', reason: 'Mã đã tồn tại' });
    else if ([item.title, ...item.aliases].some((name) => titles.has(normalized(name)))) {
      plan.push({ target: item.code, action: 'conflict', reason: 'Đã có nơi lưu trú cùng tên hoặc tên khác; cần đối chiếu thủ công' });
    } else plan.push({ target: item.code, action: 'create' });
  }

  for (const supplement of CUC_PHUONG_SUPPLEMENTS) {
    const property = await db.property.findUnique({
      where: { code: supplement.propertyCode },
      select: {
        content: { select: { bodyDocument: true, publicationStatus: true } },
        roomTypes: { select: { code: true, name: true } },
      },
    });
    if (!property) {
      plan.push({ target: supplement.propertyCode, action: 'skipped', reason: 'Chưa có nơi lưu trú; chạy import v1 trước' });
      continue;
    }
    if (property.content.publicationStatus !== 'draft') {
      plan.push({ target: supplement.propertyCode, action: 'skipped', reason: 'Không bổ sung nơi lưu trú đã xuất bản' });
      continue;
    }
    if (supplement.copy) {
      const current = documentText(property.content.bodyDocument);
      plan.push(
        current === supplement.copy.expectedCurrentDescription
          ? { target: `${supplement.propertyCode}:copy`, action: 'update-copy' }
          : { target: `${supplement.propertyCode}:copy`, action: 'skipped', reason: 'Mô tả đã được chỉnh sau import v1; giữ nguyên' },
      );
    }
    const codes = new Set(property.roomTypes.map((room) => room.code));
    const names = new Set(property.roomTypes.map((room) => normalized(room.name)));
    for (const room of supplement.rooms) {
      const target = `${supplement.propertyCode}/${room.code}`;
      if (codes.has(room.code)) plan.push({ target, action: 'skipped', reason: 'Mã hạng phòng đã tồn tại' });
      else if (names.has(normalized(room.name))) plan.push({ target, action: 'conflict', reason: 'Trùng tên hạng phòng với mã khác' });
      else plan.push({ target, action: 'add-room' });
    }
  }
  return plan;
}

function documentText(document: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const value = node as { text?: unknown; content?: unknown };
    if (typeof value.text === 'string') parts.push(value.text);
    if (Array.isArray(value.content)) value.content.forEach(walk);
  };
  walk(document);
  return parts.join('').trim();
}

async function createStay(tx: Tx, item: UpdateStay): Promise<void> {
  const body = paragraphDocument(item.description);
  // No slug: under the slug lifecycle a stay URL is created only by Generate in Admin.
  const node = await tx.contentNode.create({
    data: {
      kind: 'stay',
      title: item.title,
      excerpt: item.excerpt,
      bodyDocument: body,
      publicationStatus: 'draft',
      metaTitle: item.title,
      metaDescription: item.excerpt,
      noindex: true,
      featured: false,
      isDemo: false,
    },
  });
  await tx.contentRevision.create({
    data: { contentId: node.id, documentSnapshot: body, note: `Nhập dữ liệu Cúc Phương ${CUC_PHUONG_UPDATE_VERSION}; chờ xác minh`, authorId: null },
  });
  const supplier = await tx.supplier.create({
    data: {
      name: item.supplier?.name ?? item.title,
      contactPhone: item.supplier?.contactPhone ?? null,
      note: item.supplier?.note ?? 'Nhà cung cấp tạm từ manifest Cúc Phương; cần xác minh trước khi vận hành.',
    },
    select: { id: true },
  });
  const property = await tx.property.create({
    data: {
      contentId: node.id,
      supplierId: supplier.id,
      code: item.code,
      kind: item.kind,
      area: item.area,
      address: item.address,
      inventoryMode: 'allotment',
      operatingStatus: 'pending_verification',
      approvedPolicies: {},
    },
    select: { id: true },
  });
  await tx.auditLog.create({
    data: {
      actorId: null,
      action: 'business_import.cuc_phuong',
      entityType: 'property',
      entityId: property.id,
      diff: { importVersion: CUC_PHUONG_UPDATE_VERSION, checkedAt: CUC_PHUONG_UPDATE_CHECKED_AT, confidence: item.confidence, aliases: item.aliases, sources: item.sources } as object,
    },
  });
}

async function applySupplement(tx: Tx, supplement: PropertySupplement, plan: PlanItem[]): Promise<void> {
  const property = await tx.property.findUniqueOrThrow({
    where: { code: supplement.propertyCode },
    select: { id: true, contentId: true, roomTypes: { select: { id: true } } },
  });
  const added: string[] = [];
  let position = property.roomTypes.length;

  if (supplement.copy && plan.some((item) => item.target === `${supplement.propertyCode}:copy` && item.action === 'update-copy')) {
    const body = paragraphDocument(supplement.copy.description);
    await tx.contentNode.update({
      where: { id: property.contentId },
      data: { bodyDocument: body, excerpt: supplement.copy.excerpt, metaDescription: supplement.copy.metaDescription, version: { increment: 1 } },
    });
    await tx.property.update({ where: { id: property.id }, data: { version: { increment: 1 } } });
    await tx.contentRevision.create({
      data: { contentId: property.contentId, documentSnapshot: body, note: `Bổ sung mô tả Cúc Phương ${CUC_PHUONG_UPDATE_VERSION}`, authorId: null },
    });
  }

  for (const room of supplement.rooms) {
    if (!plan.some((item) => item.target === `${supplement.propertyCode}/${room.code}` && item.action === 'add-room')) continue;
    // Category names and unit kinds are source-backed; capacity is not. The
    // required numeric sentinel is hidden in Admin until explicit verification.
    const created = await tx.roomType.create({
      data: {
        propertyId: property.id,
        code: room.code,
        name: room.name,
        description: room.description,
        unitKind: room.unitKind,
        bedSummary: room.bedSummary ?? null,
        maxAdults: 1,
        maxChildren: 0,
        maxOccupancy: 1,
        capacityVerified: false,
        status: 'inactive',
        position: position++,
      },
      select: { id: true },
    });
    for (const code of new Set(room.amenityCodes ?? [])) {
      const index = ROOM_AMENITIES.findIndex((item) => item.code === code);
      const selected = ROOM_AMENITIES[index];
      const amenity = await tx.amenity.upsert({
        where: { code },
        create: { code, label: selected.label, iconKey: 'check', scope: 'room', position: index },
        update: {},
      });
      await tx.roomTypeAmenity.create({ data: { roomTypeId: created.id, amenityId: amenity.id } });
    }
    added.push(room.code);
  }
  if (added.length) {
    await tx.contentNode.update({ where: { id: property.contentId }, data: { version: { increment: 1 } } });
  }

  await tx.auditLog.create({
    data: {
      actorId: null,
      action: 'business_import.cuc_phuong_update',
      entityType: 'property',
      entityId: property.id,
      diff: { importVersion: CUC_PHUONG_UPDATE_VERSION, roomTypesAdded: added, sources: supplement.sources } as object,
    },
  });
}

async function main(): Promise<void> {
  const mode = parseMode();
  const problems = validateCucPhuongUpdate();
  if (problems.length) throw new Error(problems.join('\n'));

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: buildDatabaseUrl() }) });
  let jobRunId: string | null = null;
  try {
    const summarize = (plan: PlanItem[]) => {
      const count = (action: PlanItem['action']) => plan.filter((item) => item.action === action).length;
      return {
        mode,
        version: CUC_PHUONG_UPDATE_VERSION,
        checkedAt: CUC_PHUONG_UPDATE_CHECKED_AT,
        staysCreated: count('create'),
        roomTypesAdded: count('add-room'),
        copyUpdated: count('update-copy'),
        skipped: count('skipped'),
        conflicts: count('conflict'),
        items: plan,
      };
    };
    let plan = await buildPlan(prisma);
    if (mode === 'dry-run') {
      console.log(JSON.stringify(summarize(plan), null, 2));
      return;
    }

    const jobRun = await prisma.jobRun.create({
      data: { jobKind: 'business_import:cuc_phuong_update', status: 'running', detail: JSON.stringify({ version: CUC_PHUONG_UPDATE_VERSION }) },
      select: { id: true },
    });
    jobRunId = jobRun.id;

    await prisma.$transaction(
      async (tx) => {
        // Re-plan inside the transaction so a concurrent Admin edit is never overwritten.
        const live = await buildPlan(tx);
        plan = live;
        for (const item of CUC_PHUONG_NEW_STAYS) {
          if (live.find((entry) => entry.target === item.code)?.action === 'create') await createStay(tx, item);
        }
        for (const supplement of CUC_PHUONG_SUPPLEMENTS) {
          if (live.some((entry) => entry.target.startsWith(supplement.propertyCode) && (entry.action === 'add-room' || entry.action === 'update-copy'))) {
            await applySupplement(tx, supplement, live);
          }
        }
      },
      { isolationLevel: 'Serializable' },
    );

    const summary = summarize(plan);
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: { status: 'completed', processed: plan.length, errors: summary.conflicts, finishedAt: new Date(), detail: JSON.stringify(summary) },
    });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (jobRunId) {
      await prisma.jobRun.update({
        where: { id: jobRunId },
        data: { status: 'failed', errors: 1, finishedAt: new Date(), detail: error instanceof Error ? error.message : String(error) },
      });
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
