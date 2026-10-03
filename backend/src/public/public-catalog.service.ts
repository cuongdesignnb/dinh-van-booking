import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { loadConfig } from '../common/config/env';
import { documentToText } from '../content/document';

type AssetRow = {
  storageKey: string;
  originalFilename: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
};

type MediaLink = { role: string; position: number; media: AssetRow };

type PublicNode = {
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
  updatedAt: Date;
  firstPublishedAt: Date | null;
  lastPublicChangedAt: Date | null;
  routes: Array<{ path: string }>;
  media: MediaLink[];
  property: PublicProperty | null;
  destination: PublicDestination | null;
  combo: PublicCombo | null;
  reviews: PublicReview[];
  article: PublicArticle | null;
};

type PublicArticle = { authorName: string | null; readMinutes: number | null };

type PublicProperty = {
  id: string;
  kind: string;
  area: string;
  address: string;
  latitude: unknown;
  longitude: unknown;
  operatingStatus: string;
  checkInTime: string;
  checkOutTime: string;
  ratingAverage: unknown;
  ratingCount: number;
  approvedPolicies: unknown;
  roomTypes: Array<{
    id: string;
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
    units: Array<{ id: string; active: boolean }>;
    amenities: Array<{ amenity: { code: string; label: string; iconKey: string } }>;
    ratePlans: Array<{
      id: string;
      name: string;
      baseRateVnd: bigint;
      weekendRateVnd: bigint | null;
      breakfastIncluded: boolean;
      active: boolean;
    }>;
  }>;
  amenities: Array<{ amenity: { code: string; label: string; iconKey: string } }>;
};

type PublicDestination = {
  category: string;
  location: string | null;
  mapX: unknown;
  mapY: unknown;
};

type PublicCombo = {
  id: string;
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
    id: string;
    departureDate: Date;
    returnDate: Date;
    capacity: number;
    heldCount: number;
    reservedCount: number;
    adultPriceVnd: bigint;
    childPriceVnd: bigint | null;
    status: string;
  }>;
};

type PublicReview = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  stayedAt: Date | null;
  contentId: string;
};

const NODE_INCLUDE = {
  routes: { where: { isCurrent: true }, take: 1 },
  media: {
    where: { media: { isDemo: false, visibility: 'public', processingStatus: 'ready' } },
    include: { media: { select: { storageKey: true, originalFilename: true, altText: true, caption: true, width: true, height: true } } },
    orderBy: { position: 'asc' as const },
  },
  property: {
    include: {
      amenities: { include: { amenity: { select: { code: true, label: true, iconKey: true } } } },
      roomTypes: {
        where: { status: 'active' },
        orderBy: { position: 'asc' as const },
        include: {
          amenities: { include: { amenity: { select: { code: true, label: true, iconKey: true } } } },
          units: { where: { active: true }, select: { id: true, active: true } },
          ratePlans: { where: { active: true }, orderBy: { createdAt: 'asc' as const } },
        },
      },
    },
  },
  destination: true,
  combo: {
    include: {
      days: { include: { activities: { orderBy: { position: 'asc' as const } } }, orderBy: { dayNo: 'asc' as const } },
      destinations: { orderBy: { position: 'asc' as const } },
      departures: { where: { status: 'open' }, orderBy: { departureDate: 'asc' as const } },
    },
  },
  article: true,
  reviews: { where: { moderation: 'approved', isDemo: false }, orderBy: { createdAt: 'desc' as const }, take: 50 },
} as const;

export function hasSellableStayRoom(
  roomTypes: readonly { capacityVerified: boolean; units: readonly { active: boolean }[]; ratePlans: readonly { active: boolean; baseRateVnd: bigint }[] }[],
): boolean {
  return roomTypes.some(
    (room) => room.capacityVerified && room.units.some((unit) => unit.active)
      && room.ratePlans.some((rate) => rate.active && rate.baseRateVnd >= 0n),
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mediaIdsIn(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) mediaIdsIn(item, result);
    return result;
  }
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/mediaId$/i.test(key) && typeof child === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(child)) result.add(child);
    mediaIdsIn(child, result);
  }
  return result;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textFromDocument(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textFromDocument).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  const node = value as Record<string, unknown>;
  return [node.text, textFromDocument(node.content)].filter((v): v is string => typeof v === 'string' && v.length > 0).join(' ');
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function approvedOrigin(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') return null;
    if (!hostname.includes('.') || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.test') || hostname.endsWith('.invalid') || hostname.endsWith('.vercel.app') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

@Injectable()
export class PublicCatalogService {
  private readonly config = loadConfig();

  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async site(): Promise<{ settings: Record<string, unknown>; media: Record<string, unknown>; assets: Record<string, unknown>; generatedAt: string }> {
    const settings = await this.settings.publicSnapshot();
    const identity = record(settings['brand.identity']);
    const seo = record(settings['seo.defaults']);
    const ids = {
      logo: identity.logoMediaId,
      favicon: identity.faviconMediaId,
      og: seo.ogMediaId,
    };
    const mediaIds = [...new Set([...mediaIdsIn(settings), ...Object.values(ids).filter((id): id is string => typeof id === 'string' && id.length > 0)])];
    const rows = mediaIds.length ? await this.prisma.mediaAsset.findMany({
      where: { id: { in: mediaIds }, isDemo: false, visibility: 'public', processingStatus: 'ready' },
      select: { id: true, storageKey: true, originalFilename: true, altText: true, caption: true, width: true, height: true },
    }) : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const toAsset = (id: unknown) => {
      if (typeof id !== 'string') return null;
      const row = byId.get(id);
      if (!row) return null;
      return {
        id: row.id,
        src: `/media/${row.storageKey}`,
        alt: row.altText ?? row.originalFilename,
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        caption: row.caption ?? undefined,
      };
    };
    const assets = Object.fromEntries(rows.map((row) => [row.id, toAsset(row.id)]));
    return {
      settings,
      media: {
        logo: toAsset(ids.logo),
        favicon: toAsset(ids.favicon) ? { src: '/api/v1/public/favicon.png', alt: toAsset(ids.favicon)?.alt, width: 96, height: 96 } : null,
        og: toAsset(ids.og),
      },
      assets,
      generatedAt: new Date().toISOString(),
    };
  }

  async seoPolicy() {
    const settings = await this.settings.publicSnapshot();
    const seo = record(settings['seo.defaults']);
    const identity = record(settings['brand.identity']);
    const dataMode = record(settings['ops.dataMode']);
    const origin = approvedOrigin(seo.canonicalBase);
    const approved = approvedOrigin(process.env.SEO_APPROVED_CANONICAL_ORIGIN);
    const deploymentAllows = process.env.SEO_INDEXING_ALLOWED === 'true';
    const blockedReasons: string[] = [];
    if (!deploymentAllows) blockedReasons.push('Môi trường triển khai chưa bật SEO_INDEXING_ALLOWED.');
    if (seo.robotsIndex !== true) blockedReasons.push('Cài đặt SEO của website đang tắt index.');
    if (!origin) blockedReasons.push('Tên miền chính thức chưa phải origin HTTPS hợp lệ.');
    if (!approved || origin !== approved) blockedReasons.push('Tên miền chưa khớp origin được Owner duyệt ở môi trường triển khai.');
    if (dataMode.usesDemoData === true) blockedReasons.push('Nội dung website đang chờ xác minh.');
    const identityDescription = documentToText(identity.description) || (typeof identity.description === 'string' ? identity.description.trim() : '');
    if (typeof identity.name !== 'string' || !identity.name.trim() || !identityDescription) {
      blockedReasons.push('Thiếu tên hoặc mô tả thương hiệu đã xác nhận.');
    }
    return {
      indexingAllowed: deploymentAllows
        && seo.robotsIndex === true
        && !!origin
        && origin === approved
        && dataMode.usesDemoData !== true
        && typeof identity.name === 'string' && !!identity.name.trim()
        && !!identityDescription,
      canonicalOrigin: origin && origin === approved ? origin : null,
      blockedReasons,
      structuredData: {
        core: record(settings['seo.structuredData']).core !== false,
        offers: false,
        reviews: false,
        vacationRental: false,
        blockedCommercialReasons: {
          offers: 'Chưa có public pricing/inventory contract đã xác minh.',
          reviews: 'Chưa có public review workflow đủ điều kiện.',
          vacationRental: 'Chưa xác nhận điều kiện tích hợp và dữ liệu Vacation Rental.',
        },
      },
    };
  }

  async favicon(): Promise<Buffer> {
    const settings = await this.settings.publicSnapshot();
    const identity = record(settings['brand.identity']);
    const id = identity.faviconMediaId;
    if (typeof id !== 'string') throw new NotFoundException('Chưa cấu hình favicon');
    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id, isDemo: false, visibility: 'public', processingStatus: 'ready' },
      select: { storageKey: true },
    });
    if (!asset || asset.storageKey.includes('/') || asset.storageKey.includes('\\') || asset.storageKey.includes('..')) {
      throw new NotFoundException('Không tìm thấy favicon công khai');
    }
    try {
      const source = await readFile(join(this.config.mediaRoot, asset.storageKey));
      return await sharp(source, { failOn: 'error' }).resize(96, 96, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    } catch {
      throw new InternalServerErrorException('Không thể tạo favicon từ ảnh đã duyệt');
    }
  }

  async resolveRoute(path: string): Promise<{ kind: 'current' } | { kind: 'redirect'; path: string; status: 301 | 308 }> {
    if (typeof path !== 'string' || path.length > 240 || !path.startsWith('/') || path.startsWith('//') || /[?#\\\\\u0000-\u001f]/.test(path)) {
      throw new NotFoundException('Không tìm thấy đường dẫn');
    }
    const normalizedPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
    const route = await this.prisma.publicRoute.findUnique({
      where: { path: normalizedPath },
      include: {
        content: {
          select: {
            isDemo: true,
            publicationStatus: true,
            publishAt: true,
            routes: { where: { isCurrent: true }, take: 1, select: { path: true } },
          },
        },
      },
    });
    const current = route?.content.routes[0]?.path;
    const isPublic = !!route
      && route.content.isDemo === false
      && route.content.publicationStatus === 'published'
      && (!route.content.publishAt || route.content.publishAt <= new Date());
    if (!route || !isPublic) throw new NotFoundException('Không tìm thấy đường dẫn công khai');
    if (route.isCurrent) return { kind: 'current' };
    if (!current || current === normalizedPath || !current.startsWith('/') || current.startsWith('//')) {
      throw new NotFoundException('Không tìm thấy đường dẫn công khai');
    }
    // Normalize historic 301 rows at read time; no production data rewrite.
    return { kind: 'redirect', path: current, status: 308 };
  }

  /** Resolve old query-dialog URLs only to a currently public database route. */
  async legacyTarget(kind: string, value: string): Promise<{ path: string }> {
    if (!['combo', 'destination'].includes(kind)
      || typeof value !== 'string'
      || value.length > 100
      || !/^[a-z0-9-]+$/i.test(value)) {
      throw new NotFoundException('Không tìm thấy nội dung công khai');
    }

    const identifiers: Prisma.ContentNodeWhereInput[] = [{ slugSource: value }];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      identifiers.push({ id: value });
      if (kind === 'combo') identifiers.push({ combo: { is: { id: value } } });
    }

    const node = await this.prisma.contentNode.findFirst({
      where: {
        kind,
        isDemo: false,
        publicationStatus: 'published',
        AND: [
          { OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
          { OR: identifiers },
        ],
      },
      select: { routes: { where: { isCurrent: true }, take: 1, select: { path: true } } },
    });
    const path = node?.routes[0]?.path;
    const prefix = kind === 'combo' ? '/combo-du-lich/' : '/diem-den/';
    if (!path || !path.startsWith(prefix) || path.includes('?') || path.includes('#')) {
      throw new NotFoundException('Không tìm thấy nội dung công khai');
    }
    return { path };
  }

  async seoUrls(): Promise<{ items: Array<{ path: string; lastModified: string | null }> }> {
    const now = new Date();
    const where = {
      isDemo: false,
      noindex: false,
      publicationStatus: 'published',
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      routes: { some: { isCurrent: true } },
      media: { some: { role: 'cover', media: { isDemo: false, visibility: 'public', processingStatus: 'ready' } } },
    } satisfies Prisma.ContentNodeWhereInput;
    const eligible: Array<{ kind: string; path: string; lastModified: string | null }> = [];
    let cursor: string | undefined;
    const batchSize = 500;

    for (let loaded = 0; loaded < 50000;) {
      const rows = await this.prisma.contentNode.findMany({
        where,
        orderBy: { id: 'asc' },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: Math.min(batchSize, 50000 - loaded),
        select: {
          id: true,
          kind: true,
          title: true,
          slugSource: true,
          excerpt: true,
          bodyDocument: true,
          lastPublicChangedAt: true,
          routes: { where: { isCurrent: true }, take: 1, select: { path: true } },
          media: { where: { role: 'cover', media: { isDemo: false, visibility: 'public', processingStatus: 'ready' } }, take: 1, select: { mediaId: true } },
          property: {
            select: {
              operatingStatus: true,
              roomTypes: {
                where: { status: 'active' },
                select: {
                  units: { where: { active: true }, select: { id: true } },
                  ratePlans: { where: { active: true }, select: { baseRateVnd: true } },
                },
              },
            },
          },
          combo: { select: { days: { take: 1, select: { dayNo: true } } } },
          destination: { select: { contentId: true } },
          article: { select: { contentId: true } },
        },
      });
      if (!rows.length) break;
      cursor = rows[rows.length - 1].id;
      loaded += rows.length;
      for (const row of rows) {
        const path = row.routes[0]?.path;
        const bodyText = `${row.excerpt ?? ''} ${textFromDocument(row.bodyDocument)}`.replace(/\s+/g, ' ').trim();
        if (!path || !row.slugSource || !row.title.trim() || bodyText.length < 160 || !row.media.length) continue;
        if (path.includes('?') || path.includes('#') || path.startsWith('//') || path !== `/${path.split('/').filter(Boolean).join('/')}`) continue;
        const kindEligible = row.kind === 'stay'
          ? row.property?.operatingStatus === 'active'
            && row.property.roomTypes.some((room) => room.units.length > 0 && room.ratePlans.some((rate) => rate.baseRateVnd >= 0n))
          : row.kind === 'combo'
            ? !!row.combo?.days.length
            : row.kind === 'destination'
              ? !!row.destination
              : row.kind === 'article'
                ? !!row.article
                : row.kind === 'page';
        if (!kindEligible) continue;
        eligible.push({ kind: row.kind, path, lastModified: row.lastPublicChangedAt?.toISOString() ?? null });
      }
      if (rows.length < batchSize) break;
    }
    if (eligible.length >= 50000) throw new InternalServerErrorException('Sitemap vượt giới hạn; cần chia sitemap theo loại nội dung');

    const paths = new Map<string, string | null>();
    const indexableByKind = new Set(eligible.map((item) => item.kind));
    const latest = (kind?: string) => {
      const values = eligible.filter((item) => !kind || item.kind === kind).map((item) => item.lastModified).filter((value): value is string => !!value).sort();
      return values.at(-1) ?? null;
    };
    for (const entry of eligible) paths.set(entry.path, entry.lastModified);
    if (eligible.length) paths.set('/', latest());
    const collections: Array<[string, string]> = [
      ['/phong-nghi', 'stay'], ['/combo-du-lich', 'combo'], ['/diem-den', 'destination'],
      ['/bai-viet', 'article'], ['/chuyen-trang', 'page'],
    ];
    for (const [path, kind] of collections) if (indexableByKind.has(kind)) paths.set(path, latest(kind));

    const contact = record((await this.settings.publicSnapshot())['brand.contact']);
    if ((typeof contact.phone === 'string' && contact.phone.trim()) || (typeof contact.email === 'string' && contact.email.trim())) {
      paths.set('/lien-he', null);
    }
    return { items: [...paths].map(([path, lastModified]) => ({ path, lastModified })) };
  }

  async pages(): Promise<{ items: Array<{ id: string; title: string; slug: string; path: string; updatedAt: string | null; noindex: boolean }>; generatedAt: string }> {
    const rows = await this.prisma.contentNode.findMany({
      where: {
        kind: 'page',
        isDemo: false,
        publicationStatus: 'published',
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
      include: { routes: { where: { isCurrent: true }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      items: rows.flatMap((row) => row.slugSource && row.routes[0]
        ? [{ id: row.id, title: row.title, slug: row.slugSource, path: row.routes[0].path, updatedAt: row.lastPublicChangedAt?.toISOString() ?? null, noindex: row.noindex }]
        : []),
      generatedAt: new Date().toISOString(),
    };
  }

  async page(slug: string) {
    const row = await this.prisma.contentNode.findFirst({
      where: {
        kind: 'page',
        slugSource: slug,
        isDemo: false,
        publicationStatus: 'published',
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
      include: NODE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Không tìm thấy chuyên trang');
    const node = row as unknown as PublicNode;
    const media = [...node.media].sort((a, b) => a.position - b.position);
    const cover = this.asset(media.find((item) => item.role === 'cover') ?? media[0]);
    return {
      id: node.id,
      title: node.title,
      slug: node.slugSource,
      path: node.routes[0]?.path ?? `/chuyen-trang/${node.slugSource ?? slug}`,
      excerpt: node.excerpt,
      body: node.bodyDocument,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      cover,
      updatedAt: node.lastPublicChangedAt?.toISOString() ?? null,
      firstPublishedAt: node.firstPublishedAt?.toISOString() ?? null,
      lastPublicChangedAt: node.lastPublicChangedAt?.toISOString() ?? null,
    };
  }

  async stays(featured = false): Promise<{ items: ReturnType<PublicCatalogService['toStay']>[]; generatedAt: string }> {
    const nodes = await this.prisma.contentNode.findMany({
      where: {
        kind: 'stay',
        isDemo: false,
        publicationStatus: 'published',
        ...(featured ? { featured: true } : {}),
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
      include: NODE_INCLUDE,
      orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
    });
    const items = (nodes as unknown as PublicNode[])
      .filter((node) => node.property?.operatingStatus === 'active' && hasSellableStayRoom(node.property.roomTypes))
      .map((node) => this.toStay(node));
    return { items, generatedAt: new Date().toISOString() };
  }

  async availability(query: Record<string, string>) {
    if (!(await this.settings.get<boolean>('publicAvailability.enabled'))) return { enabled: false, items: [], generatedAt: new Date().toISOString() };
    const checkIn = query.checkIn;
    const checkOut = query.checkOut;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut ?? '')) {
      throw new NotFoundException('Cần chọn ngày nhận và trả phòng hợp lệ.');
    }
    const from = new Date(`${checkIn}T00:00:00.000Z`);
    const to = new Date(`${checkOut}T00:00:00.000Z`);
    const nightCount = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.toISOString().slice(0, 10) !== checkIn || to.toISOString().slice(0, 10) !== checkOut || nightCount < 1 || nightCount > 30) {
      throw new NotFoundException('Khoảng lưu trú phải từ 1 đến 30 đêm.');
    }
    const quantity = Number(query.rooms ?? '1');
    const adults = Number(query.adults ?? '1');
    const children = Number(query.children ?? '0');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5 || !Number.isInteger(adults) || adults < 1 || adults > 20 || !Number.isInteger(children) || children < 0 || children > 12) {
      throw new NotFoundException('Số phòng hoặc số khách không hợp lệ.');
    }
    const dates = Array.from({ length: nightCount }, (_, index) => {
      const date = new Date(from);
      date.setUTCDate(date.getUTCDate() + index);
      return date;
    });
    const now = new Date();
    const freshness = await this.settings.get<{ nearTermDays?: number; nearTermFreshHours?: number; fartherFreshDays?: number }>('inventory.freshness');
    const properties = await this.prisma.property.findMany({
      where: {
        operatingStatus: 'active', content: { isDemo: false, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        ...(query.area ? { area: { contains: query.area.trim().slice(0, 80), mode: 'insensitive' as const } } : {}),
        ...(query.kind && ['homestay', 'hotel', 'resort', 'villa'].includes(query.kind) ? { kind: query.kind } : {}),
      },
      include: {
        content: { select: { title: true, excerpt: true, routes: { where: { isCurrent: true }, take: 1, select: { path: true } }, media: { where: { role: 'cover', media: { isDemo: false, visibility: 'public', processingStatus: 'ready' } }, take: 1, select: { media: { select: { storageKey: true, altText: true, width: true, height: true } } } } } },
        roomTypes: { where: { status: 'active', capacityVerified: true }, include: { ratePlans: { where: { active: true }, select: { baseRateVnd: true } } } },
      },
      take: 300,
    });
    const roomIds = properties.flatMap((property) => property.roomTypes.map((room) => room.id));
    const [inventory, incidents] = roomIds.length ? await Promise.all([
      this.prisma.inventoryDay.findMany({ where: { roomTypeId: { in: roomIds }, stayDate: { in: dates } } }),
      this.prisma.inventoryIntegrityIncident.findMany({ where: { roomTypeId: { in: roomIds }, stayDate: { in: dates }, resolvedAt: null }, select: { roomTypeId: true, stayDate: true } }),
    ]) : [[], []];
    const inventoryByKey = new Map(inventory.map((row) => [`${row.roomTypeId}:${isoDate(row.stayDate)}`, row]));
    const incidentKeys = new Set(incidents.map((row) => `${row.roomTypeId}:${isoDate(row.stayDate)}`));
    const items = [] as Array<Record<string, unknown>>;
    for (const property of properties) {
      const route = property.content.routes[0]?.path;
      if (!route || !route.startsWith('/phong-nghi/')) continue;
      let best: Record<string, unknown> | null = null;
      for (const room of property.roomTypes) {
        if (adults > room.maxAdults * quantity || children > room.maxChildren * quantity || adults + children > room.maxOccupancy * quantity) continue;
        const rows = dates.map((date) => inventoryByKey.get(`${room.id}:${isoDate(date)}`));
        const hasIncident = dates.some((date) => incidentKeys.has(`${room.id}:${isoDate(date)}`));
        const isFresh = rows.every((row, index) => {
          if (!row?.lastConfirmedAt) return false;
          const near = (dates[index].getTime() - now.getTime()) / 86_400_000 <= (freshness.nearTermDays ?? 7);
          const maxAge = (near ? freshness.nearTermFreshHours ?? 24 : (freshness.fartherFreshDays ?? 7) * 24) * 3_600_000;
          return now.getTime() - row.lastConfirmedAt.getTime() <= maxAge;
        });
        const eachNightAvailable = rows.map((row) => row ? row.capacity - row.blockedCount - row.heldCount - row.reservedCount : null);
        const sellable = !hasIncident && isFresh && rows.every((row, index) => !!row && !row.stopSell && eachNightAvailable[index] !== null && eachNightAvailable[index]! >= quantity);
        const hasRate = room.ratePlans.some((rate) => rate.baseRateVnd > 0n);
        const status = hasIncident ? 'needs_check' : !isFresh ? 'stale' : sellable ? 'available' : 'sold_out';
        const cover = property.content.media[0]?.media;
        const candidate = {
          propertyId: property.id, roomTypeId: room.id, name: property.content.title, roomTypeName: room.name,
          area: property.area, excerpt: property.content.excerpt, path: route,
          cover: cover ? { url: `${this.config.mediaPublicBase.replace(/\/$/, '')}/${cover.storageKey}`, alt: cover.altText, width: cover.width, height: cover.height } : null,
          status, requestVerification: status === 'stale' || status === 'needs_check',
          availableForStay: sellable, priceMode: !hasRate ? 'contact' : 'published_rate',
          lastConfirmedAt: rows.map((row) => row?.lastConfirmedAt?.toISOString() ?? null).filter(Boolean).sort().at(0) ?? null,
          checkIn, checkOut, nights: nightCount, quantity,
        };
        if (status === 'available') { best = candidate; break; }
        if (!best || (status === 'needs_check' && best.status === 'sold_out')) best = candidate;
      }
      if (best) items.push(best);
    }
    return { enabled: true, items, generatedAt: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', checkIn, checkOut };
  }

  async stay(slug: string): Promise<ReturnType<PublicCatalogService['toStay']>> {
    const node = await this.prisma.contentNode.findFirst({
      where: {
        kind: 'stay',
        isDemo: false,
        slugSource: slug,
        publicationStatus: 'published',
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
      include: NODE_INCLUDE,
    });
    if (
      !node
      || !(node as unknown as PublicNode).property
      || (node as unknown as PublicNode).property?.operatingStatus !== 'active'
      || !hasSellableStayRoom((node as unknown as PublicNode).property!.roomTypes)
    ) {
      throw new NotFoundException('Không tìm thấy chỗ nghỉ');
    }
    return this.toStay(node as unknown as PublicNode);
  }

  async combos(): Promise<{ items: ReturnType<PublicCatalogService['toCombo']>[]; generatedAt: string }> {
    const nodes = await this.prisma.contentNode.findMany({
      where: { kind: 'combo', isDemo: false, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
      orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
    });
    return { items: (nodes as unknown as PublicNode[]).filter((node) => node.combo).map((node) => this.toCombo(node)), generatedAt: new Date().toISOString() };
  }

  async combo(slug: string): Promise<ReturnType<PublicCatalogService['toCombo']>> {
    const node = await this.prisma.contentNode.findFirst({
      where: { kind: 'combo', isDemo: false, slugSource: slug, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
    });
    if (!node || !(node as unknown as PublicNode).combo) throw new NotFoundException('Không tìm thấy combo');
    return this.toCombo(node as unknown as PublicNode);
  }

  async destinations(): Promise<{ items: ReturnType<PublicCatalogService['toDestination']>[]; generatedAt: string }> {
    const nodes = await this.prisma.contentNode.findMany({
      where: { kind: 'destination', isDemo: false, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
      orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
    });
    return { items: (nodes as unknown as PublicNode[]).filter((node) => node.destination).map((node) => this.toDestination(node)), generatedAt: new Date().toISOString() };
  }

  async destination(slug: string): Promise<ReturnType<PublicCatalogService['toDestination']>> {
    const node = await this.prisma.contentNode.findFirst({
      where: { kind: 'destination', isDemo: false, slugSource: slug, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
    });
    if (!node || !(node as unknown as PublicNode).destination) throw new NotFoundException('Không tìm thấy điểm đến');
    return this.toDestination(node as unknown as PublicNode);
  }

  async articles(): Promise<{ items: Array<ReturnType<PublicCatalogService['toArticle']>>; generatedAt: string }> {
    const nodes = await this.prisma.contentNode.findMany({
      where: { kind: 'article', isDemo: false, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
      orderBy: [{ featured: 'desc' }, { lastPublicChangedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: (nodes as unknown as PublicNode[]).filter((node) => !!node.article).map((node) => this.toArticle(node)), generatedAt: new Date().toISOString() };
  }

  async article(slug: string): Promise<ReturnType<PublicCatalogService['toArticle']>> {
    const node = await this.prisma.contentNode.findFirst({
      where: { kind: 'article', isDemo: false, slugSource: slug, publicationStatus: 'published', OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
      include: NODE_INCLUDE,
    });
    if (!node || !(node as unknown as PublicNode).article) throw new NotFoundException('Không tìm thấy bài viết');
    return this.toArticle(node as unknown as PublicNode);
  }

  async reviews(contentId?: string): Promise<{ items: ReturnType<PublicCatalogService['toReview']>[]; generatedAt: string }> {
    const rows = await this.prisma.review.findMany({
      where: {
        moderation: 'approved',
        isDemo: false,
        ...(contentId ? { contentId } : {}),
        content: {
          publicationStatus: 'published',
          isDemo: false,
          OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items: rows.map((row) => this.toReview(row as unknown as PublicReview)), generatedAt: new Date().toISOString() };
  }

  private asset(link: MediaLink | undefined): Record<string, unknown> | null {
    if (!link) return null;
    return {
      src: `/media/${link.media.storageKey}`,
      alt: link.media.altText ?? link.media.originalFilename,
      width: link.media.width ?? 1200,
      height: link.media.height ?? 800,
      caption: link.media.caption ?? undefined,
    };
  }

  private toStay(node: PublicNode) {
    const property = node.property!;
    const media = [...node.media].sort((a, b) => a.position - b.position);
    const image = this.asset(media.find((item) => item.role === 'cover') ?? media[0]);
    const amenities = property.amenities.map((item) => item.amenity);
    const rooms = property.roomTypes.filter((room) => hasSellableStayRoom([room])).map((room) => {
      const rate = room.ratePlans.find((plan) => plan.active && plan.baseRateVnd >= 0n)!;
      const roomGallery = media.filter((item) => item.role === `room:${room.id}`).map((item) => this.asset(item)).filter((item): item is Record<string, unknown> => !!item);
      return {
        id: room.id,
        name: room.name,
        unitKind: room.unitKind,
        bedroomCount: room.bedroomCount,
        bathroomCount: room.bathroomCount,
        capacity: room.maxOccupancy,
        areaM2: room.areaSqm ?? 0,
        view: room.bedSummary ?? '',
        description: room.description ?? '',
        amenities: room.amenities.map((item) => ({ code: item.amenity.code, label: item.amenity.label })),
        pricePerNight: Number(rate.baseRateVnd),
        image: roomGallery[0] ?? image,
        gallery: roomGallery,
        breakfastIncluded: rate?.breakfastIncluded ?? false,
        maxRooms: room.units.filter((unit) => unit.active).length,
      };
    });
    const body = record(node.bodyDocument);
    const policies = record(property.approvedPolicies);
    const contentText = textFromDocument(node.bodyDocument);
    const location = property.area || property.address;
    return {
      id: property.id,
      slug: node.slugSource ?? node.routes[0]?.path.split('/').pop() ?? property.id,
      publicPath: node.routes[0]?.path ?? `/phong-nghi/${node.slugSource ?? property.id}`,
      name: node.title,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      firstPublishedAt: node.firstPublishedAt?.toISOString() ?? null,
      lastPublicChangedAt: node.lastPublicChangedAt?.toISOString() ?? null,
      type: property.kind,
      area: property.area.toLowerCase().includes('tràng') || property.area.toLowerCase().includes('trang') ? 'trang-an' : 'cuc-phuong',
      rating: property.ratingAverage === null ? 0 : Number(property.ratingAverage),
      reviewCount: property.ratingCount,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      location,
      address: property.address,
      amenities: amenities.map((item) => item.code),
      amenityLabels: Object.fromEntries(amenities.map((item) => [item.code, item.label])),
      cardFeatures: amenities.slice(0, 3).map((item) => ({ icon: item.code, label: item.label })),
      cardSummary: node.excerpt ?? contentText.slice(0, 240),
      tagline: typeof body.tagline === 'string' ? body.tagline : node.excerpt ?? '',
      description: contentText,
      body: node.bodyDocument,
      highlights: list(body.highlights).filter((item): item is string => typeof item === 'string'),
      badge: node.featured ? 'Nổi bật' : undefined,
      featured: node.featured,
      popularity: node.featured ? 1 : 0,
      image,
      home: image ? { image, location, tags: amenities.slice(0, 2).map((item) => item.label) } : undefined,
      gallery: media.filter((item) => item.role === 'cover' || item.role === 'gallery').map((item) => this.asset(item)).filter((item): item is Record<string, unknown> => !!item),
      galleryNote: typeof body.galleryNote === 'string' ? body.galleryNote : undefined,
      host: null,
      roomTypes: rooms,
      mapPin: null,
      nearby: [],
      houseRules: list(policies.houseRules ?? policies.rules)
        .map((item) => record(item))
        .filter((item) => typeof item.text === 'string')
        .map((item) => ({ icon: typeof item.icon === 'string' ? item.icon : 'lock', text: item.text as string })),
      notes: list(policies.notes).filter((item): item is string => typeof item === 'string'),
      isDemo: false,
    };
  }

  private toCombo(node: PublicNode) {
    const combo = node.combo!;
    const media = [...node.media].sort((a, b) => a.position - b.position);
    const image = this.asset(media.find((item) => item.role === 'cover') ?? media[0]);
    const departures = combo.departures.map((departure) => ({
      id: departure.id,
      date: isoDate(departure.departureDate),
      returnDate: isoDate(departure.returnDate),
      capacity: departure.capacity,
      available: departure.capacity - departure.heldCount - departure.reservedCount,
      adultPriceVnd: Number(departure.adultPriceVnd),
      childPriceVnd: departure.childPriceVnd === null ? null : Number(departure.childPriceVnd),
      status: departure.status,
    }));
    const fromPrice = departures.length ? Math.min(...departures.map((item) => item.adultPriceVnd)) : null;
    return {
      id: combo.id,
      slug: node.slugSource ?? node.routes[0]?.path.split('/').pop() ?? combo.id,
      publicPath: node.routes[0]?.path ?? `/combo-du-lich/${node.slugSource ?? combo.id}`,
      title: node.title,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      firstPublishedAt: node.firstPublishedAt?.toISOString() ?? null,
      lastPublicChangedAt: node.lastPublicChangedAt?.toISOString() ?? null,
      subtitle: node.excerpt ?? textFromDocument(node.bodyDocument).slice(0, 240),
      body: node.bodyDocument,
      image,
      durationDays: combo.durationDays,
      durationNights: combo.durationNights,
      audienceTags: list(combo.audienceTags).filter((item): item is string => typeof item === 'string'),
      fromPriceVnd: fromPrice,
      priceUnit: combo.pricingUnit,
      badge: { label: node.featured ? 'Nổi bật' : 'Đang mở', kind: node.featured ? 'featured' : 'standard' },
      itinerary: combo.days.map((day) => ({ day: day.dayNo, title: day.title, items: day.activities.map((item) => item.text) })),
      included: list(combo.inclusions).filter((item): item is string => typeof item === 'string'),
      excluded: list(combo.exclusions).filter((item): item is string => typeof item === 'string'),
      terms: list(combo.terms).filter((item): item is string => typeof item === 'string'),
      departures,
      isDemo: false,
    };
  }

  private toDestination(node: PublicNode) {
    const destination = node.destination!;
    const body = record(node.bodyDocument);
    const media = [...node.media].sort((a, b) => a.position - b.position);
    const image = this.asset(media.find((item) => item.role === 'cover') ?? media[0]);
    return {
      id: destination ? node.id : node.id,
      slug: node.slugSource ?? node.routes[0]?.path.split('/').pop() ?? node.id,
      publicPath: node.routes[0]?.path ?? `/diem-den/${node.slugSource ?? node.id}`,
      name: node.title,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      firstPublishedAt: node.firstPublishedAt?.toISOString() ?? null,
      lastPublicChangedAt: node.lastPublicChangedAt?.toISOString() ?? null,
      featured: node.featured,
      category: destination.category,
      location: destination.location,
      summary: node.excerpt ?? textFromDocument(node.bodyDocument).slice(0, 240),
      description: textFromDocument(node.bodyDocument),
      body: node.bodyDocument,
      image,
      gallery: media.filter((item) => item.role === 'cover' || item.role === 'gallery').map((item) => this.asset(item)).filter((item): item is Record<string, unknown> => !!item),
      tags: list(body.tags).filter((item): item is string => typeof item === 'string'),
      activities: list(body.activities).filter((item): item is string => typeof item === 'string'),
      notes: list(body.notes).filter((item): item is string => typeof item === 'string'),
      badge: typeof body.badge === 'string' ? body.badge : 'Điểm đến',
      isDemo: false,
    };
  }

  private toArticle(node: PublicNode) {
    const media = [...node.media].sort((a, b) => a.position - b.position);
    return {
      id: node.id,
      slug: node.slugSource ?? node.routes[0]?.path.split('/').pop() ?? node.id,
      path: node.routes[0]?.path ?? `/bai-viet/${node.slugSource ?? node.id}`,
      title: node.title,
      excerpt: node.excerpt,
      body: node.bodyDocument,
      metaTitle: node.metaTitle,
      metaDescription: node.metaDescription,
      noindex: node.noindex,
      cover: this.asset(media.find((item) => item.role === 'cover') ?? media[0]),
      authorName: node.article?.authorName ?? null,
      readMinutes: node.article?.readMinutes ?? null,
      firstPublishedAt: node.firstPublishedAt?.toISOString() ?? null,
      lastPublicChangedAt: node.lastPublicChangedAt?.toISOString() ?? null,
      isDemo: false,
    };
  }

  private toReview(row: PublicReview) {
    return {
      id: row.id,
      author: row.authorName,
      rating: row.rating,
      quote: row.body,
      date: row.stayedAt?.toISOString().slice(0, 10),
      avatar: null,
      isDemo: false,
    };
  }
}
