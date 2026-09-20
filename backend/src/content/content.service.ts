import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { documentMediaIds, documentToText, sanitizeDocument, type RichNode } from './document';
import { pathForContent, uniqueSlug } from './slug';
import type { Paginated } from '../common/types';

export const CONTENT_KINDS = ['stay', 'combo', 'destination', 'article', 'page'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const PUBLICATION_STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived'] as const;

export interface ContentView {
  id: string;
  kind: string;
  title: string;
  slug: string | null;
  path: string | null;
  excerpt: string | null;
  body: RichNode | null;
  publicationStatus: string;
  publishAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  ogMediaId: string | null;
  featured: boolean;
  version: number;
  updatedAt: string;
  media: Array<{ mediaId: string; role: string; position: number; url: string }>;
}

export interface UpsertContentInput {
  kind?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  body?: unknown;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  ogMediaId?: string | null;
  featured?: boolean;
  media?: Array<{ mediaId: string; role: string; position: number }>;
  expectedVersion?: number;
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async list(params: {
    kind?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<ContentView>> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const where = {
      ...(params.kind ? { kind: params.kind } : {}),
      ...(params.status ? { publicationStatus: params.status } : {}),
      ...(params.search
        ? { title: { contains: params.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.contentNode.findMany({
        where,
        include: this.includeShape(),
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contentNode.count({ where }),
    ]);
    return { items: rows.map((row) => this.toView(row)), page, pageSize, total };
  }

  async getOne(id: string): Promise<ContentView> {
    const row = await this.prisma.contentNode.findUnique({ where: { id }, include: this.includeShape() });
    if (!row) throw new NotFoundException('Không tìm thấy nội dung');
    return this.toView(row);
  }

  /** What the public website reads: only published nodes, resolved by path. */
  async getPublishedByPath(path: string): Promise<ContentView> {
    const route = await this.prisma.publicRoute.findUnique({
      where: { path },
      include: { content: { include: this.includeShape() } },
    });
    if (!route) throw new NotFoundException('Không tìm thấy trang');
    if (!route.isCurrent) {
      throw new ConflictException({ code: 'moved', message: 'Đường dẫn đã đổi', path: await this.currentPath(route.contentId) });
    }
    if (route.content.publicationStatus !== 'published') throw new NotFoundException('Không tìm thấy trang');
    return this.toView(route.content);
  }

  async create(input: UpsertContentInput, userId: string): Promise<ContentView> {
    const kind = input.kind ?? 'article';
    if (!CONTENT_KINDS.includes(kind as ContentKind)) throw new BadRequestException('Loại nội dung không hợp lệ');
    if (!input.title?.trim()) throw new BadRequestException('Thiếu tiêu đề');

    const slug = await this.reserveSlug(kind, input.slug ?? input.title);
    const body = await this.cleanBody(input.body);

    const created = await this.prisma.$transaction(async (tx) => {
      const node = await tx.contentNode.create({
        data: {
          kind,
          title: input.title!.trim().slice(0, 300),
          slugSource: slug,
          excerpt: input.excerpt?.slice(0, 500) ?? this.autoExcerpt(body),
          bodyDocument: body as object,
          metaTitle: input.metaTitle?.slice(0, 200) ?? null,
          metaDescription: input.metaDescription?.slice(0, 320) ?? null,
          noindex: input.noindex ?? false,
          ogMediaId: input.ogMediaId ?? null,
          featured: input.featured ?? false,
          publicationStatus: 'draft',
        },
      });
      await tx.publicRoute.create({ data: { contentId: node.id, path: pathForContent(kind, slug) } });
      await tx.contentRevision.create({
        data: { contentId: node.id, documentSnapshot: body as object, note: 'Tạo mới', authorId: userId },
      });
      if (input.media?.length) await this.replaceMedia(tx, node.id, input.media);
      return node;
    });

    await this.audit(userId, 'content.create', created.id, { kind, slug });
    return this.getOne(created.id);
  }

  async update(id: string, input: UpsertContentInput, userId: string): Promise<ContentView> {
    const current = await this.prisma.contentNode.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy nội dung');
    if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) {
      throw new ConflictException({
        code: 'version_conflict',
        message: 'Nội dung đã được người khác sửa. Tải lại rồi lưu lại.',
        currentVersion: current.version,
      });
    }

    const body = input.body === undefined ? null : await this.cleanBody(input.body);
    const nextSlug =
      input.slug && input.slug !== current.slugSource
        ? await this.reserveSlug(current.kind, input.slug, id)
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.contentNode.update({
        where: { id },
        data: {
          title: input.title?.trim().slice(0, 300) ?? undefined,
          slugSource: nextSlug ?? undefined,
          excerpt: input.excerpt === undefined ? undefined : input.excerpt?.slice(0, 500) ?? null,
          bodyDocument: body === null ? undefined : (body as object),
          metaTitle: input.metaTitle === undefined ? undefined : input.metaTitle?.slice(0, 200) ?? null,
          metaDescription:
            input.metaDescription === undefined ? undefined : input.metaDescription?.slice(0, 320) ?? null,
          noindex: input.noindex ?? undefined,
          ogMediaId: input.ogMediaId === undefined ? undefined : input.ogMediaId,
          featured: input.featured ?? undefined,
          version: { increment: 1 },
        },
      });

      if (nextSlug) {
        // The old path keeps working as a redirect instead of turning into a 404.
        await tx.publicRoute.updateMany({ where: { contentId: id, isCurrent: true }, data: { isCurrent: false } });
        const path = pathForContent(current.kind, nextSlug);
        const existing = await tx.publicRoute.findUnique({ where: { path } });
        if (existing && existing.contentId !== id) {
          throw new ConflictException('Đường dẫn này đã thuộc về nội dung khác');
        }
        await tx.publicRoute.upsert({
          where: { path },
          create: { contentId: id, path, isCurrent: true },
          update: { isCurrent: true },
        });
      }

      if (body) {
        await tx.contentRevision.create({
          data: { contentId: id, documentSnapshot: body as object, note: 'Cập nhật', authorId: userId },
        });
      }
      if (input.media) await this.replaceMedia(tx, id, input.media);
    });

    await this.audit(userId, 'content.update', id, { slug: nextSlug ?? current.slugSource });
    return this.getOne(id);
  }

  /** Moves a node along draft → review → scheduled/published → archived. */
  async setStatus(
    id: string,
    status: string,
    publishAt: string | null,
    userId: string,
  ): Promise<ContentView> {
    if (!PUBLICATION_STATUSES.includes(status as (typeof PUBLICATION_STATUSES)[number])) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }
    const node = await this.prisma.contentNode.findUnique({ where: { id }, include: this.includeShape() });
    if (!node) throw new NotFoundException('Không tìm thấy nội dung');

    if (status === 'published' || status === 'scheduled') {
      const problems = this.publishChecklist(node);
      if (problems.length) {
        throw new BadRequestException({ code: 'not_publishable', message: 'Chưa đủ điều kiện xuất bản', problems });
      }
    }
    if (status === 'scheduled' && !publishAt) {
      throw new BadRequestException('Hẹn giờ xuất bản cần thời điểm cụ thể');
    }

    const published = await this.prisma.contentNode.update({
      where: { id },
      data: {
        publicationStatus: status,
        publishAt: status === 'scheduled' ? new Date(publishAt!) : status === 'published' ? new Date() : null,
        version: { increment: 1 },
      },
    });
    await this.audit(userId, `content.${status}`, id, { from: node.publicationStatus, to: status });
    return this.toView({ ...node, ...published });
  }

  /** The same checks the admin shows before the publish button is enabled. */
  publishChecklist(node: {
    title: string;
    slugSource: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    bodyDocument: unknown;
    media?: Array<{ mediaId: string }>;
  }): string[] {
    const problems: string[] = [];
    if (!node.title?.trim()) problems.push('Thiếu tiêu đề');
    if (!node.slugSource) problems.push('Thiếu đường dẫn');
    if (!node.metaTitle?.trim()) problems.push('Thiếu tiêu đề SEO');
    if (!node.metaDescription?.trim()) problems.push('Thiếu mô tả SEO');
    if (documentToText(node.bodyDocument).length < 40) problems.push('Nội dung quá ngắn');
    if (!node.media?.length) problems.push('Chưa có ảnh đại diện');
    return problems;
  }

  async revisions(id: string): Promise<Array<{ id: string; note: string | null; author: string | null; createdAt: string }>> {
    const rows = await this.prisma.contentRevision.findMany({
      where: { contentId: id },
      include: { author: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      note: row.note,
      author: row.author?.fullName ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async restoreRevision(id: string, revisionId: string, userId: string): Promise<ContentView> {
    const revision = await this.prisma.contentRevision.findFirst({ where: { id: revisionId, contentId: id } });
    if (!revision) throw new NotFoundException('Không tìm thấy phiên bản');
    await this.prisma.$transaction([
      this.prisma.contentNode.update({
        where: { id },
        data: { bodyDocument: revision.documentSnapshot as object, version: { increment: 1 } },
      }),
      this.prisma.contentRevision.create({
        data: {
          contentId: id,
          documentSnapshot: revision.documentSnapshot as object,
          note: `Khôi phục phiên bản ${revision.createdAt.toISOString()}`,
          authorId: userId,
        },
      }),
    ]);
    await this.audit(userId, 'content.restore', id, { revisionId });
    return this.getOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const node = await this.prisma.contentNode.findUnique({
      where: { id },
      include: { property: true, combo: true, page: true },
    });
    if (!node) throw new NotFoundException('Không tìm thấy nội dung');
    if (node.publicationStatus === 'published') {
      throw new ConflictException('Gỡ xuất bản trước khi xoá');
    }
    await this.prisma.contentNode.delete({ where: { id } });
    await this.audit(userId, 'content.delete', id, { kind: node.kind });
  }

  private async currentPath(contentId: string): Promise<string | null> {
    const route = await this.prisma.publicRoute.findFirst({ where: { contentId, isCurrent: true } });
    return route?.path ?? null;
  }

  private async reserveSlug(kind: string, desired: string, ignoreId?: string): Promise<string> {
    const [siblings, routes] = await Promise.all([
      this.prisma.contentNode.findMany({
        where: { kind, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
        select: { slugSource: true },
      }),
      // Renaming a node leaves its old path behind as a redirect, and that row
      // still owns the path. Reusing the freed slug would collide with it.
      this.prisma.publicRoute.findMany({
        where: { path: { startsWith: `${pathForContent(kind, '')}` }, ...(ignoreId ? { contentId: { not: ignoreId } } : {}) },
        select: { path: true },
      }),
    ]);

    const taken = new Set(siblings.map((s) => s.slugSource).filter((s): s is string => !!s));
    const prefix = pathForContent(kind, '');
    for (const route of routes) {
      const rest = route.path.slice(prefix.length);
      // Pages live at the root, where the prefix is just "/" and would match
      // every other section's paths too. Only single-segment ones are slugs.
      if (rest && !rest.includes('/')) taken.add(rest);
    }
    return uniqueSlug(desired, taken);
  }

  private async cleanBody(body: unknown): Promise<RichNode> {
    const editor = await this.settings.get<{ allowedBlocks: string[] }>('content.editor');
    const clean = sanitizeDocument(body ?? { type: 'doc', content: [] }, { allowedBlocks: editor.allowedBlocks });
    const referenced = documentMediaIds(clean);
    if (referenced.length) {
      const found = await this.prisma.mediaAsset.count({ where: { id: { in: referenced } } });
      if (found !== referenced.length) throw new BadRequestException('Nội dung tham chiếu ảnh không tồn tại');
    }
    return clean;
  }

  private autoExcerpt(body: RichNode): string | null {
    const text = documentToText(body);
    return text ? text.slice(0, 280) : null;
  }

  private async replaceMedia(
    tx: { contentMedia: { deleteMany: Function; createMany: Function } },
    contentId: string,
    media: Array<{ mediaId: string; role: string; position: number }>,
  ): Promise<void> {
    await tx.contentMedia.deleteMany({ where: { contentId } });
    if (!media.length) return;
    await tx.contentMedia.createMany({
      data: media.map((item, index) => ({
        contentId,
        mediaId: item.mediaId,
        role: item.role || 'gallery',
        position: item.position ?? index,
      })),
      skipDuplicates: true,
    });
  }

  private includeShape() {
    return {
      media: { include: { media: { select: { storageKey: true } } }, orderBy: { position: 'asc' as const } },
      routes: { where: { isCurrent: true }, take: 1 },
    };
  }

  private async audit(userId: string, action: string, entityId: string, diff: object): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId: userId, action, entityType: 'content_node', entityId, diff: diff as object },
    });
  }

  private toView(row: {
    id: string;
    kind: string;
    title: string;
    slugSource: string | null;
    excerpt: string | null;
    bodyDocument: unknown;
    publicationStatus: string;
    publishAt: Date | null;
    metaTitle: string | null;
    metaDescription: string | null;
    noindex: boolean;
    ogMediaId: string | null;
    featured: boolean;
    version: number;
    updatedAt: Date;
    media?: Array<{ mediaId: string; role: string; position: number; media: { storageKey: string } }>;
    routes?: Array<{ path: string }>;
  }): ContentView {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      slug: row.slugSource,
      path: row.routes?.[0]?.path ?? null,
      excerpt: row.excerpt,
      body: (row.bodyDocument as RichNode) ?? null,
      publicationStatus: row.publicationStatus,
      publishAt: row.publishAt?.toISOString() ?? null,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      noindex: row.noindex,
      ogMediaId: row.ogMediaId,
      featured: row.featured,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      media: (row.media ?? []).map((item) => ({
        mediaId: item.mediaId,
        role: item.role,
        position: item.position,
        url: `/media/${item.media.storageKey}`,
      })),
    };
  }
}
