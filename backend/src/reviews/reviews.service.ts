import { randomUUID, createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from '../auth/auth.service';
import { loadConfig } from '../common/config/env';
import { hashIp } from '../common/crypto';
import type { AuthenticatedUser, Paginated } from '../common/types';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_REVIEW_PHOTOS, parseReviewFields, ratingSummary, REJECT_REASONS, type RejectReason } from './review-input';

const OPERATION = 'public.review.create';
const NOT_STAYED_STATUSES = ['cancelled', 'expired', 'hold_expired', 'pending_confirmation'];
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface ReviewPhotoUpload { buffer: Buffer; filename: string; mimetype: string }
export interface SubmitMeta { principal: string; guestSessionId: string | null; ip?: string; idempotencyKey?: string }
type Receipt = { id: string; status: 'pending' };

export interface AdminReviewView {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  phone: string | null;
  stay: { contentId: string; name: string; path: string | null };
  stayedAt: string | null;
  source: string;
  verified: boolean;
  status: ReviewStatus;
  rejectReason: string | null;
  moderatedAt: string | null;
  moderatedBy: string | null;
  ownerReply: string | null;
  ownerReplyAt: string | null;
  photos: Array<{ id: string; src: string; width: number | null; height: number | null; visibility: string }>;
  createdAt: string;
  version: number;
}

export interface ListReviewsQuery {
  status?: string;
  stay?: string;
  rating?: string;
  hasPhotos?: string;
  search?: string;
  page?: string | number;
  pageSize?: string | number;
}

const ADMIN_INCLUDE = {
  content: { select: { id: true, title: true, routes: { where: { isCurrent: true }, take: 1, select: { path: true } } } },
  moderatedBy: { select: { fullName: true } },
  media: { orderBy: { position: 'asc' as const }, select: { media: { select: { id: true, storageKey: true, width: true, height: true, visibility: true } } } },
} satisfies Prisma.ReviewInclude;
type AdminRow = Prisma.ReviewGetPayload<{ include: typeof ADMIN_INCLUDE }>;

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly config = loadConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly media: MediaService,
  ) {}

  /* ------------------------------------------------------------ public */

  async submit(fields: Record<string, string>, photos: ReviewPhotoUpload[], meta: SubmitMeta): Promise<Receipt> {
    const { honeypot, value } = parseReviewFields(fields);
    // Bots that fill the hidden field get a normal-looking receipt and nothing is stored.
    if (honeypot) return { id: randomUUID(), status: 'pending' };
    if (photos.length > MAX_REVIEW_PHOTOS) throw new BadRequestException(`Tối đa ${MAX_REVIEW_PHOTOS} ảnh cho mỗi đánh giá`);

    const key = meta.idempotencyKey;
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(key)) throw new BadRequestException('Thiếu Idempotency-Key hợp lệ');
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ ...value, stayedAt: value.stayedAt?.toISOString() ?? null }))
      .update(photos.map((photo) => createHash('sha256').update(photo.buffer).digest('hex')).join(','))
      .digest('hex');
    const where = { principalScope_operation_key: { principalScope: meta.principal, operation: OPERATION, key } };
    const prior = await this.prisma.idempotencyKey.findUnique({ where });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ConflictException('Đánh giá này đã được gửi với nội dung khác');
      if (prior.responseSnapshot) return prior.responseSnapshot as Receipt;
      throw new ConflictException('Đánh giá đang được xử lý; vui lòng đợi giây lát');
    }

    await this.auth.consumeRateLimit('review-submit', meta.principal, 3, 60 * 60_000, 60 * 60_000);
    if (meta.ip) await this.auth.consumeRateLimit('review-submit-ip', meta.ip, 6, 60 * 60_000, 60 * 60_000);

    const content = await this.prisma.contentNode.findFirst({
      where: {
        kind: 'stay', slugSource: value.stay, publicationStatus: 'published', isDemo: false,
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        property: { operatingStatus: 'active' },
      },
      select: { id: true, property: { select: { id: true } } },
    });
    if (!content?.property) throw new BadRequestException('Nơi lưu trú này hiện không nhận đánh giá');

    const duplicate = await this.prisma.review.findFirst({
      where: { contentId: content.id, reviewerPhone: value.phone, moderation: { in: ['pending', 'approved'] } },
      select: { moderation: true },
    });
    if (duplicate) {
      throw new ConflictException(duplicate.moderation === 'pending'
        ? 'Số điện thoại này đã gửi đánh giá cho nơi lưu trú này và đang chờ duyệt.'
        : 'Số điện thoại này đã có đánh giá cho nơi lưu trú này. Cảm ơn bạn!');
    }

    const verified = await this.stayedThere(value.phone, content.property.id);

    // Photos are stored as private copies before the review row exists; any failure below removes them again.
    const mediaIds: string[] = [];
    try {
      for (const photo of photos) {
        const asset = await this.media.ingest(photo, { altText: `Ảnh khách ${value.name} chia sẻ` }, null, { visibility: 'private', dedupe: false });
        mediaIds.push(asset.id);
      }
      return await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.idempotencyKey.create({ data: {
          principalScope: meta.principal, operation: OPERATION, key, requestHash, expiresAt: new Date(Date.now() + 7 * 86_400_000),
        } });
        const review = await tx.review.create({
          data: {
            contentId: content.id,
            authorName: value.name,
            reviewerPhone: value.phone,
            rating: value.rating,
            body: value.body,
            stayedAt: value.stayedAt,
            source: value.source,
            isVerified: verified,
            moderation: 'pending',
            ipHash: hashIp(meta.ip, this.config.sessionSecret),
            guestSessionId: meta.guestSessionId,
            media: { create: mediaIds.map((mediaId, position) => ({ mediaId, position })) },
          },
        });
        await tx.auditLog.create({ data: {
          action: 'review.create', entityType: 'review', entityId: review.id,
          diff: { contentId: content.id, rating: value.rating, photos: mediaIds.length, source: value.source, verified } as Prisma.InputJsonObject,
        } });
        const receipt: Receipt = { id: review.id, status: 'pending' };
        await tx.idempotencyKey.update({ where: { id: reservation.id }, data: { responseSnapshot: receipt } });
        return receipt;
      });
    } catch (error) {
      for (const id of mediaIds) await this.media.remove(id, null).catch(() => undefined);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.idempotencyKey.findUnique({ where });
        if (replay?.responseSnapshot) return replay.responseSnapshot as Receipt;
      }
      throw error;
    }
  }

  /** True when this phone booked the property through the website and the stay has ended. */
  private async stayedThere(phone: string, propertyId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        isDemo: false,
        bookingStatus: { notIn: NOT_STAYED_STATUSES },
        checkOut: { lte: new Date() },
        customer: { phoneNormalized: phone },
        lines: { some: { roomType: { propertyId } } },
      },
      select: { id: true },
    });
    return !!booking;
  }

  /* ------------------------------------------------------------ admin */

  async list(query: ListReviewsQuery): Promise<Paginated<AdminReviewView> & { counts: Record<ReviewStatus | 'all', number> }> {
    const status = REVIEW_STATUSES.includes(query.status as ReviewStatus) ? query.status as ReviewStatus : null;
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
    const filters: Prisma.ReviewWhereInput[] = [{ isDemo: false }];
    if (query.stay && /^[0-9a-f-]{36}$/i.test(query.stay)) filters.push({ contentId: query.stay });
    const rating = Number(query.rating);
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) filters.push({ rating });
    if (query.hasPhotos === 'true') filters.push({ media: { some: {} } });
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 120) : '';
    if (search) {
      const digits = search.replace(/\D/g, '');
      filters.push({ OR: [
        { authorName: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        ...(digits.length >= 3 ? [{ reviewerPhone: { contains: digits.startsWith('84') ? `0${digits.slice(2)}` : digits } }] : []),
      ] });
    }
    const base: Prisma.ReviewWhereInput = { AND: filters };
    const where: Prisma.ReviewWhereInput = { AND: [...filters, ...(status ? [{ moderation: status }] : [])] };
    const [rows, total, grouped] = await Promise.all([
      this.prisma.review.findMany({
        where, include: ADMIN_INCLUDE,
        orderBy: status === 'pending' ? { createdAt: 'asc' } : { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['moderation'], where: base, _count: { _all: true } }),
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0, all: 0 } as Record<ReviewStatus | 'all', number>;
    for (const row of grouped) {
      if (REVIEW_STATUSES.includes(row.moderation as ReviewStatus)) counts[row.moderation as ReviewStatus] = row._count._all;
      counts.all += row._count._all;
    }
    return { items: rows.map((row) => this.toAdminView(row)), page, pageSize, total, counts };
  }

  async pendingCount(): Promise<number> {
    return this.prisma.review.count({ where: { moderation: 'pending', isDemo: false } });
  }

  /** Stays for the filter and the "ask for a review" tool. */
  async stays(): Promise<Array<{ contentId: string; name: string; slug: string | null; path: string | null; ratingAverage: number | null; ratingCount: number; pending: number }>> {
    const rows = await this.prisma.contentNode.findMany({
      where: { kind: 'stay', isDemo: false, property: { isNot: null } },
      orderBy: { title: 'asc' },
      select: {
        id: true, title: true, slugSource: true, publicationStatus: true,
        routes: { where: { isCurrent: true }, take: 1, select: { path: true } },
        property: { select: { ratingAverage: true, ratingCount: true } },
        _count: { select: { reviews: { where: { moderation: 'pending', isDemo: false } } } },
      },
    });
    return rows.map((row) => ({
      contentId: row.id,
      name: row.title,
      slug: row.slugSource,
      path: row.publicationStatus === 'published' ? row.routes[0]?.path ?? (row.slugSource ? `/phong-nghi/${row.slugSource}` : null) : null,
      ratingAverage: row.property?.ratingAverage === null || row.property?.ratingAverage === undefined ? null : Number(row.property.ratingAverage),
      ratingCount: row.property?.ratingCount ?? 0,
      pending: row._count.reviews,
    }));
  }

  async detail(id: string): Promise<AdminReviewView> {
    const row = await this.prisma.review.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    if (!row || row.isDemo) throw new NotFoundException('Không tìm thấy đánh giá');
    return this.toAdminView(row);
  }

  async approve(id: string, user: AuthenticatedUser): Promise<AdminReviewView> {
    await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      const mediaIds = (await tx.reviewMedia.findMany({ where: { reviewId: id }, select: { mediaId: true } })).map((link) => link.mediaId);
      if (mediaIds.length) await tx.mediaAsset.updateMany({ where: { id: { in: mediaIds } }, data: { visibility: 'public' } });
      await tx.review.update({ where: { id }, data: {
        moderation: 'approved', rejectReason: null, moderatedAt: new Date(), moderatedById: user.id, version: { increment: 1 },
      } });
      await this.audit(tx, user.id, 'review.approve', id, { from: row.moderation, photos: mediaIds.length });
      await this.recompute(tx, row.contentId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.detail(id);
  }

  async reject(id: string, reason: unknown, user: AuthenticatedUser): Promise<AdminReviewView> {
    if (!REJECT_REASONS.includes(reason as RejectReason)) throw new BadRequestException('Chọn lý do từ chối hợp lệ');
    await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      const mediaIds = (await tx.reviewMedia.findMany({ where: { reviewId: id }, select: { mediaId: true } })).map((link) => link.mediaId);
      if (mediaIds.length) await tx.mediaAsset.updateMany({ where: { id: { in: mediaIds } }, data: { visibility: 'private' } });
      await tx.review.update({ where: { id }, data: {
        moderation: 'rejected', rejectReason: reason as string, moderatedAt: new Date(), moderatedById: user.id, version: { increment: 1 },
      } });
      await this.audit(tx, user.id, 'review.reject', id, { from: row.moderation, reason });
      await this.recompute(tx, row.contentId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.detail(id);
  }

  async removePhoto(id: string, mediaId: string, user: AuthenticatedUser): Promise<AdminReviewView> {
    const link = await this.prisma.reviewMedia.findUnique({ where: { reviewId_mediaId: { reviewId: id, mediaId } } });
    if (!link) throw new NotFoundException('Ảnh không thuộc đánh giá này');
    await this.prisma.$transaction(async (tx) => {
      await tx.reviewMedia.delete({ where: { reviewId_mediaId: { reviewId: id, mediaId } } });
      await this.audit(tx, user.id, 'review.photo.remove', id, { mediaId });
    });
    await this.media.remove(mediaId, user.id).catch((error: unknown) => this.logger.warn(`Review photo ${mediaId} kept: ${String(error)}`));
    return this.detail(id);
  }

  async reply(id: string, text: unknown, user: AuthenticatedUser): Promise<AdminReviewView> {
    const reply = typeof text === 'string' ? text.replace(/\r\n?/g, '\n').trim().slice(0, 1500) : '';
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, id);
      await tx.review.update({ where: { id }, data: reply
        ? { ownerReply: reply, ownerReplyAt: new Date(), ownerReplyById: user.id, version: { increment: 1 } }
        : { ownerReply: null, ownerReplyAt: null, ownerReplyById: null, version: { increment: 1 } } });
      await this.audit(tx, user.id, reply ? 'review.reply' : 'review.reply.remove', id, { length: reply.length });
    });
    return this.detail(id);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ ok: true }> {
    const mediaIds = await this.prisma.$transaction(async (tx) => {
      const row = await this.lock(tx, id);
      const links = await tx.reviewMedia.findMany({ where: { reviewId: id }, select: { mediaId: true } });
      await tx.review.delete({ where: { id } });
      await this.audit(tx, user.id, 'review.delete', id, { contentId: row.contentId, moderation: row.moderation });
      await this.recompute(tx, row.contentId);
      return links.map((link) => link.mediaId);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    for (const mediaId of mediaIds) await this.media.remove(mediaId, user.id).catch(() => undefined);
    return { ok: true };
  }

  /** Writes the approved average and count onto the property the review belongs to. */
  private async recompute(tx: Prisma.TransactionClient, contentId: string): Promise<void> {
    const approved = await tx.review.findMany({ where: { contentId, moderation: 'approved', isDemo: false }, select: { rating: true } });
    const summary = ratingSummary(approved.map((row) => row.rating));
    await tx.property.updateMany({
      where: { contentId },
      data: { ratingAverage: summary.average === null ? null : new Prisma.Decimal(summary.average.toFixed(2)), ratingCount: summary.count },
    });
  }

  private async lock(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.review.findUnique({ where: { id }, select: { id: true, contentId: true, moderation: true, isDemo: true } });
    if (!row || row.isDemo) throw new NotFoundException('Không tìm thấy đánh giá');
    return row;
  }

  private audit(tx: Prisma.TransactionClient, actorId: string, action: string, id: string, diff: Record<string, unknown>) {
    return tx.auditLog.create({ data: { actorId, action, entityType: 'review', entityId: id, diff: diff as Prisma.InputJsonObject } });
  }

  private toAdminView(row: AdminRow): AdminReviewView {
    return {
      id: row.id,
      rating: row.rating,
      body: row.body,
      authorName: row.authorName,
      phone: row.reviewerPhone,
      stay: { contentId: row.content.id, name: row.content.title, path: row.content.routes[0]?.path ?? null },
      stayedAt: row.stayedAt?.toISOString().slice(0, 7) ?? null,
      source: row.source,
      verified: row.isVerified,
      status: row.moderation as ReviewStatus,
      rejectReason: row.rejectReason,
      moderatedAt: row.moderatedAt?.toISOString() ?? null,
      moderatedBy: row.moderatedBy?.fullName ?? null,
      ownerReply: row.ownerReply,
      ownerReplyAt: row.ownerReplyAt?.toISOString() ?? null,
      photos: row.media.map((link) => ({
        id: link.media.id, src: `/media/${link.media.storageKey}`, width: link.media.width, height: link.media.height, visibility: link.media.visibility,
      })),
      createdAt: row.createdAt.toISOString(),
      version: row.version,
    };
  }
}
