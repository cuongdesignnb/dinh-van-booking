import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Prisma } from '../generated/prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { hashPassword } from '../common/crypto';
import type { AuthenticatedUser } from '../common/types';
import { AuthService } from '../auth/auth.service';
import { documentMediaIds, documentToText, sanitizeDocument } from '../content/document';
import { pathForContent, uniqueSlug } from '../content/slug';
import { InventoryMutationService, availableRaw } from '../inventory/inventory-mutation.service';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  BulkPartnerInventoryDto, ConfirmPartnerInventoryDto, CreatePartnerPropertyDto, CreatePartnerRoomTypeDto, CreatePropertyClaimDto, QuickSetPartnerInventoryDto,
  RegisterPartnerDto, ReviewPartnerApplicationDto, ReviewPartnerRevisionDto,
  ReviewPropertyClaimDto, SubmitPartnerRevisionDto, ResubmitPartnerApplicationDto,
  AddPartnerMembershipDto, AddPartnerStaffDto, UpdatePartnerMembershipDto, UpdatePartnerOrganizationDto, UpdatePartnerStaffDto,
} from './partner.dto';

type JsonRecord = Record<string, unknown>;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Ngày phải có định dạng YYYY-MM-DD');
  const result = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(result.getTime()) || dayKey(result) !== value) throw new BadRequestException('Ngày không hợp lệ');
  return result;
}

function range(fromValue: string, toValue: string, maxDays = 31): Date[] {
  const from = dateOnly(fromValue);
  const to = dateOnly(toValue);
  const count = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (count < 1 || count > maxDays) throw new BadRequestException(`Khoảng tra cứu phải từ 1 đến ${maxDays} đêm`);
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(from);
    day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
}

function object(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

@Injectable()
export class PartnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly auth: AuthService,
    private readonly inventory: InventoryMutationService,
    private readonly media: MediaService,
  ) {}

  private async assertPortalEnabled(): Promise<void> {
    if (!(await this.settings.get<boolean>('partnerPortal.enabled'))) {
      throw new ForbiddenException('Cổng đối tác hiện chưa được mở.');
    }
  }

  async register(input: RegisterPartnerDto, meta: { ip?: string }) {
    await this.assertPortalEnabled();
    const email = input.email.trim().toLowerCase();
    await this.auth.consumeRateLimit('partner-register-email', email, 5, 60 * 60_000, 60 * 60_000);
    if (meta.ip) await this.auth.consumeRateLimit('partner-register-ip', meta.ip, 12, 60 * 60_000, 60 * 60_000);
    const passwordHash = await hashPassword(input.password);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email, fullName: input.fullName.trim(), passwordHash } });
        const organization = await tx.partnerOrganization.create({ data: {
          name: input.organizationName.trim(), contactName: input.fullName.trim(), email,
          phone: input.phone.trim(), address: input.address?.trim() || null,
          organizationType: input.organizationType ?? 'property_owner', status: 'pending_review',
          verificationStatus: 'manual_review', createdById: user.id,
        } });
        await tx.partnerMembership.create({ data: { organizationId: organization.id, userId: user.id, role: 'owner', status: 'pending' } });
        const application = await tx.partnerApplication.create({ data: {
          userId: user.id, organizationId: organization.id, submittedName: input.fullName.trim(),
          submittedEmail: email, submittedPhone: input.phone.trim(), status: 'pending',
        } });
        await tx.auditLog.create({ data: {
          actorId: user.id, action: 'partner.application_submitted', entityType: 'partner_application', entityId: application.id,
          diff: { organizationType: organization.organizationType, verificationStatus: 'manual_review' },
        } });
        return { applicationId: application.id, status: application.status };
      });
      return { accepted: true, ...result, verificationStatus: 'manual_review', message: 'Đã nhận yêu cầu. Hồ sơ cần được nhân viên xác minh trước khi mở quyền.' };
    } catch (error) {
      // Same response for duplicate and new addresses to avoid account enumeration.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { accepted: true, status: 'pending', verificationStatus: 'manual_review', message: 'Nếu thông tin có thể đăng ký, hướng dẫn tiếp theo sẽ được gửi qua kênh đã xác minh.' };
      }
      throw error;
    }
  }

  async context(user: AuthenticatedUser) {
    await this.assertPortalEnabled();
    const [memberships, applications] = await Promise.all([
      this.prisma.partnerMembership.findMany({
        where: { userId: user.id, status: { not: 'revoked' } },
        include: {
          organization: {
            include: {
              grants: {
                where: { status: 'active' },
                include: { property: { include: { content: { select: { title: true, publicationStatus: true } } } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.partnerApplication.findMany({ where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, select: {
        id: true, status: true, version: true, submittedName: true, submittedPhone: true, reviewNote: true, submittedAt: true,
        organization: { select: { name: true, address: true } },
      } }),
    ]);
    return {
      partner: { id: user.id, email: user.email, fullName: user.fullName },
      applications,
      organizations: memberships.map(({ organization, role, status }) => ({
        id: organization.id, name: organization.name, status: organization.status,
        verificationStatus: organization.verificationStatus, membershipRole: role, membershipStatus: status,
        grants: organization.grants.map((grant) => ({
          id: grant.id, propertyId: grant.propertyId, propertyName: grant.property.content.title,
          propertyStatus: grant.property.content.publicationStatus, status: grant.status,
          canReadInventory: grant.canReadInventory, canWriteInventory: grant.canWriteInventory,
          canEditRates: grant.canEditRates, canEditProfile: grant.canEditProfile,
          canUploadMedia: grant.canUploadMedia, roomTypeScope: grant.roomTypeScope,
        })),
      })),
    };
  }

  async assertCanSearchAvailability(user: AuthenticatedUser): Promise<void> {
    await this.assertPortalEnabled();
    const membership = await this.prisma.partnerMembership.findFirst({
      where: { userId: user.id, status: 'active', organization: { status: 'active' } },
      select: { organizationId: true },
    });
    if (!membership) throw new ForbiddenException('Chức năng tra cứu chỉ dành cho tài khoản thuộc tổ chức đối tác đã được duyệt.');
  }

  /** Emits only scoped invalidation keys; clients refetch their authoritative DTO. */
  inventoryEventStream(user: AuthenticatedUser): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let busy = false;
      let closed = false;
      let initialized = false;
      let cursorAt = new Date();
      let cursorId = '';
      let lastHeartbeat = Date.now();
      let scopeKey = '';

      const poll = async () => {
        if (busy || closed) return;
        busy = true;
        try {
          const now = new Date();
          const session = await this.prisma.authSession.findFirst({
            where: { id: user.sessionId, userId: user.id, revokedAt: null, expiresAt: { gt: now }, idleUntil: { gt: now }, user: { disabledAt: null } },
            select: { id: true },
          });
          if (!session || !(await this.settings.get<boolean>('partnerPortal.enabled'))) {
            subscriber.next({ type: 'authorization_revoked', data: { reason: 'session_or_portal_inactive' } });
            subscriber.complete();
            closed = true;
            return;
          }

          const memberships = await this.prisma.partnerMembership.findMany({
            where: { userId: user.id, status: 'active', organization: { status: 'active' } },
            select: { organizationId: true },
          });
          if (!memberships.length) {
            subscriber.next({ type: 'authorization_revoked', data: { reason: 'membership_inactive' } });
            subscriber.complete();
            closed = true;
            return;
          }
          const grants = await this.prisma.partnerPropertyGrant.findMany({
            where: { organizationId: { in: memberships.map((item) => item.organizationId) }, status: 'active', canReadInventory: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], property: { operatingStatus: 'active' } },
            select: { propertyId: true, roomTypeScope: true },
          });
          const propertyIds = [...new Set(grants.map((grant) => grant.propertyId))];
          const rooms = propertyIds.length ? await this.prisma.roomType.findMany({ where: { propertyId: { in: propertyIds }, status: 'active' }, select: { id: true, propertyId: true } }) : [];
          const allowed = new Map<string, string>();
          for (const room of rooms) {
            if (grants.some((grant) => grant.propertyId === room.propertyId && Array.isArray(grant.roomTypeScope) && (grant.roomTypeScope.includes('*') || grant.roomTypeScope.includes(room.id)))) {
              allowed.set(room.id, room.propertyId);
            }
          }
          const ids = [...allowed.keys()].sort();
          const nextScope = ids.join(',');
          if (scopeKey && scopeKey !== nextScope) subscriber.next({ type: 'scope.changed', data: { refresh: true } });
          scopeKey = nextScope;

          if (!initialized) {
            initialized = true;
            if (ids.length) {
              const latest = await this.prisma.outboxEvent.findFirst({ where: { eventType: 'inventory.changed', aggregateId: { in: ids } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { createdAt: true, id: true } });
              if (latest) { cursorAt = latest.createdAt; cursorId = latest.id; }
            }
          } else if (ids.length) {
            const events = await this.prisma.outboxEvent.findMany({
              where: {
                eventType: 'inventory.changed', aggregateId: { in: ids },
                OR: [{ createdAt: { gt: cursorAt } }, { createdAt: cursorAt, id: { gt: cursorId } }],
              },
              orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 100,
              select: { id: true, createdAt: true, aggregateId: true, payload: true },
            });
            for (const event of events) {
              const payload = object(event.payload);
              const roomTypeId = typeof payload.roomTypeId === 'string' && allowed.has(payload.roomTypeId) ? payload.roomTypeId : event.aggregateId;
              const version = Number(payload.version);
              const stayDate = typeof payload.stayDate === 'string' ? payload.stayDate : null;
              if (allowed.has(roomTypeId) && stayDate && Number.isInteger(version)) {
                subscriber.next({ id: event.id, type: 'inventory.changed', data: { propertyId: allowed.get(roomTypeId), roomTypeId, stayDate, version } });
              }
              cursorAt = event.createdAt;
              cursorId = event.id;
            }
          }
          if (Date.now() - lastHeartbeat >= 20_000) {
            subscriber.next({ type: 'heartbeat', data: { at: now.toISOString() } });
            lastHeartbeat = Date.now();
          }
        } catch {
          // A poll failure does not terminate the stream. The client's bounded
          // snapshot polling remains the recovery path for missed events.
        } finally { busy = false; }
      };

      void poll();
      const timer = setInterval(() => void poll(), 5_000);
      return () => { closed = true; clearInterval(timer); };
    });
  }

  async resubmitApplication(user: AuthenticatedUser, id: string, input: ResubmitPartnerApplicationDto) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.partnerApplication.findUnique({ where: { id }, include: { organization: true } });
      if (!application || application.userId !== user.id) throw new NotFoundException('Không tìm thấy hồ sơ đăng ký.');
      if (application.status !== 'needs_info' || application.version !== input.expectedVersion) {
        throw new ConflictException({ code: 'application_version_conflict', status: application.status, currentVersion: application.version });
      }
      const now = new Date();
      const moved = await tx.partnerApplication.updateMany({
        where: { id, userId: user.id, status: 'needs_info', version: input.expectedVersion },
        data: { submittedName: input.fullName.trim(), submittedPhone: input.phone.trim(), status: 'pending', submittedAt: now,
          reviewerId: null, reviewedAt: null, reviewNote: null, version: { increment: 1 } },
      });
      if (moved.count !== 1) throw new ConflictException('Hồ sơ vừa được cập nhật ở nơi khác.');
      await tx.partnerOrganization.update({ where: { id: application.organizationId }, data: {
        name: input.organizationName.trim(), contactName: input.fullName.trim(), phone: input.phone.trim(), address: input.address?.trim() || null,
        status: 'pending_review', verificationStatus: 'manual_review', version: { increment: 1 },
      } });
      await tx.partnerMembership.updateMany({ where: { organizationId: application.organizationId, userId: user.id }, data: { status: 'pending', revokedAt: null, version: { increment: 1 } } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'partner.application_resubmitted', entityType: 'partner_application', entityId: id, diff: { versionFrom: input.expectedVersion, versionTo: input.expectedVersion + 1 } } });
      return { id, status: 'pending', version: input.expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createClaim(user: AuthenticatedUser, input: CreatePropertyClaimDto) {
    await this.assertPortalEnabled();
    await this.activeMembership(input.organizationId, user.id, 'write');
    const property = await this.prisma.property.findFirst({ where: { id: input.propertyId, content: { isDemo: false } }, select: { id: true } });
    if (!property) throw new NotFoundException('Không tìm thấy cơ sở có thể yêu cầu quản lý.');
    const existingGrant = await this.prisma.partnerPropertyGrant.findUnique({ where: { organizationId_propertyId: { organizationId: input.organizationId, propertyId: input.propertyId } } });
    if (existingGrant?.status === 'active') throw new ConflictException('Tổ chức này đã có quyền quản lý cơ sở.');
    const pending = await this.prisma.propertyAccessClaim.findFirst({ where: { organizationId: input.organizationId, propertyId: input.propertyId, status: 'pending' } });
    if (pending) return { id: pending.id, status: pending.status, replayed: true };
    const claim = await this.prisma.propertyAccessClaim.create({ data: {
      organizationId: input.organizationId, propertyId: input.propertyId, requestedById: user.id,
      reason: input.reason?.trim() || null,
    } });
    await this.prisma.auditLog.create({ data: { actorId: user.id, action: 'partner.property_claim_submitted', entityType: 'property_access_claim', entityId: claim.id, diff: { organizationId: input.organizationId, propertyId: input.propertyId } } });
    return { id: claim.id, status: claim.status, replayed: false };
  }

  async claimCandidates(user: AuthenticatedUser, organizationId: string, search = '') {
    await this.assertPortalEnabled();
    await this.activeMembership(organizationId, user.id);
    const term = search.trim().slice(0, 80);
    const rows = await this.prisma.property.findMany({
      where: {
        operatingStatus: 'active', content: { isDemo: false, publicationStatus: 'published' },
        ...(term ? { OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { area: { contains: term, mode: 'insensitive' } },
          { content: { title: { contains: term, mode: 'insensitive' } } },
        ] } : {}),
      },
      include: { content: { select: { title: true, routes: { where: { isCurrent: true }, take: 1, select: { path: true } } } } },
      orderBy: { code: 'asc' }, take: 50,
    });
    return { items: rows.map((row) => ({ id: row.id, code: row.code, name: row.content.title, area: row.area, path: row.content.routes[0]?.path ?? null })) };
  }

  async properties(user: AuthenticatedUser) {
    await this.assertPortalEnabled();
    const memberships = await this.prisma.partnerMembership.findMany({ where: { userId: user.id, status: 'active', organization: { status: 'active' } }, select: { organizationId: true, role: true } });
    const orgIds = memberships.map((row) => row.organizationId);
    const roleByOrganization = new Map(memberships.map((row) => [row.organizationId, row.role]));
    const grants = await this.prisma.partnerPropertyGrant.findMany({
      where: { organizationId: { in: orgIds }, status: 'active', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: {
        organization: { select: { name: true } },
        property: {
          include: {
            content: { include: {
              routes: { where: { isCurrent: true }, take: 1 },
              media: { where: { role: { in: ['cover', 'gallery'] } }, orderBy: { position: 'asc' }, include: { media: true } },
            } },
            roomTypes: { select: {
              id: true, code: true, name: true, status: true, version: true, capacityVerified: true, inventoryScope: true,
              description: true, bedSummary: true, areaSqm: true, unitKind: true, bedroomCount: true, bathroomCount: true,
              maxAdults: true, maxChildren: true,
              ratePlans: { where: { active: true }, select: { id: true, code: true, name: true, baseRateVnd: true, weekendRateVnd: true, breakfastIncluded: true, minStayNights: true, maxStayNights: true, inclusions: true, version: true } },
            } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { items: grants.map((grant) => ({
      id: grant.property.id, propertyId: grant.property.id, organizationId: grant.organizationId, organizationName: grant.organization.name,
      name: grant.property.content.title, code: grant.property.code, area: grant.property.area,
      address: grant.property.address, excerpt: grant.property.content.excerpt, descriptionDocument: grant.property.content.bodyDocument,
      checkInTime: grant.property.checkInTime, checkOutTime: grant.property.checkOutTime,
      houseRules: (() => {
        const policy = object(grant.property.approvedPolicies);
        const rules = policy.houseRules ?? policy.rules;
        return Array.isArray(rules) ? rules.map((item) => object(item)).filter((item) => typeof item.text === 'string').map((item) => String(item.text)) : [];
      })(),
      notes: (() => { const values = object(grant.property.approvedPolicies).notes; return Array.isArray(values) ? values.filter((item): item is string => typeof item === 'string') : []; })(),
      gallery: grant.property.content.media.map((item) => ({ id: item.mediaId, url: `/media/${item.media.storageKey}`, altText: item.media.altText, role: item.role, position: item.position })),
      publicPath: grant.property.content.routes[0]?.path ?? null,
      publicationStatus: grant.property.content.publicationStatus, version: grant.property.version, contentVersion: grant.property.content.version,
      capabilities: {
        canReadInventory: grant.canReadInventory,
        canWriteInventory: grant.canWriteInventory && ['owner', 'manager'].includes(roleByOrganization.get(grant.organizationId) ?? ''),
        canEditRates: grant.canEditRates && ['owner', 'manager'].includes(roleByOrganization.get(grant.organizationId) ?? ''),
        canEditProfile: grant.canEditProfile && ['owner', 'manager'].includes(roleByOrganization.get(grant.organizationId) ?? ''),
        canUploadMedia: grant.canUploadMedia && ['owner', 'manager'].includes(roleByOrganization.get(grant.organizationId) ?? ''),
      },
      roomTypes: grant.property.roomTypes.filter((room) => this.inScope(grant.roomTypeScope, room.id)).map((room) => ({
        id: room.id, code: room.code, name: room.name, status: room.status, version: room.version, capacityVerified: room.capacityVerified, inventoryScope: room.inventoryScope,
        description: room.description, bedSummary: room.bedSummary, areaSqm: room.areaSqm, unitKind: room.unitKind,
        bedroomCount: room.bedroomCount, bathroomCount: room.bathroomCount, maxAdults: room.maxAdults, maxChildren: room.maxChildren,
        ratePlans: grant.canEditRates && ['owner', 'manager'].includes(roleByOrganization.get(grant.organizationId) ?? '') ? room.ratePlans.map((rate) => ({ ...rate, baseRateVnd: rate.baseRateVnd.toString(), weekendRateVnd: rate.weekendRateVnd?.toString() ?? null, inclusions: Array.isArray(rate.inclusions) ? rate.inclusions : [] })) : [],
      })),
    })) };
  }

  async createPropertyDraft(user: AuthenticatedUser, input: CreatePartnerPropertyDto) {
    await this.assertPortalEnabled();
    await this.activeMembership(input.organizationId, user.id, 'write');
    const title = input.title.trim();
    const mediaIds = [...new Set(input.mediaIds ?? [])];
    if (mediaIds.length !== (input.mediaIds ?? []).length) throw new BadRequestException('Không được chọn lặp ảnh trong cùng album.');
    await this.assertMediaAvailable(mediaIds, input.organizationId);
    const editor = await this.settings.get<{ allowedBlocks: string[] }>('content.editor');
    const description = input.descriptionDocument === undefined
      ? { type: 'doc', content: [] }
      : sanitizeDocument(input.descriptionDocument, { allowedBlocks: editor.allowedBlocks });
    const excerpt = input.excerpt?.trim() || documentToText(description).slice(0, 500) || null;
    const created = await this.prisma.$transaction(async (tx) => {
      const siblings = await tx.contentNode.findMany({ where: { kind: 'stay' }, select: { slugSource: true } });
      const slug = uniqueSlug(title, new Set(siblings.map((row) => row.slugSource).filter((value): value is string => !!value)));
      const node = await tx.contentNode.create({ data: {
        kind: 'stay', title, slugSource: slug, excerpt, bodyDocument: json(description),
        metaTitle: title, metaDescription: excerpt?.slice(0, 320) ?? null, publicationStatus: 'draft', noindex: true, isDemo: false,
      } });
      await tx.publicRoute.create({ data: { contentId: node.id, path: pathForContent('stay', slug), redirectStatus: 308 } });
      await tx.contentRevision.create({ data: { contentId: node.id, documentSnapshot: json(description), note: 'Tạo nháp từ Cổng đối tác', authorId: user.id } });
      const property = await tx.property.create({ data: {
        contentId: node.id, code: `PT-${randomUUID().slice(0, 8).toUpperCase()}`, kind: input.kind,
        area: input.area.trim(), address: input.address.trim(), operatingStatus: 'pending_verification',
      } });
      if (mediaIds.length) {
        await tx.contentMedia.createMany({ data: mediaIds.map((mediaId, index) => ({ contentId: node.id, mediaId, role: index === 0 ? 'cover' : 'gallery', position: index })) });
        // The selected cover stays private until a reviewer approves publication data.
      }
      await tx.partnerPropertyGrant.create({ data: {
        organizationId: input.organizationId, propertyId: property.id, status: 'active',
        canReadInventory: false, canWriteInventory: false, canEditRates: false,
        canEditProfile: true, canUploadMedia: true, roomTypeScope: [], approvedById: null,
      } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'partner.property_draft_created', entityType: 'property', entityId: property.id, diff: { organizationId: input.organizationId, contentId: node.id, slug, mediaCount: mediaIds.length } } });
      return { propertyId: property.id, slug };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { id: created.propertyId, slug: created.slug, path: pathForContent('stay', created.slug), status: 'draft', publicationStatus: 'draft', noindex: true };
  }

  async createRoomTypeDraft(user: AuthenticatedUser, propertyId: string, input: CreatePartnerRoomTypeDto) {
    await this.assertPortalEnabled();
    await this.activeMembership(input.organizationId, user.id, 'write');
    const grant = await this.activeGrant(input.organizationId, propertyId);
    if (!grant.canEditProfile) throw new ForbiddenException('Tổ chức chưa được cấp quyền khai báo hạng phòng.');
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, content: { isDemo: false } }, select: { id: true } });
    if (!property) throw new NotFoundException('Không tìm thấy cơ sở.');
    const rawCode = input.code?.trim().toUpperCase() || input.name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').replace(/[^A-Z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 20);
    const code = rawCode || `RT-${randomUUID().slice(0, 6).toUpperCase()}`;
    const room = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roomType.create({ data: {
        propertyId, code, name: input.name.trim(), description: input.description?.trim() || null,
        bedSummary: input.bedSummary?.trim() || null, bedroomCount: input.bedroomCount ?? null,
        bathroomCount: input.bathroomCount ?? null, areaSqm: input.areaSqm ?? null,
        maxAdults: 1, maxChildren: 0, maxOccupancy: 1, capacityVerified: false, status: 'draft',
      } });
      const scope = Array.isArray(grant.roomTypeScope) ? grant.roomTypeScope.filter((item): item is string => typeof item === 'string') : [];
      await tx.partnerPropertyGrant.update({ where: { id: grant.id }, data: { roomTypeScope: [...new Set([...scope, created.id])] } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'partner.room_type_draft_created', entityType: 'room_type', entityId: created.id, diff: { organizationId: input.organizationId, propertyId, code, status: 'draft' } } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { id: room.id, code: room.code, name: room.name, status: room.status, version: room.version, capacityVerified: room.capacityVerified };
  }

  async myRevisions(user: AuthenticatedUser, organizationId: string) {
    await this.assertPortalEnabled();
    await this.activeMembership(organizationId, user.id);
    const rows = await this.prisma.partnerProfileRevision.findMany({
      where: { organizationId, submittedById: user.id }, orderBy: { submittedAt: 'desc' }, take: 100,
      include: { property: { include: { content: { select: { title: true } } } } },
    });
    return { items: rows.map((row) => ({ id: row.id, propertyId: row.propertyId, propertyName: row.property.content.title, roomTypeId: row.roomTypeId, revision: row.revision, status: row.status, reviewNote: row.reviewNote, proposed: row.proposed, submittedAt: row.submittedAt.toISOString() })) };
  }

  async uploadMedia(user: AuthenticatedUser, organizationId: string, propertyId: string, file: { buffer: Buffer; filename: string; mimetype: string }, altText: string, caption?: string) {
    await this.assertPortalEnabled();
    await this.activeMembership(organizationId, user.id, 'write');
    const grant = await this.activeGrant(organizationId, propertyId);
    if (!grant.canUploadMedia) throw new ForbiddenException('Tổ chức chưa được cấp quyền tải ảnh cho cơ sở này.');
    if (!altText.trim()) throw new BadRequestException('Ảnh cần có mô tả ALT trước khi tải lên.');
    return this.media.ingest(file, { altText, caption }, user.id, { organizationId, visibility: 'private' });
  }

  async mediaLibrary(user: AuthenticatedUser, organizationId: string, page = 1) {
    await this.assertPortalEnabled();
    await this.activeMembership(organizationId, user.id);
    const where: Prisma.MediaAssetWhereInput = {
      isDemo: false, processingStatus: 'ready',
      OR: [{ visibility: 'public' }, { visibility: 'private', ownerOrganizationId: organizationId }],
    };
    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * 24, take: 24 }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return { items: rows.map((asset) => ({
      id: asset.id, url: `/media/${asset.storageKey}`, altText: asset.altText, caption: asset.caption,
      width: asset.width, height: asset.height, visibility: asset.visibility, createdAt: asset.createdAt.toISOString(),
    })), page: Math.max(1, page), pageSize: 24, total };
  }

  async inventoryRows(user: AuthenticatedUser, query: { organizationId: string; propertyId: string; from: string; toExclusive: string }) {
    await this.assertPortalEnabled();
    if (!(await this.settings.get<boolean>('inventoryCalendar.enabled'))) throw new ForbiddenException('Lịch quỹ phòng hiện chưa được bật.');
    await this.activeMembership(query.organizationId, user.id);
    const grant = await this.activeGrant(query.organizationId, query.propertyId);
    if (!grant.canReadInventory) throw new ForbiddenException('Tổ chức chưa được cấp quyền xem tồn cơ sở này.');
    const dates = range(query.from, query.toExclusive);
    const roomTypes = await this.prisma.roomType.findMany({ where: { propertyId: query.propertyId, status: 'active' }, select: { id: true, name: true, status: true } });
    const scoped = roomTypes.filter((room) => this.inScope(grant.roomTypeScope, room.id));
    const rows = await this.prisma.inventoryDay.findMany({ where: { roomTypeId: { in: scoped.map((room) => room.id) }, stayDate: { in: dates } }, orderBy: [{ roomTypeId: 'asc' }, { stayDate: 'asc' }] });
    const incidents = await this.prisma.inventoryIntegrityIncident.findMany({ where: { roomTypeId: { in: scoped.map((room) => room.id) }, stayDate: { in: dates }, resolvedAt: null }, select: { roomTypeId: true, stayDate: true } });
    const [byKey, incidentKeys] = [
      new Map(rows.map((row) => [`${row.roomTypeId}:${dayKey(row.stayDate)}`, row])),
      new Set(incidents.map((item) => `${item.roomTypeId}:${dayKey(item.stayDate)}`)),
    ];
    const freshness = await this.settings.get<{ nearTermDays?: number; nearTermFreshHours?: number; fartherFreshDays?: number }>('inventory.freshness');
    const now = Date.now();
    const items = scoped.flatMap((roomType) => dates.map((stayDate) => {
      const key = `${roomType.id}:${dayKey(stayDate)}`;
      const row = byKey.get(key);
      const freshHours = (stayDate.getTime() - now) / 86_400_000 <= (freshness.nearTermDays ?? 7)
        ? (freshness.nearTermFreshHours ?? 24) : (freshness.fartherFreshDays ?? 7) * 24;
      const isFresh = !!row?.lastConfirmedAt && now - row.lastConfirmedAt.getTime() <= freshHours * 3_600_000;
      return {
        roomTypeId: roomType.id, roomTypeName: roomType.name, stayDate: dayKey(stayDate),
        dataState: !row ? 'missing' : isFresh ? 'fresh' : 'stale',
        saleState: !row ? 'not_on_sale' : row.stopSell ? 'stop_sell' : 'open',
        capacity: row?.capacity ?? null, blockedCount: row?.blockedCount ?? null,
        heldCount: row?.heldCount ?? null, reservedCount: row?.reservedCount ?? null,
        available: !row || row.stopSell || incidentKeys.has(key) ? null : availableRaw(row),
        version: row?.version ?? null, lastConfirmedAt: row?.lastConfirmedAt?.toISOString() ?? null,
        integrityHold: incidentKeys.has(key),
      };
    }));
    return { items, generatedAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', range: { from: query.from, toExclusive: query.toExclusive } };
  }

  async quickSetInventory(user: AuthenticatedUser, input: QuickSetPartnerInventoryDto, idempotencyKey: string) {
    await this.assertPortalEnabled();
    if (!(await this.settings.get<boolean>('inventoryCalendar.enabled'))) throw new ForbiddenException('Lịch quỹ phòng hiện chưa được bật.');
    await this.activeMembership(input.organizationId, user.id, 'write');
    return this.inventory.quickSetAvailable({ ...input, actorId: user.id, idempotencyKey });
  }

  async previewBulkInventory(user: AuthenticatedUser, input: BulkPartnerInventoryDto) {
    await this.assertPortalEnabled();
    if (!(await this.settings.get<boolean>('inventoryCalendar.enabled'))) throw new ForbiddenException('Lịch quỹ phòng hiện chưa được bật.');
    await this.activeMembership(input.organizationId, user.id, 'write');
    return this.inventory.previewPartnerSet({ organizationId: input.organizationId, actorId: user.id, changes: input.changes });
  }

  async bulkInventory(user: AuthenticatedUser, input: BulkPartnerInventoryDto, idempotencyKey: string) {
    await this.assertPortalEnabled();
    if (!(await this.settings.get<boolean>('inventoryCalendar.enabled'))) throw new ForbiddenException('Lịch quỹ phòng hiện chưa được bật.');
    await this.activeMembership(input.organizationId, user.id, 'write');
    return this.inventory.setPartnerInventory({ organizationId: input.organizationId, actorId: user.id, changes: input.changes, idempotencyKey });
  }

  async confirmInventory(user: AuthenticatedUser, input: ConfirmPartnerInventoryDto, idempotencyKey: string) {
    await this.assertPortalEnabled();
    if (!(await this.settings.get<boolean>('inventoryCalendar.enabled'))) throw new ForbiddenException('Lịch quỹ phòng hiện chưa được bật.');
    await this.activeMembership(input.organizationId, user.id, 'write');
    const grant = await this.activeGrant(input.organizationId, (await this.roomProperty(input.roomTypeId)).propertyId);
    if (!grant.canWriteInventory || !this.inScope(grant.roomTypeScope, input.roomTypeId)) throw new ForbiddenException('Không được xác nhận tồn cho hạng phòng này.');
    return this.inventory.confirmUnchanged({ ...input, to: input.toExclusive, actorId: user.id, idempotencyKey });
  }

  async organizationMembers(user: AuthenticatedUser, organizationId: string) {
    await this.assertPortalEnabled();
    const membership = await this.activeMembership(organizationId, user.id);
    if (membership.role !== 'owner') throw new ForbiddenException('Chỉ chủ tổ chức được quản lý thành viên.');
    const rows = await this.prisma.partnerMembership.findMany({
      where: { organizationId }, include: { user: { select: { id: true, fullName: true, email: true, disabledAt: true } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: rows.map((row) => ({ userId: row.userId, name: row.user.fullName, email: row.user.email, disabled: !!row.user.disabledAt, role: row.role, status: row.status, version: row.version })) };
  }

  async addOrganizationMember(user: AuthenticatedUser, organizationId: string, input: AddPartnerStaffDto) {
    await this.assertPortalEnabled();
    const email = input.email.trim().toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_organizations WHERE id = ${organizationId}::uuid FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT organization_id FROM partner_memberships WHERE organization_id = ${organizationId}::uuid AND user_id = ${user.id}::uuid FOR SHARE`);
      const [organization, owner, target] = await Promise.all([
        tx.partnerOrganization.findUnique({ where: { id: organizationId }, select: { id: true, status: true } }),
        tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } } }),
        tx.user.findUnique({ where: { email }, select: { id: true, fullName: true, email: true, disabledAt: true } }),
      ]);
      if (!organization || organization.status !== 'active' || !owner || owner.status !== 'active' || owner.role !== 'owner') throw new ForbiddenException('Chỉ chủ tổ chức đang hoạt động được quản lý thành viên.');
      if (!target || target.disabledAt) throw new NotFoundException('Chỉ thêm được tài khoản đã đăng ký và đang hoạt động; hệ thống không tự gửi lời mời.');
      if (target.id === user.id) throw new ConflictException('Bạn đã là chủ tổ chức.');
      await tx.$queryRaw(Prisma.sql`SELECT organization_id FROM partner_memberships WHERE organization_id = ${organizationId}::uuid AND user_id = ${target.id}::uuid FOR UPDATE`);
      const current = await tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: target.id } } });
      if (current?.status === 'active') throw new ConflictException('Tài khoản này đã là thành viên.');
      const member = current
        ? await tx.partnerMembership.update({ where: { organizationId_userId: { organizationId, userId: target.id } }, data: { role: input.role, status: 'active', grantedById: user.id, revokedAt: null, version: { increment: 1 } } })
        : await tx.partnerMembership.create({ data: { organizationId, userId: target.id, role: input.role, status: 'active', grantedById: user.id } });
      await tx.partnerNotification.create({ data: { organizationId, userId: target.id, kind: 'membership_activated', title: 'Bạn đã được thêm vào tổ chức đối tác', body: `Vai trò thành viên: ${input.role}. Quyền theo từng cơ sở vẫn do quản trị viên duyệt riêng.` } });
      await tx.auditLog.create({ data: { actorId: user.id, action: 'partner.member_added_by_owner', entityType: 'partner_membership', entityId: target.id, diff: { organizationId, role: input.role, version: member.version } } });
      return { userId: target.id, name: target.fullName, email: target.email, role: member.role, status: member.status, version: member.version };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async updateOrganizationMember(user: AuthenticatedUser, organizationId: string, userId: string, input: UpdatePartnerStaffDto) {
    await this.assertPortalEnabled();
    if (user.id === userId) throw new ConflictException('Không thể tự thu hồi quyền chủ tổ chức; hãy nhờ quản trị viên xử lý chuyển giao.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM partner_organizations WHERE id = ${organizationId}::uuid FOR SHARE`);
      await tx.$queryRaw(Prisma.sql`SELECT organization_id FROM partner_memberships WHERE organization_id = ${organizationId}::uuid AND user_id = ${user.id}::uuid FOR SHARE`);
      const [organization, owner] = await Promise.all([
        tx.partnerOrganization.findUnique({ where: { id: organizationId }, select: { id: true, status: true } }),
        tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } } }),
      ]);
      if (!organization || organization.status !== 'active' || !owner || owner.status !== 'active' || owner.role !== 'owner') throw new ForbiddenException('Chỉ chủ tổ chức đang hoạt động được quản lý thành viên.');
      await tx.$queryRaw(Prisma.sql`SELECT organization_id FROM partner_memberships WHERE organization_id = ${organizationId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`);
      const member = await tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
      if (!member) throw new NotFoundException('Không tìm thấy thành viên.');
      if (member.version !== input.expectedVersion) throw new ConflictException({ code: 'version_conflict', currentVersion: member.version });
      const nextStatus = input.action === 'revoke' ? 'revoked' : 'active';
      if (input.action === 'restore' && organization.status !== 'active') throw new ConflictException('Không thể khôi phục thành viên trong tổ chức đang tạm ngưng.');
      if (nextStatus === 'active') {
        const target = await tx.user.findUnique({ where: { id: userId }, select: { disabledAt: true } });
        if (!target || target.disabledAt) throw new ConflictException('Không thể khôi phục tài khoản đã bị khóa.');
      }
      if (input.action === 'revoke' && member.status === 'active' && member.role === 'owner') {
        const activeOwners = await tx.partnerMembership.count({ where: { organizationId, status: 'active', role: 'owner' } });
        if (activeOwners <= 1) throw new ConflictException('Không thể thu hồi chủ sở hữu cuối cùng.');
      }
      const changed = await tx.partnerMembership.updateMany({ where: { organizationId, userId, version: input.expectedVersion }, data: { status: nextStatus, revokedAt: nextStatus === 'revoked' ? new Date() : null, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Thành viên vừa được cập nhật ở nơi khác.');
      await this.notifyOrg(tx, organizationId, `membership_${input.action}`, input.action === 'revoke' ? 'Quyền thành viên đã bị thu hồi' : 'Quyền thành viên đã được khôi phục', 'Quản trị viên trong tổ chức đã cập nhật quyền thành viên.');
      await tx.auditLog.create({ data: { actorId: user.id, action: `partner.member_${input.action}_by_owner`, entityType: 'partner_membership', entityId: userId, diff: { organizationId, from: member.status, to: nextStatus, versionFrom: input.expectedVersion, versionTo: input.expectedVersion + 1 } } });
      return { userId, status: nextStatus, version: input.expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async submitRevision(user: AuthenticatedUser, input: SubmitPartnerRevisionDto, idempotencyKey: string) {
    await this.assertPortalEnabled();
    await this.activeMembership(input.organizationId, user.id, 'write');
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 160) throw new BadRequestException('Thiếu khoá Idempotency-Key hợp lệ.');
    const proposed = object(input.proposed);
    const allowedProperty = new Set(['title', 'excerpt', 'descriptionDocument', 'area', 'address', 'checkInTime', 'checkOutTime', 'media', 'houseRules', 'notes']);
    const allowedRoom = new Set(['name', 'description', 'bedSummary', 'areaSqm', 'unitKind', 'bedroomCount', 'bathroomCount', 'maxAdults', 'maxChildren']);
    const allowedRate = new Set(['baseRateVnd', 'weekendRateVnd', 'breakfastIncluded', 'minStayNights', 'maxStayNights', 'inclusions']);
    const isRate = !!input.ratePlanId;
    const allowed = isRate ? allowedRate : input.roomTypeId ? allowedRoom : allowedProperty;
    const keys = Object.keys(proposed);
    if (!keys.length || keys.some((key) => !allowed.has(key))) throw new BadRequestException('Bản đề xuất có trường không được phép sửa.');

    const requestHash = createHash('sha256').update(canonical({
      organizationId: input.organizationId, propertyId: input.propertyId, roomTypeId: input.roomTypeId ?? null,
      ratePlanId: input.ratePlanId ?? null, baseVersion: input.baseVersion, contentBaseVersion: input.contentBaseVersion ?? null, proposed,
    })).digest('hex');
    const prior = await this.prisma.partnerProfileRevision.findFirst({ where: { organizationId: input.organizationId, submittedById: user.id, idempotencyKey }, select: { id: true, revision: true, status: true, submittedAt: true, requestHash: true } });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ConflictException('Khoá Idempotency-Key đã được dùng cho nội dung khác.');
      return { id: prior.id, revision: prior.revision, status: prior.status, submittedAt: prior.submittedAt.toISOString(), replayed: true };
    }

    const property = await this.prisma.property.findFirst({ where: { id: input.propertyId, content: { isDemo: false } }, include: { content: true } });
    if (!property) throw new NotFoundException('Không tìm thấy cơ sở.');
    const grant = await this.activeGrant(input.organizationId, property.id);
    if (isRate ? !grant.canEditRates : !grant.canEditProfile) throw new ForbiddenException('Tổ chức chưa có quyền gửi loại thay đổi này.');

    let targetRatePlanId: string | null = null;
    let roomTypeId: string | null = input.roomTypeId ?? null;
    const baseVersion = input.baseVersion;
    let contentBaseVersion: number | null = null;
    if (isRate) {
      const rate = await this.prisma.ratePlan.findFirst({ where: { id: input.ratePlanId, roomType: { propertyId: property.id } }, select: { id: true, version: true, roomTypeId: true } });
      if (!rate) throw new NotFoundException('Không tìm thấy bảng giá thuộc cơ sở này.');
      targetRatePlanId = rate.id;
      roomTypeId = rate.roomTypeId;
      if (!this.inScope(grant.roomTypeScope, rate.roomTypeId)) throw new ForbiddenException('Hạng phòng ngoài phạm vi quyền được cấp.');
      if (rate.version !== input.baseVersion) throw new ConflictException({ code: 'revision_version_conflict', currentVersion: rate.version });
      for (const key of keys) {
        const value = proposed[key];
        if (['baseRateVnd', 'weekendRateVnd'].includes(key) && value !== null && !/^\d{1,15}$/.test(String(value))) throw new BadRequestException('Giá phải là số VND nguyên không âm dạng chuỗi.');
      }
      if (proposed.breakfastIncluded !== undefined && typeof proposed.breakfastIncluded !== 'boolean') throw new BadRequestException('Chọn rõ dịch vụ bữa sáng có bao gồm hay không.');
      if (proposed.minStayNights !== undefined && (!Number.isInteger(proposed.minStayNights) || Number(proposed.minStayNights) < 1 || Number(proposed.minStayNights) > 30)) throw new BadRequestException('Số đêm tối thiểu phải từ 1 đến 30.');
      if (proposed.maxStayNights !== undefined && proposed.maxStayNights !== null && (!Number.isInteger(proposed.maxStayNights) || Number(proposed.maxStayNights) < Number(proposed.minStayNights ?? 1) || Number(proposed.maxStayNights) > 365)) throw new BadRequestException('Số đêm tối đa không hợp lệ.');
      if (proposed.inclusions !== undefined && (!Array.isArray(proposed.inclusions) || proposed.inclusions.length > 20 || proposed.inclusions.some((item) => typeof item !== 'string' || item.trim().length > 100))) throw new BadRequestException('Danh sách quyền lợi không hợp lệ.');
    } else if (roomTypeId) {
      const room = await this.prisma.roomType.findFirst({ where: { id: roomTypeId, propertyId: property.id }, select: { id: true, version: true } });
      if (!room) throw new NotFoundException('Không tìm thấy hạng phòng thuộc cơ sở này.');
      if (!this.inScope(grant.roomTypeScope, room.id)) throw new ForbiddenException('Hạng phòng ngoài phạm vi quyền được cấp.');
      if (room.version !== input.baseVersion) throw new ConflictException({ code: 'revision_version_conflict', currentVersion: room.version });
      for (const key of ['areaSqm', 'bedroomCount', 'bathroomCount', 'maxAdults', 'maxChildren']) if (proposed[key] !== undefined && (!Number.isInteger(proposed[key]) || Number(proposed[key]) < 0)) throw new BadRequestException(`${key} phải là số nguyên không âm.`);
      if (proposed.maxAdults !== undefined && Number(proposed.maxAdults) < 1) throw new BadRequestException('Sức chứa người lớn phải tối thiểu 1.');
    } else {
      if (property.version !== input.baseVersion) throw new ConflictException({ code: 'revision_version_conflict', currentVersion: property.version });
      contentBaseVersion = input.contentBaseVersion ?? property.content.version;
      if (property.content.version !== contentBaseVersion) throw new ConflictException({ code: 'content_version_conflict', currentVersion: property.content.version });
      for (const key of ['title', 'excerpt', 'area', 'address', 'checkInTime', 'checkOutTime']) {
        if (proposed[key] !== undefined && (typeof proposed[key] !== 'string' || !proposed[key].trim())) throw new BadRequestException(`${key} không được để trống.`);
      }
      if (proposed.houseRules !== undefined && (!Array.isArray(proposed.houseRules) || proposed.houseRules.length > 30 || proposed.houseRules.some((item) => typeof item !== 'string' || item.trim().length > 240))) throw new BadRequestException('Mỗi nội quy cần là một dòng tối đa 240 ký tự.');
      if (proposed.notes !== undefined && (!Array.isArray(proposed.notes) || proposed.notes.length > 20 || proposed.notes.some((item) => typeof item !== 'string' || item.trim().length > 500))) throw new BadRequestException('Ghi chú cần là danh sách tối đa 20 dòng, mỗi dòng 500 ký tự.');
      if (Array.isArray(proposed.houseRules)) proposed.houseRules = proposed.houseRules.map((item) => String(item).trim()).filter(Boolean);
      if (Array.isArray(proposed.notes)) proposed.notes = proposed.notes.map((item) => String(item).trim()).filter(Boolean);
      if (proposed.descriptionDocument !== undefined) {
        const editor = await this.settings.get<{ allowedBlocks: string[] }>('content.editor');
        proposed.descriptionDocument = sanitizeDocument(proposed.descriptionDocument, { allowedBlocks: editor.allowedBlocks });
      }
      if (proposed.media !== undefined) {
        if (!Array.isArray(proposed.media) || proposed.media.length > 40) throw new BadRequestException('Danh sách ảnh không hợp lệ.');
        const media = proposed.media as Array<{ mediaId?: unknown; role?: unknown; position?: unknown }>;
        if (media.some((item) => typeof item.mediaId !== 'string' || !['cover', 'gallery'].includes(String(item.role)) || !Number.isInteger(item.position))) throw new BadRequestException('Mỗi ảnh cần Media Library ID, vai trò cover/gallery và thứ tự.');
        const mediaIds = [...new Set(media.map((item) => String(item.mediaId)))];
        if (mediaIds.length !== media.length) throw new BadRequestException('Không được lặp ảnh trong cùng album.');
        await this.assertMediaAvailable(mediaIds, input.organizationId);
      }
      if (proposed.descriptionDocument !== undefined) await this.assertMediaAvailable(documentMediaIds(proposed.descriptionDocument), input.organizationId);
    }

    try {
      const revision = await this.prisma.$transaction(async (tx) => {
        const currentRevision = await tx.partnerProfileRevision.aggregate({ where: { organizationId: input.organizationId, propertyId: property.id }, _max: { revision: true } });
        const created = await tx.partnerProfileRevision.create({ data: {
          organizationId: input.organizationId, propertyId: property.id, roomTypeId, targetRatePlanId,
          revision: (currentRevision._max.revision ?? 0) + 1, baseVersion, contentBaseVersion,
          proposed: json(proposed), submittedById: user.id, idempotencyKey, requestHash,
        } });
        await tx.auditLog.create({ data: {
          actorId: user.id, action: 'partner.profile_revision_submitted', entityType: 'partner_profile_revision', entityId: created.id,
          diff: { organizationId: input.organizationId, propertyId: property.id, roomTypeId, targetRatePlanId, revision: created.revision, fields: keys },
        } });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { id: revision.id, revision: revision.revision, status: revision.status, submittedAt: revision.submittedAt.toISOString(), replayed: false };
    } catch (error) {
      const replay = await this.prisma.partnerProfileRevision.findFirst({ where: { organizationId: input.organizationId, submittedById: user.id, idempotencyKey }, select: { id: true, revision: true, status: true, submittedAt: true, requestHash: true } });
      if (replay) {
        if (replay.requestHash !== requestHash) throw new ConflictException('Khoá Idempotency-Key đã được dùng cho nội dung khác.');
        return { id: replay.id, revision: replay.revision, status: replay.status, submittedAt: replay.submittedAt.toISOString(), replayed: true };
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Một đề xuất khác vừa được gửi; tải lại rồi thử tạo lô mới.');
      throw error;
    }
  }

  async notifications(user: AuthenticatedUser) {
    const memberships = await this.prisma.partnerMembership.findMany({ where: { userId: user.id, status: { in: ['active', 'pending'] } }, select: { organizationId: true } });
    const rows = await this.prisma.partnerNotification.findMany({ where: { userId: user.id, organizationId: { in: memberships.map((item) => item.organizationId) } }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { items: rows.map((row) => ({ id: row.id, kind: row.kind, title: row.title, body: row.body, read: !!row.readAt, createdAt: row.createdAt.toISOString() })) };
  }

  async markNotificationRead(user: AuthenticatedUser, id: string, read = true) {
    const memberships = await this.prisma.partnerMembership.findMany({ where: { userId: user.id, status: { in: ['active', 'pending'] } }, select: { organizationId: true } });
    const updated = await this.prisma.partnerNotification.updateMany({ where: { id, userId: user.id, organizationId: { in: memberships.map((item) => item.organizationId) } }, data: { readAt: read ? new Date() : null } });
    if (!updated.count) throw new NotFoundException('Không tìm thấy thông báo.');
    return { id, read };
  }

  async notifyStaleInventory(): Promise<{ skipped: boolean; scannedDays: number; notificationsCreated: number }> {
    if (!(await this.settings.get<boolean>('partnerPortal.enabled')) || !(await this.settings.get<boolean>('inventoryCalendar.enabled'))) {
      return { skipped: true, scannedDays: 0, notificationsCreated: 0 };
    }
    const freshness = await this.settings.get<{ nearTermDays?: number; nearTermFreshHours?: number; fartherFreshDays?: number }>('inventory.freshness');
    const now = new Date();
    const todayText = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const from = dateOnly(todayText);
    const horizon = new Date(from);
    horizon.setUTCDate(horizon.getUTCDate() + 32);
    const grants = await this.prisma.partnerPropertyGrant.findMany({
      where: { status: 'active', canReadInventory: true, organization: { status: 'active' }, property: { operatingStatus: 'active' }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true, organizationId: true, propertyId: true, roomTypeScope: true, organization: { select: { memberships: { where: { status: 'active' }, select: { userId: true } } } } },
    });
    if (!grants.length) return { skipped: false, scannedDays: 0, notificationsCreated: 0 };
    const propertyIds = [...new Set(grants.map((grant) => grant.propertyId))];
    const rooms = await this.prisma.roomType.findMany({ where: { propertyId: { in: propertyIds }, status: 'active' }, select: { id: true, propertyId: true } });
    const scopes = new Map<string, Array<{ organizationId: string; users: string[] }>>();
    for (const room of rooms) for (const grant of grants) {
      if (grant.propertyId !== room.propertyId || !Array.isArray(grant.roomTypeScope) || !(grant.roomTypeScope.includes('*') || grant.roomTypeScope.includes(room.id))) continue;
      const roomScopes = scopes.get(room.id) ?? [];
      roomScopes.push({ organizationId: grant.organizationId, users: grant.organization.memberships.map((membership) => membership.userId) });
      scopes.set(room.id, roomScopes);
    }
    const roomTypeIds = [...scopes.keys()];
    const rows = roomTypeIds.length ? await this.prisma.inventoryDay.findMany({ where: { roomTypeId: { in: roomTypeIds }, stayDate: { gte: from, lt: horizon }, lastConfirmedAt: { not: null } }, select: { roomTypeId: true, stayDate: true, version: true, lastConfirmedAt: true } }) : [];
    const notices: Prisma.PartnerNotificationCreateManyInput[] = [];
    for (const row of rows) {
      const roomScopes = scopes.get(row.roomTypeId);
      if (!roomScopes?.length || !row.lastConfirmedAt) continue;
      const near = (row.stayDate.getTime() - now.getTime()) / 86_400_000 <= (freshness.nearTermDays ?? 7);
      const freshMilliseconds = (near ? (freshness.nearTermFreshHours ?? 24) : (freshness.fartherFreshDays ?? 7) * 24) * 3_600_000;
      if (now.getTime() - row.lastConfirmedAt.getTime() <= freshMilliseconds) continue;
      const stayDate = dayKey(row.stayDate);
      for (const scope of roomScopes) for (const userId of scope.users) notices.push({
          organizationId: scope.organizationId, userId, kind: 'inventory_confirmation_required',
          title: 'Cần xác nhận lại quỹ phòng', body: `Có ngày lưu trú ${stayDate} đã quá hạn xác nhận. Mở Lịch quỹ phòng để kiểm tra và xác nhận số liệu hiện tại.`,
          dedupeKey: `inventory-confirm:${scope.organizationId}:${row.roomTypeId}:${stayDate}:v${row.version}`,
        });
    }
    if (!notices.length) return { skipped: false, scannedDays: rows.length, notificationsCreated: 0 };
    const inserted = await this.prisma.partnerNotification.createMany({ data: notices, skipDuplicates: true });
    return { skipped: false, scannedDays: rows.length, notificationsCreated: inserted.count };
  }

  async adminOrganizations(status = 'all') {
    const rows = await this.prisma.partnerOrganization.findMany({
      where: status === 'all' ? {} : { status },
      include: {
        memberships: { include: { user: { select: { id: true, email: true, fullName: true, disabledAt: true } } }, orderBy: { createdAt: 'asc' } },
        _count: { select: { grants: true, claims: true, applications: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 250,
    });
    return { items: rows.map((row) => ({
      id: row.id, name: row.name, legalName: row.legalName, contactName: row.contactName, email: row.email,
      phone: row.phone, address: row.address, organizationType: row.organizationType, status: row.status,
      verificationStatus: row.verificationStatus, version: row.version, createdAt: row.createdAt.toISOString(),
      counts: row._count,
      members: row.memberships.map((membership) => ({ userId: membership.userId, name: membership.user.fullName,
        email: membership.user.email, disabled: !!membership.user.disabledAt, role: membership.role, status: membership.status,
        version: membership.version, createdAt: membership.createdAt.toISOString() })),
    })) };
  }

  async updateOrganization(id: string, input: UpdatePartnerOrganizationDto, reviewer: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.partnerOrganization.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Không tìm thấy tổ chức đối tác.');
      if (current.version !== input.expectedVersion) throw new ConflictException({ code: 'version_conflict', currentVersion: current.version });
      if (input.action === 'suspend' && current.status !== 'active' || input.action === 'restore' && current.status !== 'suspended') {
        throw new ConflictException(`Không thể ${input.action === 'suspend' ? 'tạm ngưng' : 'khôi phục'} tổ chức ở trạng thái ${current.status}.`);
      }
      const status = input.action === 'suspend' ? 'suspended' : 'active';
      const changed = await tx.partnerOrganization.updateMany({ where: { id, version: input.expectedVersion }, data: { status, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Tổ chức vừa được cập nhật ở nơi khác.');
      await this.notifyOrg(tx, id, `organization_${status}`, status === 'suspended' ? 'Tổ chức đã tạm ngưng' : 'Tổ chức đã được khôi phục', status === 'suspended' ? 'Các quyền truy cập bị tạm dừng cho tới khi quản trị viên khôi phục.' : 'Các quyền chưa hết hạn được áp dụng lại.');
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: `partner.organization_${input.action}`, entityType: 'partner_organization', entityId: id, diff: { from: current.status, to: status, versionFrom: input.expectedVersion, versionTo: input.expectedVersion + 1 } } });
      return { id, status, version: input.expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async addMembership(organizationId: string, input: AddPartnerMembershipDto, reviewer: AuthenticatedUser) {
    const email = input.email.trim().toLowerCase();
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.partnerOrganization.findUnique({ where: { id: organizationId } });
      if (!organization) throw new NotFoundException('Không tìm thấy tổ chức.');
      if (organization.status !== 'active') throw new ConflictException('Chỉ thêm thành viên cho tổ chức đang hoạt động.');
      const target = await tx.user.findUnique({ where: { email }, select: { id: true, fullName: true, email: true, disabledAt: true } });
      if (!target || target.disabledAt) throw new NotFoundException('Chưa có tài khoản hoạt động với email này. Người dùng cần tự đăng ký trước; hệ thống không gửi lời mời giả.');
      const current = await tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: target.id } } });
      if (current?.status === 'active') throw new ConflictException('Người này đã là thành viên đang hoạt động.');
      const membership = current
        ? await tx.partnerMembership.update({ where: { organizationId_userId: { organizationId, userId: target.id } }, data: { role: input.role, status: 'active', grantedById: reviewer.id, revokedAt: null, version: { increment: 1 } } })
        : await tx.partnerMembership.create({ data: { organizationId, userId: target.id, role: input.role, status: 'active', grantedById: reviewer.id } });
      await tx.partnerNotification.create({ data: { organizationId, userId: target.id, kind: 'membership_activated', title: 'Bạn đã được thêm vào tổ chức đối tác', body: `Vai trò thành viên: ${input.role}. Quyền từng cơ sở vẫn được xét riêng.` } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'partner.membership_added', entityType: 'partner_membership', entityId: target.id, diff: { organizationId, role: input.role, version: membership.version } } });
      return { organizationId, userId: target.id, name: target.fullName, email: target.email, role: membership.role, status: membership.status, version: membership.version };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateMembership(organizationId: string, userId: string, input: UpdatePartnerMembershipDto, reviewer: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.partnerMembership.findUnique({ where: { organizationId_userId: { organizationId, userId } }, include: { organization: true } });
      if (!membership) throw new NotFoundException('Không tìm thấy thành viên.');
      if (membership.version !== input.expectedVersion) throw new ConflictException({ code: 'version_conflict', currentVersion: membership.version });
      const nextStatus = input.action === 'revoke' ? 'revoked' : 'active';
      if (input.action === 'restore' && membership.organization.status !== 'active') {
        throw new ConflictException('Không thể khôi phục thành viên ở trạng thái này.');
      }
      if (input.action === 'revoke' && membership.status === 'active' && membership.role === 'owner') {
        const activeOwners = await tx.partnerMembership.count({ where: { organizationId, status: 'active', role: 'owner' } });
        if (activeOwners <= 1) throw new ConflictException('Không thể thu hồi thành viên chủ sở hữu cuối cùng.');
      }
      const changed = await tx.partnerMembership.updateMany({ where: { organizationId, userId, version: input.expectedVersion }, data: { status: nextStatus, revokedAt: nextStatus === 'revoked' ? new Date() : null, version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Thành viên vừa được cập nhật ở nơi khác.');
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: `partner.membership_${input.action}`, entityType: 'partner_membership', entityId: userId, diff: { organizationId, from: membership.status, to: nextStatus, versionFrom: input.expectedVersion, versionTo: input.expectedVersion + 1 } } });
      return { organizationId, userId, status: nextStatus, version: input.expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async adminApplications(status = 'pending') {
    const rows = await this.prisma.partnerApplication.findMany({
      where: status === 'all' ? {} : { status },
      include: { user: { select: { id: true, email: true, fullName: true, disabledAt: true } }, organization: { select: { id: true, name: true, phone: true, address: true, organizationType: true, status: true, verificationStatus: true } } },
      orderBy: { submittedAt: 'asc' }, take: 200,
    });
    return { items: rows.map((row) => ({ id: row.id, status: row.status, version: row.version, submittedAt: row.submittedAt.toISOString(), reviewNote: row.reviewNote, applicant: row.user, organization: row.organization })) };
  }

  async reviewApplication(id: string, input: ReviewPartnerApplicationDto, reviewer: AuthenticatedUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const application = await tx.partnerApplication.findUnique({ where: { id }, include: { organization: true } });
      if (!application) throw new NotFoundException('Không tìm thấy yêu cầu đăng ký.');
      if (application.version !== input.expectedVersion) throw new ConflictException({ code: 'version_conflict', currentVersion: application.version });
      if (!['pending', 'needs_info'].includes(application.status)) throw new ConflictException('Yêu cầu này đã được xử lý.');
      const status = input.action === 'approve' ? 'approved' : input.action === 'request_info' ? 'needs_info' : 'rejected';
      const updated = await tx.partnerApplication.updateMany({ where: { id, version: input.expectedVersion }, data: { status, reviewerId: reviewer.id, reviewedAt: new Date(), reviewNote: input.note?.trim() || null, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Yêu cầu vừa được người khác cập nhật.');
      const orgStatus = input.action === 'approve' ? 'active' : input.action === 'reject' ? 'rejected' : 'pending_review';
      await tx.partnerOrganization.update({ where: { id: application.organizationId }, data: { status: orgStatus, verificationStatus: input.action === 'approve' ? 'verified_by_admin' : 'manual_review', version: { increment: 1 } } });
      await tx.partnerMembership.updateMany({ where: { organizationId: application.organizationId, userId: application.userId }, data: { status: input.action === 'approve' ? 'active' : input.action === 'reject' ? 'revoked' : 'pending', revokedAt: input.action === 'reject' ? new Date() : null, grantedById: reviewer.id } });
      await tx.partnerNotification.create({ data: {
        organizationId: application.organizationId, userId: application.userId, kind: `application_${status}`,
        title: input.action === 'approve' ? 'Hồ sơ đối tác đã được duyệt' : input.action === 'reject' ? 'Hồ sơ đối tác chưa được duyệt' : 'Hồ sơ cần bổ sung',
        body: input.note?.trim() || (input.action === 'approve' ? 'Bạn có thể đăng nhập Cổng đối tác. Việc quản lý từng cơ sở vẫn cần được cấp quyền riêng.' : 'Vui lòng xem lại ghi chú và liên hệ quản trị viên nếu cần.'),
      } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: `partner.application_${input.action}`, entityType: 'partner_application', entityId: id, diff: { versionFrom: input.expectedVersion, versionTo: input.expectedVersion + 1, organizationId: application.organizationId } } });
      return { id, status, organizationStatus: orgStatus, version: input.expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return result;
  }

  async adminClaims(status = 'pending') {
    const rows = await this.prisma.propertyAccessClaim.findMany({
      where: status === 'all' ? {} : { status },
      include: { organization: { select: { id: true, name: true, status: true } }, property: { include: { content: { select: { title: true, publicationStatus: true, isDemo: true } }, roomTypes: { select: { id: true, name: true, code: true, status: true } } } } },
      orderBy: { createdAt: 'asc' }, take: 200,
    });
    return { items: rows.map((row) => ({ id: row.id, organization: row.organization, property: { id: row.propertyId, title: row.property.content.title, publicationStatus: row.property.content.publicationStatus, roomTypes: row.property.roomTypes }, status: row.status, reason: row.reason, version: row.version, createdAt: row.createdAt.toISOString(), reviewNote: row.reviewNote })) };
  }

  async reviewClaim(id: string, input: ReviewPropertyClaimDto, reviewer: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.propertyAccessClaim.findUnique({ where: { id }, include: { organization: true, property: { include: { roomTypes: { select: { id: true } } } } } });
      if (!claim) throw new NotFoundException('Không tìm thấy yêu cầu quyền cơ sở.');
      if (claim.status !== 'pending' || claim.version !== input.expectedVersion) throw new ConflictException({ code: 'claim_version_conflict', currentVersion: claim.version, status: claim.status });
      const status = input.action === 'approve' ? 'approved' : 'rejected';
      const scope = input.roomTypeScope ?? [];
      if (input.action === 'approve') {
        const allowedIds = new Set(claim.property.roomTypes.map((room) => room.id));
        if (scope.some((roomId) => roomId !== '*' && !allowedIds.has(roomId))) throw new BadRequestException('Phạm vi hạng phòng không thuộc cơ sở đang duyệt.');
        const scopeValue = scope.length ? scope : [];
        await tx.partnerPropertyGrant.upsert({
          where: { organizationId_propertyId: { organizationId: claim.organizationId, propertyId: claim.propertyId } },
          create: {
            organizationId: claim.organizationId, propertyId: claim.propertyId, claimId: claim.id,
            status: 'active', canReadInventory: input.canReadInventory ?? true,
            canWriteInventory: input.canWriteInventory ?? false, canEditRates: input.canEditRates ?? false,
            canEditProfile: input.canEditProfile ?? false, canUploadMedia: input.canUploadMedia ?? false,
            roomTypeScope: scopeValue, approvedById: reviewer.id, approvedAt: new Date(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          },
          update: {
            claimId: claim.id, status: 'active', canReadInventory: input.canReadInventory ?? true,
            canWriteInventory: input.canWriteInventory ?? false, canEditRates: input.canEditRates ?? false,
            canEditProfile: input.canEditProfile ?? false, canUploadMedia: input.canUploadMedia ?? false,
            roomTypeScope: scopeValue, approvedById: reviewer.id, approvedAt: new Date(), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, version: { increment: 1 },
          },
        });
      }
      await tx.propertyAccessClaim.update({ where: { id }, data: { status, reviewerId: reviewer.id, reviewedAt: new Date(), reviewNote: input.note?.trim() || null, version: { increment: 1 } } });
      await tx.partnerNotification.create({ data: {
        organizationId: claim.organizationId, userId: claim.requestedById,
        kind: `property_claim_${status}`, title: input.action === 'approve' ? 'Đã cấp quyền quản lý cơ sở' : 'Yêu cầu quản lý cơ sở chưa được duyệt',
        body: input.note?.trim() || (input.action === 'approve' ? 'Quyền đã được cấp theo phạm vi được ghi rõ trong hồ sơ.' : 'Vui lòng liên hệ quản trị viên nếu cần bổ sung thông tin.'),
      } });
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: `partner.property_claim_${input.action}`, entityType: 'property_access_claim', entityId: id, diff: { organizationId: claim.organizationId, propertyId: claim.propertyId, scope } } });
      return { id, status, grantCreated: input.action === 'approve' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listGrants(status = 'all') {
    const rows = await this.prisma.partnerPropertyGrant.findMany({
      where: status === 'all' ? {} : { status },
      include: { organization: { select: { id: true, name: true, status: true } }, property: { include: { content: { select: { title: true } }, roomTypes: { select: { id: true, name: true, code: true } } } } },
      orderBy: { updatedAt: 'desc' }, take: 300,
    });
    return { items: rows.map((row) => ({ id: row.id, organization: row.organization, property: { id: row.propertyId, title: row.property.content.title, roomTypes: row.property.roomTypes }, status: row.status, roomTypeScope: row.roomTypeScope, canReadInventory: row.canReadInventory, canWriteInventory: row.canWriteInventory, canEditRates: row.canEditRates, canEditProfile: row.canEditProfile, canUploadMedia: row.canUploadMedia, expiresAt: row.expiresAt?.toISOString() ?? null, version: row.version })) };
  }

  async updateGrant(id: string, input: {
    action?: 'revoke' | 'restore'; expectedVersion: number; canReadInventory?: boolean; canWriteInventory?: boolean;
    canEditRates?: boolean; canEditProfile?: boolean; canUploadMedia?: boolean; roomTypeScope?: string[]; expiresAt?: string;
  }, reviewer: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.partnerPropertyGrant.findUnique({ where: { id }, include: { property: { include: { roomTypes: { select: { id: true } } } } } });
      if (!current) throw new NotFoundException('Không tìm thấy quyền cơ sở.');
      const expectedVersion = input.expectedVersion;
      if (current.version !== expectedVersion) throw new ConflictException({ code: 'version_conflict', currentVersion: current.version });
      const action = input.action;
      const status = action === 'revoke' ? 'revoked' : action === 'restore' ? 'active' : current.status;
      const expiresAt = input.expiresAt === undefined ? current.expiresAt : input.expiresAt ? new Date(input.expiresAt) : null;
      if (input.expiresAt && (!Number.isFinite(expiresAt?.getTime()) || expiresAt! <= new Date())) throw new BadRequestException('Thời hạn quyền phải là ngày trong tương lai hợp lệ.');
      if (action === 'restore' && expiresAt && expiresAt <= new Date()) throw new ConflictException('Quyền đã hết hạn; cần cấp thời hạn mới.');
      if (input.roomTypeScope) {
        const allowed = new Set(current.property.roomTypes.map((room) => room.id));
        if (input.roomTypeScope.some((roomId) => roomId !== '*' && !allowed.has(roomId))) throw new BadRequestException('Phạm vi hạng phòng không thuộc cơ sở này.');
      }
      if ((input.canWriteInventory ?? current.canWriteInventory) && !(input.canReadInventory ?? current.canReadInventory)) throw new BadRequestException('Quyền ghi tồn cần đi cùng quyền xem tồn.');
      const data = {
        status, approvedById: reviewer.id, expiresAt, version: { increment: 1 },
        ...(input.canReadInventory !== undefined ? { canReadInventory: input.canReadInventory } : {}),
        ...(input.canWriteInventory !== undefined ? { canWriteInventory: input.canWriteInventory } : {}),
        ...(input.canEditRates !== undefined ? { canEditRates: input.canEditRates } : {}),
        ...(input.canEditProfile !== undefined ? { canEditProfile: input.canEditProfile } : {}),
        ...(input.canUploadMedia !== undefined ? { canUploadMedia: input.canUploadMedia } : {}),
        ...(input.roomTypeScope !== undefined ? { roomTypeScope: input.roomTypeScope } : {}),
      };
      const changed = await tx.partnerPropertyGrant.updateMany({ where: { id, version: expectedVersion }, data });
      if (changed.count !== 1) throw new ConflictException('Quyền vừa được cập nhật ở nơi khác.');
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: action ? `partner.grant_${action}` : 'partner.grant_scope_updated', entityType: 'partner_property_grant', entityId: id, diff: { organizationId: current.organizationId, propertyId: current.propertyId, from: current.status, to: status, versionFrom: expectedVersion, versionTo: expectedVersion + 1, changedFields: Object.keys(input).filter((key) => key !== 'expectedVersion') } } });
      if (status !== current.status) {
        await tx.partnerNotification.createMany({ data: await tx.partnerMembership.findMany({ where: { organizationId: current.organizationId, status: 'active' }, select: { userId: true } }).then((members) => members.map((member) => ({ organizationId: current.organizationId, userId: member.userId, kind: `grant_${status}`, title: status === 'revoked' ? 'Quyền cơ sở đã bị thu hồi' : 'Quyền cơ sở đã được khôi phục', body: 'Quyền được áp dụng ngay; vui lòng tải lại trang để cập nhật phạm vi.' }))) });
      }
      return { id, status, version: expectedVersion + 1 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async adminRevisions(status = 'pending') {
    const rows = await this.prisma.partnerProfileRevision.findMany({
      where: status === 'all' ? {} : { status },
      include: { organization: { select: { id: true, name: true } }, property: { include: { content: { select: { title: true } } } }, author: { select: { fullName: true, email: true } } },
      orderBy: { submittedAt: 'asc' }, take: 200,
    });
    return { items: rows.map((row) => ({ id: row.id, organization: row.organization, property: { id: row.propertyId, title: row.property.content.title }, roomTypeId: row.roomTypeId, targetRatePlanId: row.targetRatePlanId, revision: row.revision, baseVersion: row.baseVersion, contentBaseVersion: row.contentBaseVersion, proposed: row.proposed, status: row.status, version: row.version, author: row.author, submittedAt: row.submittedAt.toISOString() })) };
  }

  async reviewRevision(id: string, input: ReviewPartnerRevisionDto, reviewer: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const revision = await tx.partnerProfileRevision.findUnique({ where: { id }, include: { property: { include: { content: true } }, organization: true } });
      if (!revision) throw new NotFoundException('Không tìm thấy bản đề xuất.');
      if (revision.version !== input.expectedVersion) throw new ConflictException({ code: 'revision_version_conflict', currentVersion: revision.version });
      if (revision.status !== 'pending') throw new ConflictException('Bản đề xuất đã được xử lý hoặc đang có xung đột.');
      const proposed = object(revision.proposed);
      const now = new Date();

      if (input.action === 'request_changes' || input.action === 'reject') {
        const status = input.action === 'reject' ? 'rejected' : 'needs_changes';
        await tx.partnerProfileRevision.updateMany({ where: { id, status: 'pending', version: input.expectedVersion }, data: { status, reviewedById: reviewer.id, reviewedAt: now, reviewNote: input.note?.trim() || null, version: { increment: 1 } } });
        await this.notifyOrg(tx, revision.organizationId, `revision_${status}`, input.action === 'reject' ? 'Bản đề xuất chưa được duyệt' : 'Bản đề xuất cần chỉnh sửa', input.note?.trim() || 'Vui lòng xem lại nội dung đề xuất.');
        await tx.auditLog.create({ data: { actorId: reviewer.id, action: `partner.revision_${input.action}`, entityType: 'partner_profile_revision', entityId: id, diff: { organizationId: revision.organizationId, revision: revision.revision } } });
        return { id, status };
      }

      if (revision.targetRatePlanId) {
        const current = await tx.ratePlan.findUnique({ where: { id: revision.targetRatePlanId } });
        if (!current) throw new NotFoundException('Bảng giá đã bị xoá.');
        if (current.version !== revision.baseVersion) {
          await tx.partnerProfileRevision.updateMany({ where: { id, status: 'pending', version: input.expectedVersion }, data: { status: 'conflict', reviewedById: reviewer.id, reviewedAt: now, reviewNote: 'Bảng giá đã đổi sau khi gửi; giữ nguyên đề xuất để đối chiếu.', version: { increment: 1 } } });
          await this.notifyOrg(tx, revision.organizationId, 'revision_conflict', 'Bản đề xuất có xung đột phiên bản', 'Bảng giá đã được cập nhật sau thời điểm gửi. Đề xuất vẫn được giữ để đối chiếu; không có nội dung nào bị ghi đè.');
          await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'partner.revision_conflict', entityType: 'partner_profile_revision', entityId: id, diff: { organizationId: revision.organizationId, revision: revision.revision, currentVersion: current.version, submittedBaseVersion: revision.baseVersion } } });
          return { id, status: 'conflict', currentVersion: current.version, proposed: revision.proposed };
        }
        const rateData: Prisma.RatePlanUpdateInput = {
          ...(proposed.baseRateVnd !== undefined ? { baseRateVnd: BigInt(String(proposed.baseRateVnd)) } : {}),
          ...(proposed.weekendRateVnd !== undefined ? { weekendRateVnd: proposed.weekendRateVnd === null ? null : BigInt(String(proposed.weekendRateVnd)) } : {}),
          ...(proposed.breakfastIncluded !== undefined ? { breakfastIncluded: Boolean(proposed.breakfastIncluded) } : {}),
          ...(proposed.minStayNights !== undefined ? { minStayNights: Number(proposed.minStayNights) } : {}),
          ...(proposed.maxStayNights !== undefined ? { maxStayNights: proposed.maxStayNights === null ? null : Number(proposed.maxStayNights) } : {}),
          ...(proposed.inclusions !== undefined ? { inclusions: json(proposed.inclusions) } : {}),
          version: { increment: 1 },
        };
        const updated = await tx.ratePlan.updateMany({ where: { id: current.id, version: revision.baseVersion }, data: rateData });
        if (updated.count !== 1) throw new ConflictException('Bảng giá vừa đổi; giữ nguyên đề xuất để đối chiếu.');
        await this.touchPublishedStay(tx, revision.property.content, revision.property.contentId, reviewer.id, revision.id, revision.revision, 'rate', now);
      } else if (revision.roomTypeId) {
        const current = await tx.roomType.findUnique({ where: { id: revision.roomTypeId } });
        if (!current) throw new NotFoundException('Hạng phòng đã bị xoá.');
        if (current.version !== revision.baseVersion) {
          await tx.partnerProfileRevision.updateMany({ where: { id, status: 'pending', version: input.expectedVersion }, data: { status: 'conflict', reviewedById: reviewer.id, reviewedAt: now, reviewNote: 'Hạng phòng đã đổi sau khi gửi; giữ nguyên đề xuất để đối chiếu.', version: { increment: 1 } } });
          await this.notifyOrg(tx, revision.organizationId, 'revision_conflict', 'Bản đề xuất có xung đột phiên bản', 'Hạng phòng đã được cập nhật sau thời điểm gửi. Đề xuất vẫn được giữ để đối chiếu; không có nội dung nào bị ghi đè.');
          await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'partner.revision_conflict', entityType: 'partner_profile_revision', entityId: id, diff: { organizationId: revision.organizationId, revision: revision.revision, currentVersion: current.version, submittedBaseVersion: revision.baseVersion } } });
          return { id, status: 'conflict', currentVersion: current.version, proposed: revision.proposed };
        }
        const maxAdults = proposed.maxAdults === undefined ? current.maxAdults : Number(proposed.maxAdults);
        const maxChildren = proposed.maxChildren === undefined ? current.maxChildren : Number(proposed.maxChildren);
        const updated = await tx.roomType.updateMany({ where: { id: current.id, version: revision.baseVersion }, data: {
          ...(proposed.name !== undefined ? { name: String(proposed.name).trim().slice(0, 160) } : {}),
          ...(proposed.description !== undefined ? { description: String(proposed.description).trim().slice(0, 10000) || null } : {}),
          ...(proposed.bedSummary !== undefined ? { bedSummary: String(proposed.bedSummary).trim().slice(0, 300) || null } : {}),
          ...(proposed.areaSqm !== undefined ? { areaSqm: Number(proposed.areaSqm) } : {}),
          ...(proposed.unitKind !== undefined ? { unitKind: String(proposed.unitKind).slice(0, 80) } : {}),
          ...(proposed.bedroomCount !== undefined ? { bedroomCount: Number(proposed.bedroomCount) } : {}),
          ...(proposed.bathroomCount !== undefined ? { bathroomCount: Number(proposed.bathroomCount) } : {}),
          ...(proposed.maxAdults !== undefined ? { maxAdults } : {}), ...(proposed.maxChildren !== undefined ? { maxChildren } : {}),
          ...(proposed.maxAdults !== undefined || proposed.maxChildren !== undefined ? { maxOccupancy: maxAdults + maxChildren } : {}),
          version: { increment: 1 },
        } });
        if (updated.count !== 1) throw new ConflictException('Hạng phòng vừa đổi; giữ nguyên đề xuất để đối chiếu.');
        await this.touchPublishedStay(tx, revision.property.content, revision.property.contentId, reviewer.id, revision.id, revision.revision, 'room', now);
      } else {
        const property = await tx.property.findUnique({ where: { id: revision.propertyId }, include: { content: true } });
        if (!property) throw new NotFoundException('Cơ sở đã bị xoá.');
        if (property.version !== revision.baseVersion || property.content.version !== revision.contentBaseVersion) {
          await tx.partnerProfileRevision.updateMany({ where: { id, status: 'pending', version: input.expectedVersion }, data: { status: 'conflict', reviewedById: reviewer.id, reviewedAt: now, reviewNote: 'Cơ sở hoặc nội dung đã đổi sau khi gửi; không ghi đè.', version: { increment: 1 } } });
          await this.notifyOrg(tx, revision.organizationId, 'revision_conflict', 'Bản đề xuất có xung đột phiên bản', 'Hồ sơ cơ sở đã được cập nhật sau thời điểm gửi. Đề xuất vẫn được giữ để đối chiếu; không có nội dung nào bị ghi đè.');
          await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'partner.revision_conflict', entityType: 'partner_profile_revision', entityId: id, diff: { organizationId: revision.organizationId, revision: revision.revision, currentPropertyVersion: property.version, currentContentVersion: property.content.version, submittedBaseVersion: revision.baseVersion, submittedContentBaseVersion: revision.contentBaseVersion } } });
          return { id, status: 'conflict', currentVersion: property.version, currentContentVersion: property.content.version, proposed: revision.proposed };
        }
        const nodeData: Prisma.ContentNodeUpdateInput = {
          ...(proposed.title !== undefined ? { title: String(proposed.title).trim().slice(0, 300) } : {}),
          ...(proposed.excerpt !== undefined ? { excerpt: String(proposed.excerpt).trim().slice(0, 500) || null } : {}),
          ...(proposed.descriptionDocument !== undefined ? { bodyDocument: json(proposed.descriptionDocument) } : {}),
          version: { increment: 1 }, ...(property.content.publicationStatus === 'published' ? { lastPublicChangedAt: now } : {}),
        };
        const updatedNode = await tx.contentNode.updateMany({ where: { id: property.contentId, version: revision.contentBaseVersion! }, data: nodeData });
        if (updatedNode.count !== 1) throw new ConflictException('Nội dung vừa đổi; giữ nguyên đề xuất để đối chiếu.');
        const propertyData: Prisma.PropertyUpdateInput = {
          ...(proposed.area !== undefined ? { area: String(proposed.area).trim().slice(0, 160) } : {}),
          ...(proposed.address !== undefined ? { address: String(proposed.address).trim().slice(0, 300) } : {}),
          ...(proposed.checkInTime !== undefined ? { checkInTime: String(proposed.checkInTime).trim().slice(0, 20) } : {}),
          ...(proposed.checkOutTime !== undefined ? { checkOutTime: String(proposed.checkOutTime).trim().slice(0, 20) } : {}),
          ...((proposed.houseRules !== undefined || proposed.notes !== undefined) ? { approvedPolicies: json({
            ...object(property.approvedPolicies),
            ...(Array.isArray(proposed.houseRules) ? { houseRules: proposed.houseRules.map((text) => ({ icon: 'lock', text: String(text) })) } : {}),
            ...(Array.isArray(proposed.notes) ? { notes: proposed.notes } : {}),
          }) } : {}),
          version: { increment: 1 },
        };
        const updatedProperty = await tx.property.updateMany({ where: { id: property.id, version: revision.baseVersion }, data: propertyData });
        if (updatedProperty.count !== 1) throw new ConflictException('Hồ sơ cơ sở vừa đổi; giữ nguyên đề xuất để đối chiếu.');
        if (Array.isArray(proposed.media)) {
          const assets = await this.assertMediaAvailableTx(tx, (proposed.media as Array<{ mediaId: string }>).map((item) => item.mediaId), revision.organizationId);
          await tx.mediaAsset.updateMany({ where: { id: { in: assets.filter((asset) => asset.ownerOrganizationId === revision.organizationId).map((asset) => asset.id) } }, data: { visibility: 'public' } });
          await tx.contentMedia.deleteMany({ where: { contentId: property.contentId, role: { in: ['cover', 'gallery'] } } });
          await tx.contentMedia.createMany({ data: (proposed.media as Array<{ mediaId: string; role: 'cover' | 'gallery'; position: number }>).map((item) => ({ contentId: property.contentId, mediaId: item.mediaId, role: item.role, position: item.position })) });
        }
        const savedNode = await tx.contentNode.findUniqueOrThrow({ where: { id: property.contentId } });
        const mediaRows = await tx.contentMedia.findMany({ where: { contentId: property.contentId }, select: { mediaId: true, role: true, position: true } });
        await tx.contentRevision.create({ data: {
          contentId: property.contentId, documentSnapshot: savedNode.bodyDocument ?? { type: 'doc', content: [] },
          contentSnapshot: json({ title: savedNode.title, excerpt: savedNode.excerpt, media: mediaRows, approvedPartnerRevisionId: revision.id }),
          note: `Duyệt thay đổi đối tác #${revision.revision}`, authorId: reviewer.id,
        } });
      }
      const reviewMoved = await tx.partnerProfileRevision.updateMany({ where: { id, status: 'pending', version: input.expectedVersion }, data: { status: 'approved', reviewedById: reviewer.id, reviewedAt: now, reviewNote: input.note?.trim() || null, version: { increment: 1 } } });
      if (reviewMoved.count !== 1) throw new ConflictException('Bản đề xuất vừa được quản trị viên khác xử lý.');
      await this.notifyOrg(tx, revision.organizationId, 'revision_approved', 'Bản đề xuất đã được duyệt', input.note?.trim() || 'Thông tin đã được cập nhật theo bản được duyệt.');
      await tx.auditLog.create({ data: { actorId: reviewer.id, action: 'partner.revision_approved', entityType: 'partner_profile_revision', entityId: id, diff: { organizationId: revision.organizationId, propertyId: revision.propertyId, revision: revision.revision } } });
      return { id, status: 'approved' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async touchPublishedStay(
    tx: Prisma.TransactionClient,
    content: { publicationStatus: string; version: number; bodyDocument: Prisma.JsonValue | null; title: string; excerpt: string | null },
    contentId: string,
    reviewerId: string,
    revisionId: string,
    revisionNumber: number,
    changedSection: 'room' | 'rate',
    now: Date,
  ) {
    if (content.publicationStatus !== 'published') return;
    const touched = await tx.contentNode.updateMany({ where: { id: contentId, version: content.version }, data: { version: { increment: 1 }, lastPublicChangedAt: now } });
    if (touched.count !== 1) throw new ConflictException('Trang cơ sở vừa được cập nhật; giữ nguyên đề xuất để đối chiếu.');
    const saved = await tx.contentNode.findUniqueOrThrow({ where: { id: contentId }, select: { title: true, excerpt: true, bodyDocument: true } });
    await tx.contentRevision.create({ data: {
      contentId, documentSnapshot: saved.bodyDocument ?? { type: 'doc', content: [] },
      contentSnapshot: json({ title: saved.title, excerpt: saved.excerpt, approvedPartnerRevisionId: revisionId, changedSection }),
      note: `Duyệt thay đổi ${changedSection === 'room' ? 'hạng phòng' : 'giá'} từ đối tác #${revisionNumber}`, authorId: reviewerId,
    } });
  }

  private async activeMembership(organizationId: string, userId: string, capability: 'read' | 'write' = 'read') {
    const membership = await this.prisma.partnerMembership.findFirst({ where: { organizationId, userId, status: 'active', organization: { status: 'active' } }, include: { organization: { select: { id: true, status: true } } } });
    if (!membership) throw new ForbiddenException('Tổ chức chưa được duyệt hoặc tài khoản không còn thành viên.');
    if (capability === 'write' && !['owner', 'manager'].includes(membership.role)) throw new ForbiddenException('Vai trò thành viên chỉ được xem dữ liệu; cần quyền quản lý được cấp để sửa.');
    return membership;
  }

  private async activeGrant(organizationId: string, propertyId: string) {
    const grant = await this.prisma.partnerPropertyGrant.findFirst({ where: { organizationId, propertyId, status: 'active', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
    if (!grant) throw new ForbiddenException('Chưa có quyền được duyệt cho cơ sở này.');
    return grant;
  }

  private async roomProperty(roomTypeId: string) {
    const room = await this.prisma.roomType.findUnique({ where: { id: roomTypeId }, select: { id: true, propertyId: true } });
    if (!room) throw new NotFoundException('Không tìm thấy hạng phòng.');
    return room;
  }

  private inScope(scopeValue: unknown, roomTypeId: string): boolean {
    return Array.isArray(scopeValue) && (scopeValue.includes('*') || scopeValue.includes(roomTypeId));
  }

  private async assertMediaAvailable(ids: string[], organizationId: string): Promise<void> {
    await this.assertMediaAvailableTx(this.prisma, ids, organizationId);
  }

  private async assertMediaAvailableTx(tx: PrismaService | Prisma.TransactionClient, ids: string[], organizationId: string) {
    if (!ids.length) return [] as Array<{ id: string; ownerOrganizationId: string | null }>;
    const uniqueIds = [...new Set(ids)];
    const rows = await tx.mediaAsset.findMany({ where: {
      id: { in: uniqueIds }, isDemo: false, processingStatus: 'ready',
      OR: [{ visibility: 'public' }, { visibility: 'private', ownerOrganizationId: organizationId }],
    }, select: { id: true, ownerOrganizationId: true } });
    if (rows.length !== uniqueIds.length) throw new BadRequestException('Một hoặc nhiều ảnh không thuộc Media Library được phép dùng.');
    return rows;
  }

  private async notifyOrg(tx: Prisma.TransactionClient, organizationId: string, kind: string, title: string, body: string) {
    const members = await tx.partnerMembership.findMany({ where: { organizationId, status: 'active' }, select: { userId: true } });
    if (members.length) await tx.partnerNotification.createMany({ data: members.map((member) => ({ organizationId, userId: member.userId, kind, title, body })) });
  }
}
