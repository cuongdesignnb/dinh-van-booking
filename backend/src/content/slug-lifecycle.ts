import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { isReservedSlug, isValidSlug, MAX_SLUG_LENGTH, normalizeSlug, pathForContent } from './slug';
import { switchCurrentRoute } from './slug-routes';

/**
 * Explicit slug lifecycle. A slug is a URL asset that is independent of the
 * title: generic create/update never derives or changes it. Only the Admin
 * "Generate" action (preview → apply) creates or moves a public path, and a
 * moved path keeps its old route as a one-hop 308 redirect to the current one.
 */

type Db = Pick<Prisma.TransactionClient, 'contentNode' | 'publicRoute' | 'auditLog'>;

export interface SlugPreview {
  source: string;
  slug: string;
  path: string;
  currentSlug: string | null;
  currentPath: string | null;
  /** The candidate equals the current slug: Generate would change nothing. */
  unchanged: boolean;
  /** The candidate can be applied as-is. */
  available: boolean;
  reserved: boolean;
  /** Another content item owns the path, now or in its redirect history. */
  conflict: boolean;
  /** The path is an old URL of this same item and would become current again. */
  reactivatesHistory: boolean;
  /** Next free `-N` variant when the candidate is taken (never applied silently). */
  suggestion: string | null;
  suggestionPath: string | null;
  isPublished: boolean;
  /** Published item with an existing URL: the Admin must confirm the change. */
  requiresConfirmation: boolean;
}

export interface GenerateSlugResult {
  slug: string;
  path: string;
  previousPath: string | null;
  redirectCreated: boolean;
  version: number;
  unchanged: boolean;
}

export interface RouteHistoryEntry {
  path: string;
  isCurrent: boolean;
  redirectStatus: number | null;
  createdAt: string;
  /** When this path stopped being current (from the slug audit log). */
  replacedAt: string | null;
  actor: string | null;
}

function slugInPath(kind: string, path: string): string | null {
  const prefix = pathForContent(kind, '');
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length);
  return rest && !rest.includes('/') ? rest : null;
}

/**
 * Every slug in the section that is owned by some content item: current slugs
 * and every historical route. Old paths keep pointing at their content, so a
 * new item can never take over a redirect.
 */
export async function slugOwners(db: Db, kind: string): Promise<Map<string, string>> {
  const prefix = pathForContent(kind, '');
  const [routes, nodes] = await Promise.all([
    db.publicRoute.findMany({ where: { path: { startsWith: prefix } }, select: { path: true, contentId: true } }),
    db.contentNode.findMany({ where: { kind, slugSource: { not: null } }, select: { id: true, slugSource: true } }),
  ]);
  const owners = new Map<string, string>();
  for (const node of nodes) if (node.slugSource) owners.set(node.slugSource, node.id);
  for (const route of routes) {
    const slug = slugInPath(kind, route.path);
    if (slug) owners.set(slug, route.contentId);
  }
  return owners;
}

function nextFreeSlug(base: string, owners: Map<string, string>, selfId: string | null): string | null {
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - tail.length).replace(/-+$/g, '')}${tail}`;
    const owner = owners.get(candidate);
    if ((!owner || owner === selfId) && !isReservedSlug(candidate)) return candidate;
  }
  return null;
}

function candidateFrom(source: unknown): string {
  if (typeof source !== 'string' || !source.trim()) {
    throw new BadRequestException({ code: 'slug_source_required', message: 'Nhập tiêu đề hoặc cụm từ để tạo đường dẫn.' });
  }
  const slug = normalizeSlug(source);
  if (!slug) {
    throw new BadRequestException({ code: 'slug_invalid', message: 'Không tạo được đường dẫn từ cụm từ này. Hãy dùng chữ hoặc số.' });
  }
  return slug;
}

function reservedError(slug: string) {
  return new BadRequestException({
    code: 'slug_reserved',
    message: `"${slug}" là đường dẫn hệ thống được bảo vệ. Hãy dùng cụm từ khác.`,
  });
}

function conflictError(slug: string, suggestion: string | null, kind: string) {
  return new ConflictException({
    code: 'slug_conflict',
    message: `Đường dẫn ${pathForContent(kind, slug)} đã thuộc nội dung khác (kể cả URL cũ đang chuyển hướng). Hãy dùng cụm từ khác.`,
    suggestion,
    suggestionPath: suggestion ? pathForContent(kind, suggestion) : null,
  });
}

async function loadNode(db: Db, contentId: string) {
  const node = await db.contentNode.findUnique({
    where: { id: contentId },
    select: { id: true, kind: true, slugSource: true, version: true, publicationStatus: true },
  });
  if (!node) throw new NotFoundException('Không tìm thấy nội dung');
  return node;
}

async function currentRoutePath(db: Db, contentId: string): Promise<string | null> {
  const route = await db.publicRoute.findFirst({ where: { contentId, isCurrent: true }, select: { path: true } });
  return route?.path ?? null;
}

/** Read-only: what Generate would produce. Used for both create (no id) and edit. */
export async function previewSlug(
  db: Db,
  input: { kind?: string; contentId?: string | null; source: unknown },
): Promise<SlugPreview> {
  const node = input.contentId ? await loadNode(db, input.contentId) : null;
  const kind = node?.kind ?? input.kind;
  if (!kind) throw new BadRequestException('Thiếu loại nội dung');
  const slug = candidateFrom(input.source);
  const path = pathForContent(kind, slug);
  const currentSlug = node?.slugSource ?? null;
  const currentPath = node ? await currentRoutePath(db, node.id) ?? (currentSlug ? pathForContent(kind, currentSlug) : null) : null;
  const unchanged = currentSlug === slug;
  const reserved = isReservedSlug(slug);
  const owners = await slugOwners(db, kind);
  const owner = owners.get(slug);
  const conflict = !unchanged && !!owner && owner !== node?.id;
  const reactivatesHistory = !unchanged && !!owner && owner === node?.id;
  const suggestion = conflict || reserved ? nextFreeSlug(slug, owners, node?.id ?? null) : null;
  const isPublished = node?.publicationStatus === 'published';
  return {
    source: String(input.source).trim(),
    slug,
    path,
    currentSlug,
    currentPath,
    unchanged,
    available: !reserved && !conflict,
    reserved,
    conflict,
    reactivatesHistory,
    suggestion: reserved ? null : suggestion,
    suggestionPath: !reserved && suggestion ? pathForContent(kind, suggestion) : null,
    isPublished,
    requiresConfirmation: isPublished && !!currentSlug && !unchanged,
  };
}

/**
 * Create path: the slug must be exactly what Generate returned. There is no
 * title fallback and no silent suffix; an occupied slug is a visible 409.
 */
export async function assertCreateSlug(db: Db, kind: string, slug: string): Promise<void> {
  if (!isValidSlug(slug)) {
    throw new BadRequestException({ code: 'slug_invalid', message: 'Đường dẫn không hợp lệ. Hãy bấm Generate để tạo đường dẫn.' });
  }
  if (isReservedSlug(slug)) throw reservedError(slug);
  const owners = await slugOwners(db, kind);
  if (owners.has(slug)) throw conflictError(slug, nextFreeSlug(slug, owners, null), kind);
}

/**
 * Apply Generate. Runs inside the caller's transaction: checks the expected
 * version, refuses reserved/occupied paths (409, never a silent suffix), moves
 * the current route and leaves the old path as a 308 to the new one.
 */
export async function applyGeneratedSlug(
  db: Db,
  input: { contentId: string; source: unknown; expectedVersion: number; confirmPublicChange?: boolean; userId: string },
): Promise<GenerateSlugResult> {
  const node = await loadNode(db, input.contentId);
  if (node.version !== input.expectedVersion) {
    throw new ConflictException({
      code: 'version_conflict',
      message: 'Nội dung đã được người khác sửa. Tải lại rồi thử lại.',
      currentVersion: node.version,
    });
  }
  const slug = candidateFrom(input.source);
  const previousPath = await currentRoutePath(db, node.id);
  const path = pathForContent(node.kind, slug);
  if (slug === node.slugSource && previousPath === path) {
    return { slug, path, previousPath, redirectCreated: false, version: node.version, unchanged: true };
  }
  if (isReservedSlug(slug)) throw reservedError(slug);

  const owners = await slugOwners(db, node.kind);
  const owner = owners.get(slug);
  if (owner && owner !== node.id) throw conflictError(slug, nextFreeSlug(slug, owners, node.id), node.kind);

  if (node.publicationStatus === 'published' && previousPath && input.confirmPublicChange !== true) {
    throw new BadRequestException({
      code: 'public_url_change_unconfirmed',
      message: 'Nội dung đang công khai. Xác nhận đổi URL trước khi Generate.',
      previousPath,
      path,
    });
  }

  if (previousPath) {
    await switchCurrentRoute(db as Prisma.TransactionClient, node.id, node.kind, slug);
  } else {
    await db.publicRoute.upsert({
      where: { path },
      create: { contentId: node.id, path, isCurrent: true, redirectStatus: 308 },
      update: { isCurrent: true, redirectStatus: 308 },
    });
  }

  const updated = await db.contentNode.updateMany({
    where: { id: node.id, version: input.expectedVersion },
    data: {
      slugSource: slug,
      version: { increment: 1 },
      ...(node.publicationStatus === 'published' ? { lastPublicChangedAt: new Date() } : {}),
    },
  });
  if (updated.count !== 1) {
    throw new ConflictException({ code: 'version_conflict', message: 'Nội dung vừa được cập nhật. Tải lại rồi thử lại.' });
  }

  const redirectCreated = !!previousPath && previousPath !== path;
  await db.auditLog.create({
    data: {
      actorId: input.userId,
      action: 'content.slug_generated',
      entityType: 'content_node',
      entityId: node.id,
      diff: {
        fromSlug: node.slugSource,
        toSlug: slug,
        fromPath: previousPath,
        toPath: path,
        redirectCreated,
        expectedVersion: input.expectedVersion,
        version: input.expectedVersion + 1,
      },
    },
  });
  return { slug, path, previousPath, redirectCreated, version: input.expectedVersion + 1, unchanged: false };
}

/** Current URL first, then old URLs (each a one-hop redirect to the current URL). */
export async function routeHistory(
  db: Pick<Prisma.TransactionClient, 'publicRoute' | 'auditLog'>,
  contentId: string,
): Promise<{ current: RouteHistoryEntry | null; history: RouteHistoryEntry[] }> {
  const [routes, events] = await Promise.all([
    db.publicRoute.findMany({ where: { contentId }, orderBy: { createdAt: 'desc' } }),
    db.auditLog.findMany({
      where: { entityType: 'content_node', entityId: contentId, action: 'content.slug_generated' },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { fullName: true } } },
    }),
  ]);
  const entries = routes.map((route): RouteHistoryEntry => {
    const replaced = route.isCurrent ? undefined : events.find((event) => {
      const diff = event.diff as Record<string, unknown> | null;
      return diff?.fromPath === route.path;
    });
    return {
      path: route.path,
      isCurrent: route.isCurrent,
      redirectStatus: route.isCurrent ? null : 308,
      createdAt: route.createdAt.toISOString(),
      replacedAt: replaced?.createdAt.toISOString() ?? null,
      actor: replaced?.actor?.fullName ?? null,
    };
  });
  return { current: entries.find((entry) => entry.isCurrent) ?? null, history: entries.filter((entry) => !entry.isCurrent) };
}
