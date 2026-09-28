import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { documentMediaIds, documentToText, sanitizeDocument, type RichNode } from './document';
import { pathForContent, uniqueSlug } from './slug';
import { resolveUpdatedSlug, switchCurrentRoute } from './slug-routes';
import type { Paginated } from '../common/types';

export const CONTENT_KINDS = ['stay', 'combo', 'destination', 'article', 'page'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const PUBLICATION_STATUSES = ['draft', 'review', 'scheduled', 'published', 'archived'] as const;

export interface DestinationDetails {
  category: string;
  location?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

export interface ComboActivityDetails {
  text: string;
  timeText?: string | null;
}

export interface ComboDayDetails {
  dayNo: number;
  title: string;
  timeRange?: string | null;
  activities: ComboActivityDetails[];
}

export interface ComboDepartureDetails {
  departureDate: string;
  returnDate: string;
  capacity: number;
  adultPriceVnd: number;
  childPriceVnd?: number | null;
  status?: string;
}

export interface ComboDetails {
  code: string;
  durationDays: number;
  durationNights: number;
  pricingUnit?: string;
  area?: string | null;
  audienceTags?: string[];
  inclusions?: string[];
  exclusions?: string[];
  terms?: string[];
  destinationIds?: string[];
  days?: ComboDayDetails[];
  departures?: ComboDepartureDetails[];
}

export interface ArticleDetails {
  authorName?: string | null;
  readMinutes?: number | null;
}

export interface ContentDetails {
  destination?: DestinationDetails;
  combo?: ComboDetails;
  article?: ArticleDetails;
}

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
  details: ContentDetails;
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
  details?: ContentDetails;
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

    const slug = await this.reserveSlug(kind, input.slug?.trim() || input.title);
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
      await tx.publicRoute.create({ data: { contentId: node.id, path: pathForContent(kind, slug), redirectStatus: 308 } });
      if (input.media?.length) await this.replaceMedia(tx, node.id, input.media);
      await this.syncDetails(tx, node.id, kind, input.details);
      await tx.contentRevision.create({
        data: {
          contentId: node.id,
          documentSnapshot: body as object,
          contentSnapshot: this.revisionSnapshot(node, input.media ?? []) as object,
          note: 'Tạo mới',
          authorId: userId,
        },
      });
      return node;
    });

    await this.audit(userId, 'content.create', created.id, { kind, slug });
    return this.getOne(created.id);
  }

  async update(id: string, input: UpsertContentInput, userId: string): Promise<ContentView> {
    const current = await this.prisma.contentNode.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy nội dung');
    if (input.expectedVersion === undefined) throw new BadRequestException('Thiếu phiên bản nội dung cần cập nhật');
    this.assertVersion(current.version, input.expectedVersion);

    const body = input.body === undefined ? null : await this.cleanBody(input.body);
    const nextSlug = resolveUpdatedSlug(current.slugSource ?? '', input.slug);

    await this.prisma.$transaction(async (tx) => {
      const update = await tx.contentNode.updateMany({
        where: { id, version: input.expectedVersion },
        data: {
          title: input.title?.trim().slice(0, 300) ?? undefined,
          slugSource: nextSlug !== current.slugSource ? nextSlug : undefined,
          excerpt: input.excerpt === undefined ? undefined : input.excerpt?.slice(0, 500) ?? null,
          bodyDocument: body === null ? undefined : (body as object),
          metaTitle: input.metaTitle === undefined ? undefined : input.metaTitle?.slice(0, 200) ?? null,
          metaDescription:
            input.metaDescription === undefined ? undefined : input.metaDescription?.slice(0, 320) ?? null,
          noindex: input.noindex ?? undefined,
          ogMediaId: input.ogMediaId === undefined ? undefined : input.ogMediaId,
          featured: input.featured ?? undefined,
          version: { increment: 1 },
          ...(current.publicationStatus === 'published' ? { lastPublicChangedAt: new Date() } : {}),
        },
      });
      if (update.count !== 1) await this.throwWriteConflict(tx, id, input.expectedVersion!);

      if (nextSlug !== current.slugSource) await switchCurrentRoute(tx, id, current.kind, nextSlug);

      if (input.media) await this.replaceMedia(tx, id, input.media);
      if (input.details) await this.syncDetails(tx, id, current.kind, input.details);

      const saved = await tx.contentNode.findUnique({ where: { id } });
      if (!saved) throw new NotFoundException('Không tìm thấy nội dung');
      const media = await tx.contentMedia.findMany({ where: { contentId: id }, select: { mediaId: true, role: true, position: true } });
      const document = saved.bodyDocument ?? { type: 'doc', content: [] };
      await tx.contentRevision.create({
        data: {
          contentId: id,
          documentSnapshot: document as object,
          contentSnapshot: this.revisionSnapshot(saved, media) as object,
          note: 'Cập nhật',
          authorId: userId,
        },
      });
    });

    await this.audit(userId, 'content.update', id, { slug: nextSlug });
    return this.getOne(id);
  }

  /** Moves a node along draft → review → scheduled/published → archived. */
  async setStatus(
    id: string,
    status: string,
    publishAt: string | null,
    expectedVersion: number,
    userId: string,
  ): Promise<ContentView> {
    if (!PUBLICATION_STATUSES.includes(status as (typeof PUBLICATION_STATUSES)[number])) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }
    const node = await this.prisma.contentNode.findUnique({ where: { id }, include: this.includeShape() });
    if (!node) throw new NotFoundException('Không tìm thấy nội dung');
    this.assertVersion(node.version, expectedVersion);

    if (status === 'published' || status === 'scheduled') {
      const problems = this.publishChecklist(node);
      if (problems.length) {
        throw new BadRequestException({ code: 'not_publishable', message: 'Chưa đủ điều kiện xuất bản', problems });
      }
    }
    if (status === 'scheduled' && !publishAt) {
      throw new BadRequestException('Hẹn giờ xuất bản cần thời điểm cụ thể');
    }

    const published = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const result = await tx.contentNode.updateMany({
        where: { id, version: expectedVersion },
        data: {
          publicationStatus: status,
          publishAt: status === 'scheduled' ? new Date(publishAt!) : status === 'published' ? now : null,
          version: { increment: 1 },
          ...(status === 'published'
            ? { firstPublishedAt: node.firstPublishedAt ?? now, lastPublicChangedAt: now }
            : node.publicationStatus === 'published' ? { lastPublicChangedAt: now } : {}),
        },
      });
      if (result.count !== 1) await this.throwWriteConflict(tx, id, expectedVersion);
      const saved = await tx.contentNode.findUnique({ where: { id } });
      if (!saved) throw new NotFoundException('Không tìm thấy nội dung');
      const media = await tx.contentMedia.findMany({ where: { contentId: id }, select: { mediaId: true, role: true, position: true } });
      await tx.contentRevision.create({
        data: {
          contentId: id,
          documentSnapshot: (saved.bodyDocument ?? { type: 'doc', content: [] }) as object,
          contentSnapshot: this.revisionSnapshot(saved, media) as object,
          note: `Trạng thái: ${status}`,
          authorId: userId,
        },
      });
      return saved;
    });
    await this.audit(userId, `content.${status}`, id, { from: node.publicationStatus, to: status });
    return this.toView({ ...node, ...published });
  }

  private assertVersion(actual: number, expected: number): void {
    if (actual !== expected) {
      throw new ConflictException({
        code: 'version_conflict',
        message: 'Nội dung đã được người khác sửa. Tải lại rồi lưu lại.',
        currentVersion: actual,
      });
    }
  }

  private async throwWriteConflict(tx: Prisma.TransactionClient, id: string, expected: number): Promise<never> {
    const current = await tx.contentNode.findUnique({ where: { id }, select: { version: true } });
    if (!current) throw new NotFoundException('Không tìm thấy nội dung');
    this.assertVersion(current.version, expected);
    throw new ConflictException({
      code: 'version_conflict',
      message: 'Nội dung vừa được cập nhật. Tải lại rồi lưu lại.',
      currentVersion: current.version,
    });
  }

  private revisionSnapshot(
    node: {
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
    },
    media: Array<{ mediaId: string; role: string; position: number }>,
  ): Prisma.InputJsonObject {
    return {
      title: node.title,
      slugSource: node.slugSource,
      excerpt: node.excerpt,
      bodyDocument: (node.bodyDocument ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
      publicationStatus: node.publicationStatus,
      publishAt: node.publishAt?.toISOString() ?? null,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      ogMediaId: node.ogMediaId,
      featured: node.featured,
      version: node.version,
      media: media.map((item) => ({ mediaId: item.mediaId, role: item.role, position: item.position })),
    };
  }

  /** The same checks the admin shows before the publish button is enabled. */
  publishChecklist(node: {
    kind?: string;
    title: string;
    slugSource: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    bodyDocument: unknown;
    media?: Array<{
      mediaId: string;
      role?: string;
      media?: { storageKey?: string; isDemo?: boolean; visibility?: string; processingStatus?: string };
    }>;
    property?: {
      operatingStatus: string;
      roomTypes?: Array<{
        status: string;
        units: Array<{ id: string }>;
        ratePlans: Array<{ baseRateVnd: bigint }>;
      }>;
    } | null;
  }): string[] {
    const problems: string[] = [];
    if (!node.title?.trim()) problems.push('Thiếu tiêu đề');
    if (!node.slugSource) problems.push('Thiếu đường dẫn');
    if (!node.metaTitle?.trim()) problems.push('Thiếu tiêu đề SEO');
    if (!node.metaDescription?.trim()) problems.push('Thiếu mô tả SEO');
    if (documentToText(node.bodyDocument).length < 40) problems.push('Nội dung quá ngắn');
    const hasValidCover = node.media?.some(
      (item) =>
        item.role === 'cover' &&
        !!item.mediaId &&
        !!item.media?.storageKey &&
        item.media.isDemo === false &&
        item.media.visibility === 'public' &&
        item.media.processingStatus === 'ready',
    );
    if (!hasValidCover) problems.push('Chưa có ảnh đại diện hợp lệ');

    if (node.kind === 'stay') {
      const property = node.property;
      if (!property) {
        problems.push('Thiếu thông tin nơi lưu trú');
      } else {
        if (property.operatingStatus !== 'active') problems.push('Nơi lưu trú chưa được kích hoạt');
        const roomTypes = property.roomTypes ?? [];
        if (!roomTypes.length) problems.push('Chưa có hạng phòng hoạt động');
        if (!roomTypes.some((room) => room.units.length > 0)) problems.push('Chưa có đơn vị phòng hoạt động');
        if (!roomTypes.some((room) => room.ratePlans.some((rate) => rate.baseRateVnd >= 0n))) {
          problems.push('Chưa có bảng giá phòng');
        }
        if (!roomTypes.some((room) => room.units.length > 0 && room.ratePlans.some((rate) => rate.baseRateVnd >= 0n))) {
          problems.push('Cần ít nhất một hạng phòng có đơn vị và bảng giá (0đ sẽ hiển thị liên hệ)');
        }
      }
    }
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

  async restoreRevision(id: string, revisionId: string, expectedVersion: number, userId: string): Promise<ContentView> {
    const [current, revision] = await Promise.all([
      this.prisma.contentNode.findUnique({ where: { id } }),
      this.prisma.contentRevision.findFirst({ where: { id: revisionId, contentId: id } }),
    ]);
    if (!current) throw new NotFoundException('Không tìm thấy nội dung');
    if (!revision) throw new NotFoundException('Không tìm thấy phiên bản');
    this.assertVersion(current.version, expectedVersion);

    await this.prisma.$transaction(async (tx) => {
      const snapshot = revision.contentSnapshot && typeof revision.contentSnapshot === 'object' && !Array.isArray(revision.contentSnapshot)
        ? revision.contentSnapshot as Record<string, unknown>
        : null;
      const nextSlug = resolveUpdatedSlug(
        current.slugSource ?? '',
        snapshot && typeof snapshot.slugSource === 'string' ? snapshot.slugSource : undefined,
      );
      const body = snapshot?.bodyDocument ?? revision.documentSnapshot;
      const saved = await tx.contentNode.updateMany({
        where: { id, version: expectedVersion },
        data: {
          title: snapshot && typeof snapshot.title === 'string' ? snapshot.title : current.title,
          slugSource: nextSlug,
          excerpt: snapshot && (typeof snapshot.excerpt === 'string' || snapshot.excerpt === null) ? snapshot.excerpt : current.excerpt,
          bodyDocument: body as object,
          metaTitle: snapshot && (typeof snapshot.metaTitle === 'string' || snapshot.metaTitle === null) ? snapshot.metaTitle : current.metaTitle,
          metaDescription: snapshot && (typeof snapshot.metaDescription === 'string' || snapshot.metaDescription === null) ? snapshot.metaDescription : current.metaDescription,
          noindex: snapshot && typeof snapshot.noindex === 'boolean' ? snapshot.noindex : current.noindex,
          ogMediaId: snapshot && (typeof snapshot.ogMediaId === 'string' || snapshot.ogMediaId === null) ? snapshot.ogMediaId : current.ogMediaId,
          featured: snapshot && typeof snapshot.featured === 'boolean' ? snapshot.featured : current.featured,
          version: { increment: 1 },
          ...(current.publicationStatus === 'published' ? { lastPublicChangedAt: new Date() } : {}),
        },
      });
      if (saved.count !== 1) await this.throwWriteConflict(tx, id, expectedVersion);

      if (nextSlug !== current.slugSource) await switchCurrentRoute(tx, id, current.kind, nextSlug);

      if (snapshot && Array.isArray(snapshot.media)) {
        const media = snapshot.media.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const row = item as Record<string, unknown>;
          if (typeof row.mediaId !== 'string' || typeof row.role !== 'string' || typeof row.position !== 'number') return [];
          return [{ mediaId: row.mediaId, role: row.role, position: row.position }];
        });
        await this.replaceMedia(tx, id, media);
      }

      const restored = await tx.contentNode.findUnique({ where: { id }, include: this.includeShape() });
      if (!restored) throw new NotFoundException('Không tìm thấy nội dung');
      if (restored.publicationStatus === 'published') {
        const problems = this.publishChecklist(restored);
        if (problems.length) throw new BadRequestException({ code: 'not_publishable', message: 'Không thể khôi phục phiên bản khi nội dung đang xuất bản', problems });
      }
      const media = await tx.contentMedia.findMany({ where: { contentId: id }, select: { mediaId: true, role: true, position: true } });
      await tx.contentRevision.create({
        data: {
          contentId: id,
          documentSnapshot: body as object,
          contentSnapshot: this.revisionSnapshot(restored, media) as object,
          note: `Khôi phục phiên bản ${revision.createdAt.toISOString()}`,
          authorId: userId,
        },
      });
    });
    await this.audit(userId, 'content.restore', id, { revisionId });
    return this.getOne(id);
  }

  async remove(id: string, expectedVersion: number, userId: string): Promise<void> {
    const node = await this.prisma.contentNode.findUnique({
      where: { id },
      include: { property: true, combo: true, page: true },
    });
    if (!node) throw new NotFoundException('Không tìm thấy nội dung');
    this.assertVersion(node.version, expectedVersion);
    if (node.publicationStatus === 'published') {
      throw new ConflictException('Gỡ xuất bản trước khi xoá');
    }
    const removed = await this.prisma.contentNode.deleteMany({
      where: { id, version: expectedVersion, publicationStatus: { not: 'published' } },
    });
    if (removed.count !== 1) {
      const latest = await this.prisma.contentNode.findUnique({ where: { id }, select: { version: true, publicationStatus: true } });
      if (!latest) throw new NotFoundException('Không tìm thấy nội dung');
      this.assertVersion(latest.version, expectedVersion);
      if (latest.publicationStatus === 'published') throw new ConflictException('Gỡ xuất bản trước khi xoá');
      throw new ConflictException('Nội dung vừa thay đổi. Tải lại rồi thử lại.');
    }
    await this.audit(userId, 'content.delete', id, { kind: node.kind });
  }

  /**
   * Content is the editorial aggregate, while these small relation rows keep
   * booking/catalog fields typed. They are written in the same transaction so
   * a saved draft can never point at a half-created Combo or destination.
   */
  private async syncDetails(
    tx: Prisma.TransactionClient,
    contentId: string,
    kind: string,
    details?: ContentDetails,
  ): Promise<void> {
    if (kind === 'destination') {
      const destination = details?.destination;
      if (!destination?.category?.trim()) throw new BadRequestException('Điểm đến cần có nhóm phân loại');
      await tx.destination.upsert({
        where: { contentId },
        create: {
          contentId,
          category: destination.category.trim().slice(0, 100),
          location: destination.location?.trim().slice(0, 160) || null,
          mapX: destination.mapX ?? null,
          mapY: destination.mapY ?? null,
        },
        update: {
          category: destination.category.trim().slice(0, 100),
          location: destination.location?.trim().slice(0, 160) || null,
          mapX: destination.mapX ?? null,
          mapY: destination.mapY ?? null,
        },
      });
      return;
    }

    if (kind === 'article') {
      // Every article content node needs its typed projection row; without it,
      // a published node passes the generic checklist but is invisible to the
      // public article endpoints.
      const article = details?.article ?? {};
      await tx.article.upsert({
        where: { contentId },
        create: {
          contentId,
          authorName: article.authorName?.trim().slice(0, 160) || null,
          readMinutes: article.readMinutes ?? null,
        },
        update: {
          authorName: article.authorName?.trim().slice(0, 160) || null,
          readMinutes: article.readMinutes ?? null,
        },
      });
      return;
    }

    if (kind !== 'combo') return;
    const comboInput = details?.combo;
    if (!comboInput?.code?.trim()) throw new BadRequestException('Combo cần có mã combo');
    if (comboInput.durationNights > comboInput.durationDays) {
      throw new BadRequestException('Số đêm không thể lớn hơn số ngày');
    }

    const combo = await tx.combo.upsert({
      where: { contentId },
      create: {
        contentId,
        code: comboInput.code.trim().slice(0, 80),
        durationDays: comboInput.durationDays,
        durationNights: comboInput.durationNights,
        pricingUnit: comboInput.pricingUnit?.trim().slice(0, 40) || 'person',
        area: comboInput.area?.trim().slice(0, 160) || null,
        audienceTags: (comboInput.audienceTags ?? []) as object,
        inclusions: (comboInput.inclusions ?? []) as object,
        exclusions: (comboInput.exclusions ?? []) as object,
        terms: (comboInput.terms ?? []) as object,
      },
      update: {
        code: comboInput.code.trim().slice(0, 80),
        durationDays: comboInput.durationDays,
        durationNights: comboInput.durationNights,
        pricingUnit: comboInput.pricingUnit?.trim().slice(0, 40) || 'person',
        area: comboInput.area?.trim().slice(0, 160) || null,
        audienceTags: (comboInput.audienceTags ?? []) as object,
        inclusions: (comboInput.inclusions ?? []) as object,
        exclusions: (comboInput.exclusions ?? []) as object,
        terms: (comboInput.terms ?? []) as object,
        version: { increment: 1 },
      },
    });

    if (comboInput.destinationIds !== undefined) {
      const ids = [...new Set(comboInput.destinationIds)];
      if (ids.length) {
        const found = await tx.destination.count({
          where: { contentId: { in: ids }, content: { kind: 'destination' } },
        });
        if (found !== ids.length) throw new BadRequestException('Có điểm đến liên kết không tồn tại');
      }
      await tx.comboDestination.deleteMany({ where: { comboId: combo.id } });
      if (ids.length) {
        await tx.comboDestination.createMany({
          data: ids.map((destinationId, position) => ({ comboId: combo.id, destinationId, position })),
        });
      }
    }

    if (comboInput.days !== undefined) {
      await tx.comboDay.deleteMany({ where: { comboId: combo.id } });
      for (const day of comboInput.days) {
        const createdDay = await tx.comboDay.create({
          data: {
            comboId: combo.id,
            dayNo: day.dayNo,
            title: day.title.trim().slice(0, 200),
            timeRange: day.timeRange?.trim().slice(0, 100) || null,
          },
        });
        if (day.activities.length) {
          await tx.comboActivity.createMany({
            data: day.activities.map((activity, position) => ({
              dayId: createdDay.id,
              position,
              timeText: activity.timeText?.trim().slice(0, 80) || null,
              text: activity.text.trim().slice(0, 500),
            })),
          });
        }
      }
    }

    if (comboInput.departures !== undefined) {
      for (const departure of comboInput.departures) {
        const departureDate = this.comboDate(departure.departureDate);
        const returnDate = this.comboDate(departure.returnDate);
        if (returnDate < departureDate) throw new BadRequestException('Ngày về phải sau ngày khởi hành');
        const existing = await tx.comboDeparture.findFirst({ where: { comboId: combo.id, departureDate } });
        const data = {
          returnDate,
          capacity: departure.capacity,
          adultPriceVnd: BigInt(departure.adultPriceVnd),
          childPriceVnd: departure.childPriceVnd === null || departure.childPriceVnd === undefined ? null : BigInt(departure.childPriceVnd),
          status: departure.status ?? 'open',
        };
        if (existing) {
          await tx.comboDeparture.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });
        } else {
          await tx.comboDeparture.create({ data: { comboId: combo.id, departureDate, ...data } });
        }
      }
    }
  }

  private comboDate(value: string): Date {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Ngày combo không hợp lệ');
    return date;
  }

  private async currentPath(contentId: string): Promise<string | null> {
    const route = await this.prisma.publicRoute.findFirst({ where: { contentId, isCurrent: true } });
    return route?.path ?? null;
  }

  private async reserveSlug(kind: string, desired: string): Promise<string> {
    const [siblings, routes] = await Promise.all([
      this.prisma.contentNode.findMany({
        where: { kind },
        select: { slugSource: true },
      }),
      // Renaming a node leaves its old path behind as a redirect, and that row
      // still owns the path. Reusing the freed slug would collide with it.
      this.prisma.publicRoute.findMany({
        where: { path: { startsWith: pathForContent(kind, '') } },
        select: { path: true },
      }),
    ]);

    const taken = new Set(siblings.map((s) => s.slugSource).filter((s): s is string => !!s));
    const prefix = pathForContent(kind, '');
    for (const route of routes) {
      const rest = route.path.slice(prefix.length);
      // Only reserve direct children of this section as slugs.
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
    tx: Pick<Prisma.TransactionClient, 'contentMedia'>,
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
      media: {
        include: {
          media: { select: { storageKey: true, isDemo: true, visibility: true, processingStatus: true } },
        },
        orderBy: { position: 'asc' as const },
      },
      routes: { where: { isCurrent: true }, take: 1 },
      destination: true,
      article: true,
      property: {
        include: {
          roomTypes: {
            where: { status: 'active' },
            include: {
              units: { where: { active: true }, select: { id: true } },
              ratePlans: { where: { active: true }, select: { baseRateVnd: true } },
            },
          },
        },
      },
      combo: {
        include: {
          days: { include: { activities: { orderBy: { position: 'asc' as const } } }, orderBy: { dayNo: 'asc' as const } },
          destinations: { orderBy: { position: 'asc' as const } },
          departures: { orderBy: { departureDate: 'asc' as const } },
        },
      },
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
    destination?: { category: string; location: string | null; mapX: unknown; mapY: unknown } | null;
    article?: { authorName: string | null; readMinutes: number | null } | null;
    combo?: {
      code: string;
      durationDays: number;
      durationNights: number;
      pricingUnit: string;
      area: string | null;
      audienceTags: unknown;
      inclusions: unknown;
      exclusions: unknown;
      terms: unknown;
      days: Array<{
        dayNo: number;
        title: string;
        timeRange: string | null;
        activities: Array<{ position: number; timeText: string | null; text: string }>;
      }>;
      destinations: Array<{ destinationId: string; position: number }>;
      departures: Array<{
        departureDate: Date;
        returnDate: Date;
        capacity: number;
        adultPriceVnd: bigint;
        childPriceVnd: bigint | null;
        status: string;
      }>;
    } | null;
  }): ContentView {
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      slug: row.slugSource,
      path: row.routes?.[0]?.path ?? (row.kind === 'page' && row.slugSource ? pathForContent('page', row.slugSource) : null),
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
      details: this.detailsFromRow(row),
    };
  }

  private detailsFromRow(row: {
    kind: string;
    destination?: { category: string; location: string | null; mapX: unknown; mapY: unknown } | null;
    article?: { authorName: string | null; readMinutes: number | null } | null;
    combo?: {
      code: string;
      durationDays: number;
      durationNights: number;
      pricingUnit: string;
      area: string | null;
      audienceTags: unknown;
      inclusions: unknown;
      exclusions: unknown;
      terms: unknown;
      days: Array<{
        dayNo: number;
        title: string;
        timeRange: string | null;
        activities: Array<{ position: number; timeText: string | null; text: string }>;
      }>;
      destinations: Array<{ destinationId: string; position: number }>;
      departures: Array<{
        departureDate: Date;
        returnDate: Date;
        capacity: number;
        adultPriceVnd: bigint;
        childPriceVnd: bigint | null;
        status: string;
      }>;
    } | null;
  }): ContentDetails {
    if (row.kind === 'destination' && row.destination) {
      return {
        destination: {
          category: row.destination.category,
          location: row.destination.location,
          mapX: row.destination.mapX === null ? null : Number(row.destination.mapX),
          mapY: row.destination.mapY === null ? null : Number(row.destination.mapY),
        },
      };
    }
    if (row.kind === 'article' && row.article) {
      return { article: { authorName: row.article.authorName, readMinutes: row.article.readMinutes } };
    }
    if (row.kind === 'combo' && row.combo) {
      return {
        combo: {
          code: row.combo.code,
          durationDays: row.combo.durationDays,
          durationNights: row.combo.durationNights,
          pricingUnit: row.combo.pricingUnit,
          area: row.combo.area,
          audienceTags: this.stringList(row.combo.audienceTags),
          inclusions: this.stringList(row.combo.inclusions),
          exclusions: this.stringList(row.combo.exclusions),
          terms: this.stringList(row.combo.terms),
          destinationIds: row.combo.destinations.sort((a, b) => a.position - b.position).map((item) => item.destinationId),
          days: row.combo.days.map((day) => ({
            dayNo: day.dayNo,
            title: day.title,
            timeRange: day.timeRange,
            activities: day.activities.map((activity) => ({ text: activity.text, timeText: activity.timeText })),
          })),
          departures: row.combo.departures.map((departure) => ({
            departureDate: departure.departureDate.toISOString().slice(0, 10),
            returnDate: departure.returnDate.toISOString().slice(0, 10),
            capacity: departure.capacity,
            adultPriceVnd: Number(departure.adultPriceVnd),
            childPriceVnd: departure.childPriceVnd === null ? null : Number(departure.childPriceVnd),
            status: departure.status,
          })),
        },
      };
    }
    return {};
  }

  private stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
}
