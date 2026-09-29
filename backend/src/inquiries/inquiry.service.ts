import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Paginated } from '../common/types';
import type { CreateInquiryDto, ListInquiriesQuery } from './dto/inquiry.dto';

export interface InquiryView {
  id: string;
  customerId: string;
  customer: { name: string; phone: string | null; email: string | null };
  source: string;
  intent: string | null;
  relatedContentId: string | null;
  relatedContentTitle: string | null;
  relatedRoomTypeId: string | null;
  relatedRoomName: string | null;
  desiredCheckIn: string | null;
  desiredCheckOut: string | null;
  adults: number;
  children: number;
  requestedRooms: number | null;
  message: string | null;
  stage: string;
  priority: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

const INQUIRY_INCLUDE = {
  customer: { select: { fullName: true, phone: true, email: true } },
  roomType: { select: { name: true } },
} as const;
const INQUIRY_OPERATION = 'public.inquiry.create';
type InquiryReceipt = { id: string; status: 'received'; createdAt: string };

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84')) return `0${digits.slice(2)}`;
  return digits;
};

@Injectable()
export class InquiryService {
  constructor(private readonly prisma: PrismaService) {}

  async createPublic(dto: CreateInquiryDto, key: string, principalScope: string): Promise<InquiryReceipt> {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,160}$/.test(key)) {
      throw new BadRequestException('Thiếu Idempotency-Key hợp lệ');
    }
    const phone = dto.phone.trim();
    const phoneNormalized = normalizePhone(phone);
    if (phoneNormalized.length < 9) throw new BadRequestException('Số điện thoại không hợp lệ');
    if (dto.checkIn && dto.checkOut && dto.checkOut <= dto.checkIn) {
      throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng');
    }
    if (dto.relatedSlug && !dto.intent) throw new BadRequestException('Cần loại nội dung cho mục quan tâm');
    if (dto.roomTypeId && (dto.intent !== 'stay' || !dto.relatedSlug)) {
      throw new BadRequestException('Hạng phòng tư vấn cần thuộc một nơi lưu trú cụ thể');
    }
    const requestHash = createHash('sha256').update(JSON.stringify(dto)).digest('hex');
    const where = { principalScope_operation_key: { principalScope, operation: INQUIRY_OPERATION, key } };
    const replay = async (): Promise<InquiryReceipt | null> => {
      const prior = await this.prisma.idempotencyKey.findUnique({ where });
      if (!prior) return null;
      if (prior.requestHash !== requestHash) throw new ConflictException('Yêu cầu này đã được gửi với nội dung khác');
      if (prior.responseSnapshot === null) throw new ConflictException('Yêu cầu đang được xử lý; vui lòng thử lại');
      return prior.responseSnapshot as InquiryReceipt;
    };
    const previous = await replay();
    if (previous) return previous;

    const related = dto.relatedSlug
      ? await this.prisma.contentNode.findFirst({
          where: {
            slugSource: dto.relatedSlug, kind: dto.intent, publicationStatus: 'published', isDemo: false,
            OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
          },
          select: { id: true, property: { select: { id: true } } },
        })
      : null;
    if (dto.relatedSlug && !related) throw new BadRequestException('Mục quan tâm không còn công khai; hãy gửi yêu cầu tư vấn chung');
    const room = dto.roomTypeId && related?.property?.id
      ? await this.prisma.roomType.findFirst({
          where: {
            id: dto.roomTypeId, propertyId: related.property.id, status: 'active', capacityVerified: true,
            units: { some: { active: true } },
            ratePlans: { some: { active: true, baseRateVnd: { gte: 0n } } },
          },
          select: { id: true },
        })
      : null;
    if (dto.roomTypeId && !room) throw new BadRequestException('Hạng phòng không còn công khai hoặc không thuộc nơi lưu trú đã chọn');

    try {
      return await this.prisma.$transaction(async (tx) => {
        const prior = await tx.idempotencyKey.findUnique({ where });
        if (prior) {
          if (prior.requestHash !== requestHash) throw new ConflictException('Yêu cầu này đã được gửi với nội dung khác');
          if (prior.responseSnapshot === null) throw new ConflictException('Yêu cầu đang được xử lý; vui lòng thử lại');
          return prior.responseSnapshot as InquiryReceipt;
        }
        const reservation = await tx.idempotencyKey.create({ data: {
          principalScope, operation: INQUIRY_OPERATION, key, requestHash,
          expiresAt: new Date(Date.now() + 7 * 86_400_000),
        } });
        const existing = await tx.customer.findFirst({
          where: {
            OR: [
              { phoneNormalized },
              ...(dto.email ? [{ emailNormalized: dto.email.trim().toLowerCase() }] : []),
            ],
          },
        });
        const customer = existing
          ? await tx.customer.update({
              where: { id: existing.id },
              data: {
                fullName: dto.name.trim(),
                phone,
                phoneNormalized,
                email: dto.email?.trim().toLowerCase() ?? existing.email,
                emailNormalized: dto.email?.trim().toLowerCase() ?? existing.emailNormalized,
                need: dto.message?.trim() || existing.need,
                version: { increment: 1 },
              },
            })
          : await tx.customer.create({
              data: {
                fullName: dto.name.trim(),
                phone,
                phoneNormalized,
                email: dto.email?.trim().toLowerCase() ?? null,
                emailNormalized: dto.email?.trim().toLowerCase() ?? null,
                source: 'website',
                groupKind: 'family',
                need: dto.message?.trim() || null,
              },
            });

        const inquiry = await tx.inquiry.create({
          data: {
            customerId: customer.id,
            source: 'website',
            intent: dto.intent ?? null,
            relatedContentId: related?.id ?? null,
            relatedRoomTypeId: room?.id ?? null,
            desiredCheckIn: dto.checkIn ? new Date(`${dto.checkIn}T00:00:00.000Z`) : null,
            desiredCheckOut: dto.checkOut ? new Date(`${dto.checkOut}T00:00:00.000Z`) : null,
            adults: dto.adults ?? 2,
            children: dto.children ?? 0,
            requestedRooms: dto.rooms ?? null,
            message: dto.message?.trim() || null,
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'inquiry.create',
            entityType: 'inquiry',
            entityId: inquiry.id,
            diff: { source: 'website', intent: dto.intent ?? null, relatedContentId: related?.id ?? null, relatedRoomTypeId: room?.id ?? null } as object,
          },
        });
        const result: InquiryReceipt = { id: inquiry.id, status: 'received', createdAt: inquiry.createdAt.toISOString() };
        await tx.idempotencyKey.update({ where: { id: reservation.id }, data: { responseSnapshot: result } });
        return result;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const previous = await replay();
        if (previous) return previous;
      }
      throw error;
    }
  }

  async list(query: ListInquiriesQuery): Promise<Paginated<InquiryView>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const where = {
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.search
        ? {
            customer: {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' as const } },
                { phone: { contains: query.search, mode: 'insensitive' as const } },
                { email: { contains: query.search, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.inquiry.findMany({ where, include: INQUIRY_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.inquiry.count({ where }),
    ]);
    const titles = await this.relatedTitles(rows);
    return { items: rows.map((row) => this.toView(row, titles)), page, pageSize, total };
  }

  async updateStage(id: string, stage: string, expectedVersion: number | undefined, userId: string): Promise<InquiryView> {
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const current = await tx.inquiry.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Không tìm thấy yêu cầu tư vấn');
        if (expectedVersion !== undefined && expectedVersion !== current.version) {
          throw new ConflictException({ code: 'version_conflict', currentVersion: current.version });
        }
        const changed = await tx.inquiry.updateMany({
          where: { id, version: current.version },
          data: { stage, resolvedAt: stage === 'won' || stage === 'lost' ? new Date() : null, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw new ConflictException({ code: 'version_conflict' });
        const row = await tx.inquiry.findUniqueOrThrow({ where: { id }, include: INQUIRY_INCLUDE });
        await tx.inquiryStageHistory.create({ data: { inquiryId: id, fromStage: current.stage, toStage: stage, actorId: userId } });
        await tx.auditLog.create({ data: { actorId: userId, action: 'inquiry.stage', entityType: 'inquiry', entityId: id, diff: { from: current.stage, to: stage } as object } });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.toView(updated, await this.relatedTitles([updated]));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConflictException({ code: 'version_conflict', message: 'Yêu cầu vừa được cập nhật, hãy tải lại.' });
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException({ code: 'version_conflict', message: 'Yêu cầu vừa được cập nhật, hãy tải lại.' });
      }
      throw error;
    }
  }

  private async relatedTitles(rows: readonly { relatedContentId: string | null }[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.map((row) => row.relatedContentId).filter((id): id is string => !!id))];
    if (!ids.length) return new Map();
    const content = await this.prisma.contentNode.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
    return new Map(content.map((item) => [item.id, item.title]));
  }

  private toView(row: {
    id: string;
    customerId: string;
    source: string;
    intent: string | null;
    relatedContentId: string | null;
    relatedRoomTypeId: string | null;
    desiredCheckIn: Date | null;
    desiredCheckOut: Date | null;
    adults: number;
    children: number;
    requestedRooms: number | null;
    message: string | null;
    stage: string;
    priority: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    customer: { fullName: string; phone: string | null; email: string | null };
    roomType: { name: string } | null;
  }, titles: Map<string, string>): InquiryView {
    return {
      id: row.id,
      customerId: row.customerId,
      customer: { name: row.customer.fullName, phone: row.customer.phone, email: row.customer.email },
      source: row.source,
      intent: row.intent,
      relatedContentId: row.relatedContentId,
      relatedContentTitle: row.relatedContentId ? titles.get(row.relatedContentId) ?? null : null,
      relatedRoomTypeId: row.relatedRoomTypeId,
      relatedRoomName: row.roomType?.name ?? null,
      desiredCheckIn: row.desiredCheckIn?.toISOString().slice(0, 10) ?? null,
      desiredCheckOut: row.desiredCheckOut?.toISOString().slice(0, 10) ?? null,
      adults: row.adults,
      children: row.children,
      requestedRooms: row.requestedRooms,
      message: row.message,
      stage: row.stage,
      priority: row.priority,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
