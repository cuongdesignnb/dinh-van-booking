import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { documentMediaIds, sanitizeDocument } from '../content/document';
import { pathForContent, uniqueSlug } from '../content/slug';
import { resolveUpdatedSlug, switchCurrentRoute } from '../content/slug-routes';
import type { CreatePropertyDto, CreateRoomDto, DeletePropertyQuery, UpdatePropertyDto, UpdateRoomDto } from './dto/property.dto';
import { ROOM_AMENITIES, ROOM_AMENITY_CODES } from './room-amenities';

function documentToText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(documentToText).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  const node = value as { text?: unknown; content?: unknown };
  return [node.text, documentToText(node.content)]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');
}

function roomNameKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function paragraphDocument(text: string): object {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

const PROPERTY_INCLUDE = {
  content: {
    include: {
      routes: { where: { isCurrent: true }, take: 1 },
      media: {
        where: { media: { isDemo: false, visibility: 'public', processingStatus: 'ready' } },
        include: { media: { select: { storageKey: true, altText: true, originalFilename: true } } },
        orderBy: { position: 'asc' as const },
      },
    },
  },
  roomTypes: {
    orderBy: { position: 'asc' as const },
    include: {
      amenities: { include: { amenity: { select: { code: true, label: true } } } },
      units: { select: { id: true, code: true, label: true, active: true } },
      ratePlans: { where: { active: true }, orderBy: { createdAt: 'asc' as const } },
    },
  },
} as const;

type PropertyRow = {
  id: string;
  contentId: string;
  code: string;
  kind: string;
  area: string;
  address: string;
  operatingStatus: string;
  checkInTime: string;
  checkOutTime: string;
  version: number;
  updatedAt: Date;
  content: {
    title: string;
    slugSource: string | null;
    bodyDocument: unknown;
    metaTitle: string | null;
    metaDescription: string | null;
    noindex: boolean;
    version: number;
    publicationStatus: string;
    publishAt: Date | null;
    excerpt: string | null;
    featured: boolean;
    routes: Array<{ path: string }>;
    media: Array<{ mediaId: string; role: string; position: number; media: { storageKey: string; altText: string | null; originalFilename: string } }>;
  };
  roomTypes: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    unitKind: string | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
    maxAdults: number;
    maxChildren: number;
    maxOccupancy: number;
    capacityVerified: boolean;
    bedSummary: string | null;
    areaSqm: number | null;
    status: string;
    version: number;
    amenities: Array<{ amenity: { code: string; label: string } }>;
    units: Array<{ id: string; code: string; label: string; active: boolean }>;
    ratePlans: Array<{
      id: string;
      code: string;
      name: string;
      baseRateVnd: bigint;
      weekendRateVnd: bigint | null;
      breakfastIncluded: boolean;
      depositBps: number;
    }>;
  }>;
};

export interface PropertyView {
  id: string;
  contentId: string;
  title: string;
  description: string;
  descriptionDocument: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  contentVersion: number;
  slug: string | null;
  path: string | null;
  excerpt: string | null;
  code: string;
  kind: string;
  area: string;
  address: string;
  operatingStatus: string;
  publicationStatus: string;
  publishAt: string | null;
  featured: boolean;
  version: number;
  updatedAt: string;
  cover: { mediaId: string; url: string; alt: string } | null;
  gallery: Array<{ mediaId: string; url: string; alt: string }>;
  roomTypes: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    unitKind: string | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
    maxAdults: number | null;
    maxChildren: number | null;
    maxOccupancy: number | null;
    capacityVerified: boolean;
    bedSummary: string | null;
    areaSqm: number | null;
    unitCount: number;
    status: string;
    version: number;
    amenities: Array<{ code: string; label: string }>;
    gallery: Array<{ mediaId: string; url: string; alt: string }>;
    rate: {
      id: string;
      code: string;
      name: string;
      baseRateVnd: number;
      weekendRateVnd: number | null;
      breakfastIncluded: boolean;
      depositBps: number;
    } | null;
  }>;
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async list(): Promise<{ items: PropertyView[] }> {
    const rows = await this.prisma.property.findMany({
      include: PROPERTY_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return { items: rows.map((row) => this.toView(row as unknown as PropertyRow)) };
  }

  async getOne(id: string): Promise<PropertyView> {
    const row = await this.prisma.property.findUnique({ where: { id }, include: PROPERTY_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy nơi lưu trú');
    return this.toView(row as unknown as PropertyRow);
  }

  async create(input: CreatePropertyDto, userId: string): Promise<PropertyView> {
    const title = input.title.trim();
    const code = input.code.trim().toUpperCase();
    const kind = input.kind.trim();
    const area = input.area.trim();
    const address = input.address.trim();
    const description = input.description?.trim() || `Thông tin đang được cập nhật cho ${title}.`;
    if (!title || !code || !kind || !area || !address) {
      throw new BadRequestException('Vui lòng điền đủ thông tin nơi lưu trú');
    }
    // Older API clients may still create a verified first room together with
    // the property. A property-only draft must never invent a generic room.
    const roomFieldsProvided = [input.roomCode, input.roomName, input.roomDescription, input.maxAdults,
      input.maxChildren, input.bedSummary, input.areaSqm, input.unitCount, input.rateCode,
      input.rateName, input.rateVnd, input.weekendRateVnd, input.breakfastIncluded,
      input.roomGalleryMediaIds].some((value) => value !== undefined);
    const roomCode = input.roomCode?.trim().toUpperCase() ?? '';
    const roomName = input.roomName?.trim() ?? '';
    if (roomFieldsProvided && (!roomCode || !roomName || input.maxAdults === undefined
      || input.unitCount === undefined || input.rateVnd === undefined)) {
      throw new BadRequestException('Hạng phòng đầu tiên cần đủ mã, tên, sức chứa, số phòng và giá; hoặc tạo nơi lưu trú trước rồi thêm từng hạng riêng');
    }
    const initialRoom = roomFieldsProvided ? {
      code: roomCode,
      name: roomName,
      maxAdults: input.maxAdults!,
      maxChildren: input.maxChildren ?? 0,
      unitCount: input.unitCount!,
      rateVnd: input.rateVnd!,
      rateCode: input.rateCode?.trim().toUpperCase() || 'BAR',
      rateName: input.rateName?.trim() || 'Giá tiêu chuẩn',
    } : null;

    const slug = await this.reserveSlug(input.slug?.trim() || title);
    const body = input.descriptionDocument === undefined
      ? paragraphDocument(description)
      : await this.cleanDescriptionDocument(input.descriptionDocument);
    const bodyText = documentToText(body);
    const excerpt = input.excerpt?.trim() || (bodyText || description).slice(0, 500);

    try {
      const propertyId = await this.prisma.$transaction(async (tx) => {
        if (input.coverMediaId) {
          const media = await tx.mediaAsset.findUnique({
            where: { id: input.coverMediaId },
            select: { id: true, isDemo: true, visibility: true, processingStatus: true },
          });
          if (!media || media.isDemo || media.visibility !== 'public' || media.processingStatus !== 'ready') {
            throw new BadRequestException('Ảnh đại diện không tồn tại hoặc chưa sẵn sàng');
          }
        }
        await this.assertGalleryMedia(tx, [...(input.galleryMediaIds ?? []), ...(input.roomGalleryMediaIds ?? [])]);

        const node = await tx.contentNode.create({
          data: {
            kind: 'stay',
            title,
            slugSource: slug,
            excerpt,
            bodyDocument: body,
            metaTitle: input.metaTitle?.trim() || title,
            metaDescription: input.metaDescription?.trim() || excerpt.slice(0, 320),
            featured: input.featured ?? false,
            publicationStatus: 'draft',
            isDemo: false,
          },
        });

        await tx.publicRoute.create({ data: { contentId: node.id, path: pathForContent('stay', slug), redirectStatus: 308 } });
        await tx.contentRevision.create({
          data: { contentId: node.id, documentSnapshot: body, note: 'Tạo nơi lưu trú mới', authorId: userId },
        });

        await this.attachInlineMedia(tx, node.id, body, input.coverMediaId);

        const property = await tx.property.create({
          data: {
            contentId: node.id,
            code,
            kind,
            area,
            address,
            operatingStatus: initialRoom ? 'active' : 'pending_verification',
          },
        });

        if (initialRoom) {
          const roomType = await tx.roomType.create({
            data: {
              propertyId: property.id,
              code: initialRoom.code,
              name: initialRoom.name,
              description: input.roomDescription?.trim() || null,
              maxAdults: initialRoom.maxAdults,
              maxChildren: initialRoom.maxChildren,
              maxOccupancy: initialRoom.maxAdults + initialRoom.maxChildren,
              capacityVerified: true,
              bedSummary: input.bedSummary?.trim() || null,
              areaSqm: input.areaSqm ?? null,
              status: 'active',
              position: 0,
            },
          });

          await tx.ratePlan.create({
            data: {
              roomTypeId: roomType.id,
              code: initialRoom.rateCode,
              name: initialRoom.rateName,
              baseRateVnd: BigInt(initialRoom.rateVnd),
              weekendRateVnd: input.weekendRateVnd === undefined ? null : BigInt(input.weekendRateVnd),
              breakfastIncluded: input.breakfastIncluded ?? false,
              // Payment/hold is not wired to the public checkout yet.
              depositBps: 0,
              active: true,
            },
          });

          await tx.roomUnit.createMany({
            data: Array.from({ length: initialRoom.unitCount }, (_, index) => {
              const suffix = String(index + 1).padStart(2, '0');
              return { roomTypeId: roomType.id, code: `${initialRoom.code}-${suffix}`, label: `${initialRoom.name} ${index + 1}`, active: true };
            }),
          });
          await this.replaceGallery(tx, node.id, `room:${roomType.id}`, input.roomGalleryMediaIds ?? []);
        }

        if (input.coverMediaId) {
          await tx.contentMedia.create({
            data: { contentId: node.id, mediaId: input.coverMediaId, role: 'cover', position: 0 },
          });
        }
        await this.replaceGallery(tx, node.id, 'gallery', input.galleryMediaIds ?? []);

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'property.create',
            entityType: 'property',
            entityId: property.id,
            diff: { contentId: node.id, code, slug, roomCode: initialRoom?.code ?? null, unitCount: initialRoom?.unitCount ?? null } as object,
          },
        });
        return property.id;
      });

      return this.getOne(propertyId);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (this.isUniqueViolation(error)) throw new ConflictException('Mã nơi lưu trú, mã phòng hoặc đường dẫn đã tồn tại');
      throw error;
    }
  }

  async update(id: string, input: UpdatePropertyDto, userId: string): Promise<PropertyView> {
    const current = await this.prisma.property.findUnique({
      where: { id },
      select: {
        id: true,
        contentId: true,
        code: true,
        version: true,
        kind: true,
        area: true,
        address: true,
        operatingStatus: true,
        content: {
          select: {
            id: true,
            kind: true,
            title: true,
            slugSource: true,
            excerpt: true,
            bodyDocument: true,
            metaTitle: true,
            metaDescription: true,
            noindex: true,
            featured: true,
            version: true,
            publicationStatus: true,
          },
        },
      },
    });
    if (!current) throw new NotFoundException('Không tìm thấy nơi lưu trú');
    if (input.expectedVersion !== current.version || input.expectedContentVersion !== current.content.version) {
      throw new ConflictException({
        code: 'version_conflict',
        message: 'Nơi lưu trú đã được người khác sửa. Tải lại rồi lưu lại.',
        currentVersion: current.version,
        currentContentVersion: current.content.version,
      });
    }

    const title = input.title === undefined ? current.content.title : input.title.trim();
    const kind = input.kind === undefined ? current.kind : input.kind.trim();
    const area = input.area === undefined ? current.area : input.area.trim();
    const address = input.address === undefined ? current.address : input.address.trim();
    if (!title || !kind || !area || !address) {
      throw new BadRequestException('Tên, loại hình, khu vực và địa chỉ không được để trống');
    }

    const description = input.description === undefined ? undefined : input.description.trim();
    const body = input.descriptionDocument !== undefined
      ? await this.cleanDescriptionDocument(input.descriptionDocument)
      : description === undefined
        ? undefined
        : paragraphDocument(description);
    const bodyText = body === undefined ? undefined : documentToText(body);
    const nextDescription = description ?? bodyText;
    const nextSlug = resolveUpdatedSlug(current.content.slugSource ?? '', input.slug);

    try {
      await this.prisma.$transaction(async (tx) => {
        if (input.coverMediaId !== undefined && input.coverMediaId !== null) {
          const media = await tx.mediaAsset.findUnique({
            where: { id: input.coverMediaId },
            select: { id: true, isDemo: true, visibility: true, processingStatus: true },
          });
          if (!media || media.isDemo || media.visibility !== 'public' || media.processingStatus !== 'ready') {
            throw new BadRequestException('Ảnh đại diện không tồn tại hoặc chưa sẵn sàng');
          }
        }
        const roomGalleries = input.roomGalleries ?? [];
        const ownedRooms = await tx.roomType.findMany({ where: { propertyId: id, id: { in: roomGalleries.map((item) => item.roomTypeId) } }, select: { id: true } });
        if (ownedRooms.length !== roomGalleries.length || new Set(roomGalleries.map((item) => item.roomTypeId)).size !== roomGalleries.length) {
          throw new BadRequestException('Album hạng phòng không thuộc nơi lưu trú này');
        }
        await this.assertGalleryMedia(tx, [...(input.galleryMediaIds ?? []), ...roomGalleries.flatMap((item) => item.mediaIds)]);

        if (nextSlug !== current.content.slugSource) {
          await switchCurrentRoute(tx, current.contentId, 'stay', nextSlug);
        }

        await tx.contentNode.update({
          where: { id: current.contentId },
          data: {
            title,
            slugSource: nextSlug !== current.content.slugSource ? nextSlug : undefined,
            excerpt:
              input.excerpt === undefined
                ? undefined
                : input.excerpt === null
                  ? nextDescription?.slice(0, 500) || null
                  : input.excerpt.trim() || nextDescription?.slice(0, 500) || null,
            bodyDocument: body === undefined ? undefined : body,
            metaTitle: input.metaTitle === undefined ? undefined : input.metaTitle?.trim() || null,
            metaDescription: input.metaDescription === undefined ? undefined : input.metaDescription?.trim() || null,
            noindex: input.noindex ?? undefined,
            featured: input.featured ?? undefined,
            version: { increment: 1 },
          },
        });

        await tx.property.update({
          where: { id },
          data: {
            kind,
            area,
            address,
            operatingStatus: input.operatingStatus ?? undefined,
            version: { increment: 1 },
          },
        });

        if (input.coverMediaId !== undefined) {
          await tx.contentMedia.deleteMany({ where: { contentId: current.contentId, role: 'cover' } });
          if (input.coverMediaId) {
            await tx.contentMedia.create({
              data: { contentId: current.contentId, mediaId: input.coverMediaId, role: 'cover', position: 0 },
            });
          }
        }
        if (input.galleryMediaIds !== undefined) await this.replaceGallery(tx, current.contentId, 'gallery', input.galleryMediaIds);
        for (const gallery of roomGalleries) await this.replaceGallery(tx, current.contentId, `room:${gallery.roomTypeId}`, gallery.mediaIds);

        if (body !== undefined) {
          await this.attachInlineMedia(tx, current.contentId, body, input.coverMediaId ?? null);
        }

        if (body !== undefined) {
          await tx.contentRevision.create({
            data: {
              contentId: current.contentId,
              documentSnapshot: body,
              note: 'Cập nhật nơi lưu trú',
              authorId: userId,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'property.update',
            entityType: 'property',
            entityId: id,
            diff: {
              contentId: current.contentId,
              code: current.code,
              fields: Object.keys(input).filter((field) => !field.startsWith('expected')),
              slug: nextSlug,
            } as object,
          },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      if (this.isUniqueViolation(error)) throw new ConflictException('Mã nơi lưu trú hoặc đường dẫn đã tồn tại');
      throw error;
    }

    return this.getOne(id);
  }

  async createRoom(propertyId: string, input: CreateRoomDto, userId: string): Promise<PropertyView> {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, contentId: true, content: { select: { publicationStatus: true } } } });
    if (!property) throw new NotFoundException('Không tìm thấy nơi lưu trú');
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!code || !name) throw new BadRequestException('Cần mã và tên hạng phòng');
    if (input.weekendRateVnd !== undefined && input.rateVnd === undefined) {
      throw new BadRequestException('Cần giá ngày thường trước khi đặt giá cuối tuần');
    }
    const status = input.status ?? 'inactive';
    const capacityVerified = input.capacityVerified === true;
    if (capacityVerified && (input.maxAdults === undefined || input.maxChildren === undefined)) {
      throw new BadRequestException('Cần nhập sức chứa người lớn và trẻ em trước khi xác minh hạng phòng');
    }
    if (status === 'active' && !capacityVerified) {
      throw new BadRequestException('Hạng phòng đang hoạt động cần xác minh sức chứa');
    }
    if (status === 'active' && (!input.unitCount || input.rateVnd === undefined)) {
      throw new BadRequestException('Hạng phòng đang hoạt động cần số phòng và giá đã xác minh');
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const existingNames = await tx.roomType.findMany({ where: { propertyId }, select: { id: true, name: true } });
        if (existingNames.some((room) => roomNameKey(room.name) === roomNameKey(name))) {
          throw new ConflictException('Hạng phòng này đã có trong nơi lưu trú. Hãy mở hạng hiện có để chỉnh sửa.');
        }
        await this.assertGalleryMedia(tx, input.galleryMediaIds ?? []);
        const room = await tx.roomType.create({ data: {
          propertyId, code, name, description: input.description?.trim() || null,
          unitKind: input.unitKind ?? null, bedroomCount: input.bedroomCount ?? null,
          bathroomCount: input.bathroomCount ?? null,
          maxAdults: input.maxAdults ?? 1, maxChildren: input.maxChildren ?? 0,
          maxOccupancy: (input.maxAdults ?? 1) + (input.maxChildren ?? 0), capacityVerified,
          bedSummary: input.bedSummary?.trim() || null, areaSqm: input.areaSqm ?? null,
          position: await tx.roomType.count({ where: { propertyId } }), status,
        } });
        if (input.unitCount) {
          await tx.roomUnit.createMany({ data: Array.from({ length: input.unitCount }, (_, index) => ({
            roomTypeId: room.id, code: `${code}-${String(index + 1).padStart(2, '0')}`, label: `${name} ${index + 1}`, active: true,
          })) });
        }
        if (input.rateVnd !== undefined) {
          await tx.ratePlan.create({ data: { roomTypeId: room.id, code: 'BAR', name: 'Giá tiêu chuẩn', baseRateVnd: BigInt(input.rateVnd), weekendRateVnd: input.weekendRateVnd === undefined ? null : BigInt(input.weekendRateVnd), breakfastIncluded: input.breakfastIncluded ?? false, depositBps: 0, active: true } });
        }
        if (input.amenityCodes?.length) await this.replaceRoomAmenities(tx, room.id, input.amenityCodes);
        await this.replaceGallery(tx, property.contentId, `room:${room.id}`, input.galleryMediaIds ?? []);
        await tx.contentNode.update({ where: { id: property.contentId }, data: { version: { increment: 1 }, lastPublicChangedAt: property.content.publicationStatus === 'published' ? new Date() : undefined } });
        await tx.auditLog.create({ data: { actorId: userId, action: 'room.create', entityType: 'content_node', entityId: property.contentId, diff: { roomName: name, roomCode: code } as object } });
      });
      return this.getOne(propertyId);
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Mã hạng phòng đã tồn tại trong nơi lưu trú này');
      throw error;
    }
  }

  async updateRoom(propertyId: string, roomId: string, input: UpdateRoomDto, userId: string): Promise<PropertyView> {
    const room = await this.prisma.roomType.findUnique({ where: { id: roomId }, include: { property: { select: { contentId: true, content: { select: { publicationStatus: true } } } }, ratePlans: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 } } });
    if (!room || room.propertyId !== propertyId) throw new NotFoundException('Không tìm thấy hạng phòng');
    if (room.version !== input.expectedVersion) throw new ConflictException('Hạng phòng đã được người khác sửa. Tải lại rồi lưu lại.');
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Tên hạng phòng không được để trống');
    if (input.rateVnd === undefined && input.weekendRateVnd !== undefined) {
      throw new BadRequestException('Cần giá ngày thường trước khi đặt giá cuối tuần');
    }
    const capacityVerified = input.capacityVerified ?? room.capacityVerified;
    if (input.capacityVerified === true && !room.capacityVerified
      && (input.maxAdults === undefined || input.maxChildren === undefined)) {
      throw new BadRequestException('Cần nhập sức chứa người lớn và trẻ em trước khi xác minh hạng phòng');
    }
    if (input.status === 'active' && !capacityVerified) {
      throw new BadRequestException('Hạng phòng đang hoạt động cần xác minh sức chứa');
    }
    const maxAdults = input.maxAdults ?? room.maxAdults;
    const maxChildren = input.maxChildren ?? room.maxChildren;
    await this.prisma.$transaction(async (tx) => {
      const existingNames = await tx.roomType.findMany({ where: { propertyId }, select: { id: true, name: true } });
      if (existingNames.some((candidate) => candidate.id !== roomId && roomNameKey(candidate.name) === roomNameKey(name))) {
        throw new ConflictException('Tên hạng phòng đã có trong nơi lưu trú này. Hãy chọn tên khác hoặc sửa hạng hiện có.');
      }
      await this.assertGalleryMedia(tx, input.galleryMediaIds ?? []);
      const existingUnits = input.unitCount === undefined && input.status !== 'active' ? [] : await tx.roomUnit.findMany({
        where: { roomTypeId: roomId }, select: { code: true, active: true },
      });
      const activeUnitCount = existingUnits.filter((unit) => unit.active).length;
      if (input.status === 'active' && (!(input.unitCount ?? activeUnitCount) || (input.rateVnd === undefined && !room.ratePlans[0]))) {
        throw new BadRequestException('Hạng phòng đang hoạt động cần số phòng và giá đã xác minh');
      }
      if (input.unitCount !== undefined && input.unitCount < activeUnitCount) {
        throw new ConflictException('Không thể giảm số phòng tại đây vì có thể ảnh hưởng tồn và đơn đặt. Hãy kiểm tra Quỹ phòng.');
      }
      const changed = await tx.roomType.updateMany({ where: { id: roomId, version: input.expectedVersion }, data: {
        name, description: input.description?.trim() || null, maxAdults, maxChildren,
        unitKind: input.unitKind === undefined ? room.unitKind : input.unitKind,
        bedroomCount: input.bedroomCount === undefined ? room.bedroomCount : input.bedroomCount,
        bathroomCount: input.bathroomCount === undefined ? room.bathroomCount : input.bathroomCount,
        maxOccupancy: maxAdults + maxChildren, capacityVerified, bedSummary: input.bedSummary?.trim() || null,
        areaSqm: input.areaSqm ?? null, status: input.status, version: { increment: 1 },
      } });
      if (changed.count !== 1) throw new ConflictException('Hạng phòng đã thay đổi. Vui lòng tải lại.');
      if (input.unitCount !== undefined && input.unitCount > activeUnitCount) {
        const usedCodes = new Set(existingUnits.map((unit) => unit.code));
        const newUnits: Array<{ roomTypeId: string; code: string; label: string; active: boolean }> = [];
        let suffix = 1;
        while (newUnits.length < input.unitCount - activeUnitCount) {
          const code = `${room.code}-${String(suffix).padStart(2, '0')}`;
          suffix += 1;
          if (usedCodes.has(code)) continue;
          usedCodes.add(code);
          newUnits.push({ roomTypeId: room.id, code, label: `${name} ${activeUnitCount + newUnits.length + 1}`, active: true });
        }
        await tx.roomUnit.createMany({ data: newUnits });
      }
      if (input.rateVnd !== undefined) {
        if (room.ratePlans[0]) {
          await tx.ratePlan.update({ where: { id: room.ratePlans[0].id }, data: { baseRateVnd: BigInt(input.rateVnd), weekendRateVnd: input.weekendRateVnd === undefined ? null : BigInt(input.weekendRateVnd), breakfastIncluded: input.breakfastIncluded ?? false, version: { increment: 1 } } });
        } else {
          await tx.ratePlan.create({ data: { roomTypeId: room.id, code: 'BAR', name: 'Giá tiêu chuẩn', baseRateVnd: BigInt(input.rateVnd), weekendRateVnd: input.weekendRateVnd === undefined ? null : BigInt(input.weekendRateVnd), breakfastIncluded: input.breakfastIncluded ?? false, depositBps: 0, active: true } });
        }
      }
      if (input.galleryMediaIds !== undefined) await this.replaceGallery(tx, room.property.contentId, `room:${roomId}`, input.galleryMediaIds);
      if (input.amenityCodes !== undefined) await this.replaceRoomAmenities(tx, roomId, input.amenityCodes);
      await tx.contentNode.update({ where: { id: room.property.contentId }, data: { version: { increment: 1 }, lastPublicChangedAt: room.property.content.publicationStatus === 'published' ? new Date() : undefined } });
      await tx.auditLog.create({ data: { actorId: userId, action: 'room.update', entityType: 'content_node', entityId: room.property.contentId, diff: { roomName: name, roomCode: room.code, status: input.status, capacityVerified } as object } });
    });
    return this.getOne(propertyId);
  }

  async remove(id: string, query: DeletePropertyQuery, userId: string): Promise<void> {
    const current = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true, code: true, contentId: true, version: true, content: { select: { publicationStatus: true } } },
    });
    if (!current) throw new NotFoundException('Không tìm thấy nơi lưu trú');
    if (query.expectedVersion !== current.version) {
      throw new ConflictException({
        code: 'version_conflict',
        message: 'Nơi lưu trú đã được người khác sửa. Tải lại rồi xoá lại.',
        currentVersion: current.version,
      });
    }
    if (current.content.publicationStatus === 'published') {
      throw new ConflictException('Không thể xoá nơi lưu trú đã xuất bản');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: 'property.delete',
            entityType: 'property',
            entityId: id,
            diff: { contentId: current.contentId, code: current.code } as object,
          },
        });
        // ContentNode owns the route, revisions, media links and typed
        // property relation, so deleting it removes the whole draft aggregate.
        await tx.contentNode.delete({ where: { id: current.contentId } });
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException('Không thể xoá vì nơi lưu trú đã có dữ liệu liên quan');
      }
      throw error;
    }
  }

  private async cleanDescriptionDocument(input: unknown): Promise<object> {
    const editor = await this.settings.get<{ allowedBlocks: string[] }>('content.editor');
    return sanitizeDocument(input, { allowedBlocks: editor.allowedBlocks });
  }

  private async assertGalleryMedia(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const found = await tx.mediaAsset.count({ where: { id: { in: unique }, isDemo: false, visibility: 'public', processingStatus: 'ready' } });
    if (found !== unique.length) throw new BadRequestException('Album có ảnh không tồn tại hoặc chưa sẵn sàng');
  }

  private async replaceGallery(tx: Prisma.TransactionClient, contentId: string, role: string, ids: string[]): Promise<void> {
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Một album không được chọn trùng ảnh');
    await tx.contentMedia.deleteMany({ where: { contentId, role } });
    if (ids.length) await tx.contentMedia.createMany({ data: ids.map((mediaId, position) => ({ contentId, mediaId, role, position })) });
  }

  private async replaceRoomAmenities(tx: Prisma.TransactionClient, roomTypeId: string, codes: string[]): Promise<void> {
    // Only replace the checkbox-managed room facilities. Preserve legacy/custom relations.
    await tx.roomTypeAmenity.deleteMany({ where: { roomTypeId, amenity: { code: { in: ROOM_AMENITY_CODES } } } });
    for (const code of new Set(codes)) {
      const index = ROOM_AMENITIES.findIndex((item) => item.code === code);
      if (index < 0) throw new BadRequestException(`Tiện nghi hạng phòng không hợp lệ: ${code}`);
      const selected = ROOM_AMENITIES[index];
      const amenity = await tx.amenity.upsert({
        where: { code },
        create: { code, label: selected.label, iconKey: 'check', scope: 'room', position: index },
        update: { label: selected.label, scope: 'room', position: index },
      });
      await tx.roomTypeAmenity.create({ data: { roomTypeId, amenityId: amenity.id } });
    }
  }

  private async attachInlineMedia(
    tx: Prisma.TransactionClient,
    contentId: string,
    body: unknown,
    coverMediaId: string | null | undefined,
  ): Promise<void> {
    const mediaIds = documentMediaIds(body).filter((mediaId) => mediaId !== coverMediaId);
    await tx.contentMedia.deleteMany({ where: { contentId, role: 'inline' } });
    if (!mediaIds.length) return;

    const assets = await tx.mediaAsset.findMany({
      where: { id: { in: mediaIds }, isDemo: false, visibility: 'public', processingStatus: 'ready' },
      select: { id: true },
    });
    if (assets.length !== mediaIds.length) {
      throw new BadRequestException('Một hoặc nhiều ảnh trong nội dung không tồn tại hoặc chưa sẵn sàng');
    }
    await tx.contentMedia.createMany({
      data: mediaIds.map((mediaId, position) => ({ contentId, mediaId, role: 'inline', position })),
    });
  }

  private async reserveSlug(desired: string): Promise<string> {
    const [siblings, routes] = await Promise.all([
      this.prisma.contentNode.findMany({
        where: { kind: 'stay' },
        select: { slugSource: true },
      }),
      this.prisma.publicRoute.findMany({
        // Keep old routes of the same content reserved too: they remain
        // redirects after a slug change and must not be reused accidentally.
        where: { path: { startsWith: pathForContent('stay', '') } },
        select: { path: true },
      }),
    ]);
    const taken = new Set(siblings.map((item) => item.slugSource).filter((value): value is string => !!value));
    const prefix = pathForContent('stay', '');
    for (const route of routes) {
      const rest = route.path.slice(prefix.length);
      if (rest && !rest.includes('/')) taken.add(rest);
    }
    return uniqueSlug(desired, taken);
  }

  private isUniqueViolation(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'P2002';
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'P2003';
  }

  private toView(row: PropertyRow): PropertyView {
    const cover = row.content.media.find((item) => item.role === 'cover');
    const imageView = (item: PropertyRow['content']['media'][number]) => ({ mediaId: item.mediaId, url: `/media/${item.media.storageKey}`, alt: item.media.altText ?? item.media.originalFilename });
    return {
      id: row.id,
      contentId: row.contentId,
      title: row.content.title,
      description: documentToText(row.content.bodyDocument),
      descriptionDocument: row.content.bodyDocument,
      metaTitle: row.content.metaTitle,
      metaDescription: row.content.metaDescription,
      noindex: row.content.noindex,
      contentVersion: row.content.version,
      slug: row.content.slugSource,
      path: row.content.routes[0]?.path ?? null,
      excerpt: row.content.excerpt,
      code: row.code,
      kind: row.kind,
      area: row.area,
      address: row.address,
      operatingStatus: row.operatingStatus,
      publicationStatus: row.content.publicationStatus,
      publishAt: row.content.publishAt?.toISOString() ?? null,
      featured: row.content.featured,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      cover: cover
        ? imageView(cover)
        : null,
      gallery: row.content.media.filter((item) => item.role === 'gallery').map(imageView),
      roomTypes: row.roomTypes.map((room) => {
        const rate = room.ratePlans[0];
        return {
          id: room.id,
          code: room.code,
          name: room.name,
          description: room.description,
          unitKind: room.unitKind,
          bedroomCount: room.bedroomCount,
          bathroomCount: room.bathroomCount,
          maxAdults: room.capacityVerified ? room.maxAdults : null,
          maxChildren: room.capacityVerified ? room.maxChildren : null,
          maxOccupancy: room.capacityVerified ? room.maxOccupancy : null,
          capacityVerified: room.capacityVerified,
          bedSummary: room.bedSummary,
          areaSqm: room.areaSqm,
          unitCount: room.units.filter((unit) => unit.active).length,
          status: room.status,
          version: room.version,
          amenities: room.amenities.map((item) => item.amenity),
          gallery: row.content.media.filter((item) => item.role === `room:${room.id}`).map(imageView),
          rate: rate
            ? {
                id: rate.id,
                code: rate.code,
                name: rate.name,
                baseRateVnd: Number(rate.baseRateVnd),
                weekendRateVnd: rate.weekendRateVnd === null ? null : Number(rate.weekendRateVnd),
                breakfastIncluded: rate.breakfastIncluded,
                depositBps: rate.depositBps,
              }
            : null,
        };
      }),
    };
  }
}
