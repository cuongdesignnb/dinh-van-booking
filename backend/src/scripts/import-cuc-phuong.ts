import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { buildDatabaseUrl } from '../common/config/env';
import { pathForContent } from '../content/slug';
import {
  CUC_PHUONG_AREA,
  CUC_PHUONG_CHECKED_AT,
  CUC_PHUONG_IMPORT_VERSION,
  CUC_PHUONG_PENDING_VERIFICATION,
  CUC_PHUONG_STAYS,
  type ImportedStay,
  validateCucPhuongManifest,
} from './data/cuc-phuong-stays';

type ImportMode = 'dry-run' | 'apply';

type ExistingRecord = {
  code: string;
  contentId: string;
  slug: string | null;
};

type PlanItem = {
  code: string;
  title: string;
  action: 'create' | 'skipped' | 'conflict';
  reason?: string;
};

type ImportSummary = {
  mode: ImportMode;
  version: string;
  checkedAt: string;
  area: string;
  total: number;
  created: number;
  skipped: number;
  conflicts: number;
  pendingVerification: readonly string[];
  items: PlanItem[];
};

function parseMode(): ImportMode {
  const args = process.argv.slice(2);
  const modes = args.filter((arg): arg is `--${ImportMode}` => arg === '--dry-run' || arg === '--apply');
  if (args.some((arg) => arg !== '--dry-run' && arg !== '--apply') || modes.length !== 1) {
    throw new Error('Cú pháp: npm run import:business:cuc-phuong -- --dry-run|--apply');
  }
  return modes[0] === '--apply' ? 'apply' : 'dry-run';
}

function paragraphDocument(text: string): object {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

function sourceSnapshot(item: ImportedStay): object {
  return {
    importVersion: CUC_PHUONG_IMPORT_VERSION,
    checkedAt: CUC_PHUONG_CHECKED_AT,
    confidence: item.confidence,
    aliases: item.aliases,
    sources: item.sources,
    roomTypes: item.roomTypes?.map((room) => ({ code: room.code, sourceBacked: true, status: room.status })) ?? [],
  };
}

async function readExisting(prisma: PrismaClient): Promise<{
  byCode: Map<string, ExistingRecord>;
  bySlug: Map<string, string>;
  byPath: Map<string, string>;
}> {
  const codes = CUC_PHUONG_STAYS.map((item) => item.code);
  const slugs = CUC_PHUONG_STAYS.map((item) => item.slug);
  const paths = CUC_PHUONG_STAYS.map((item) => pathForContent('stay', item.slug));
  const [properties, content, routes] = await Promise.all([
    prisma.property.findMany({
      where: { code: { in: codes } },
      select: { code: true, contentId: true, content: { select: { slugSource: true } } },
    }),
    prisma.contentNode.findMany({
      where: { kind: 'stay', slugSource: { in: slugs } },
      select: { id: true, slugSource: true },
    }),
    prisma.publicRoute.findMany({ where: { path: { in: paths } }, select: { path: true, contentId: true } }),
  ]);

  return {
    byCode: new Map(
      properties.map((property) => [
        property.code,
        { code: property.code, contentId: property.contentId, slug: property.content.slugSource },
      ]),
    ),
    bySlug: new Map(content.filter((node) => node.slugSource).map((node) => [node.slugSource!, node.id])),
    byPath: new Map(routes.map((route) => [route.path, route.contentId])),
  };
}

function buildPlan(existing: Awaited<ReturnType<typeof readExisting>>): PlanItem[] {
  return CUC_PHUONG_STAYS.map((item) => {
    const path = pathForContent('stay', item.slug);
    const property = existing.byCode.get(item.code);
    const slugOwner = existing.bySlug.get(item.slug);
    const pathOwner = existing.byPath.get(path);

    if (property) {
      const sameImport = property.slug === item.slug && (!slugOwner || slugOwner === property.contentId);
      return sameImport
        ? { code: item.code, title: item.title, action: 'skipped', reason: 'Mã ổn định đã tồn tại' }
        : {
            code: item.code,
            title: item.title,
            action: 'conflict',
            reason: `Mã đã thuộc content ${property.contentId} với slug khác`,
          };
    }
    if (slugOwner) {
      return { code: item.code, title: item.title, action: 'conflict', reason: `Slug đã thuộc content ${slugOwner}` };
    }
    if (pathOwner) {
      return { code: item.code, title: item.title, action: 'conflict', reason: `Route đã thuộc content ${pathOwner}` };
    }
    return { code: item.code, title: item.title, action: 'create' };
  });
}

async function createStay(tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0], item: ImportedStay): Promise<void> {
  const body = paragraphDocument(item.description);
  const node = await tx.contentNode.create({
    data: {
      kind: 'stay',
      title: item.title,
      slugSource: item.slug,
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

  await tx.publicRoute.create({ data: { contentId: node.id, path: pathForContent('stay', item.slug), isCurrent: true } });
  await tx.contentRevision.create({
    data: {
      contentId: node.id,
      documentSnapshot: body,
      note: `Nhập dữ liệu Cúc Phương ${CUC_PHUONG_IMPORT_VERSION}; chờ xác minh`,
      authorId: null,
    },
  });

  const supplierInput = item.supplier ?? {
    name: item.title,
    note: 'Nhà cung cấp tạm theo tên cơ sở trong manifest Cúc Phương; cần xác minh chủ cơ sở trước khi vận hành.',
  };
  const supplier = await tx.supplier.create({
    data: {
      name: supplierInput.name,
      contactPhone: supplierInput.contactPhone ?? null,
      note: supplierInput.note ?? 'Nhà cung cấp được tạo từ manifest Cúc Phương; cần xác minh trước khi vận hành.',
    },
    select: { id: true },
  });

  const property = await tx.property.create({
    data: {
      contentId: node.id,
      supplierId: supplier.id,
      code: item.code,
      kind: item.kind,
      area: item.area || CUC_PHUONG_AREA,
      address: item.address,
      inventoryMode: 'allotment',
      operatingStatus: 'pending_verification',
      approvedPolicies: {},
    },
    select: { id: true },
  });

  // Imported category names are source-backed, but capacity is not. The
  // required numeric sentinel is hidden in Admin until explicit verification.
  if (item.roomTypes?.length) {
    for (const [position, room] of item.roomTypes.entries()) {
      await tx.roomType.create({
        data: {
          propertyId: property.id,
          code: room.code,
          name: room.name,
          description: room.description,
          maxAdults: room.maxAdults,
          maxChildren: room.maxChildren,
          maxOccupancy: room.maxOccupancy,
          capacityVerified: false,
          areaSqm: room.areaSqm,
          status: 'inactive',
          position,
        },
      });
    }
  }

  await tx.auditLog.create({
    data: {
      actorId: null,
      action: 'business_import.cuc_phuong',
      entityType: 'property',
      entityId: property.id,
      diff: sourceSnapshot(item),
    },
  });
}

async function main(): Promise<void> {
  const mode = parseMode();
  const manifestProblems = validateCucPhuongManifest();
  if (manifestProblems.length) throw new Error(manifestProblems.join('\n'));

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: buildDatabaseUrl() }) });
  let jobRunId: string | null = null;
  try {
    const existing = await readExisting(prisma);
    const plan = buildPlan(existing);
    const summary: ImportSummary = {
      mode,
      version: CUC_PHUONG_IMPORT_VERSION,
      checkedAt: CUC_PHUONG_CHECKED_AT,
      area: CUC_PHUONG_AREA,
      total: CUC_PHUONG_STAYS.length,
      created: 0,
      skipped: plan.filter((item) => item.action === 'skipped').length,
      conflicts: plan.filter((item) => item.action === 'conflict').length,
      pendingVerification: CUC_PHUONG_PENDING_VERIFICATION,
      items: plan,
    };

    if (mode === 'dry-run') {
      summary.created = plan.filter((item) => item.action === 'create').length;
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const jobRun = await prisma.jobRun.create({
      data: {
        jobKind: 'business_import:cuc_phuong',
        status: 'running',
        detail: JSON.stringify({ version: CUC_PHUONG_IMPORT_VERSION, checkedAt: CUC_PHUONG_CHECKED_AT }),
      },
      select: { id: true },
    });
    jobRunId = jobRun.id;

    const toCreate = CUC_PHUONG_STAYS.filter((item) => plan.find((entry) => entry.code === item.code)?.action === 'create');
    await prisma.$transaction(async (tx) => {
      for (const item of toCreate) await createStay(tx, item);
    });
    summary.created = toCreate.length;

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'completed',
        processed: CUC_PHUONG_STAYS.length,
        errors: summary.conflicts,
        finishedAt: new Date(),
        detail: JSON.stringify(summary),
      },
    });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    if (jobRunId) {
      await prisma.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: 'failed',
          errors: 1,
          finishedAt: new Date(),
          detail: error instanceof Error ? error.message : String(error),
        },
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
