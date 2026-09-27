import { cache } from 'react';
import type { Combo } from '@/data/combos';
import type { Destination } from '@/data/destinations';
import type { ImageAsset, Review, RoomType } from '@/data/types';
import type { Stay } from '@/data/stays';
import type { RichDocument } from '@/lib/content/rich-document';
import { ApiError, serverApiRequest } from './client';

export interface PublicMediaAsset {
  id?: string;
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface PublicSeoUrl {
  path: string;
  lastModified: string | null;
}

export interface PublicSiteData {
  identity: {
    name?: string;
    shortName?: string;
    tagline?: string;
    description?: string;
    logoMediaId?: string | null;
    faviconMediaId?: string | null;
  };
  contact: {
    phone?: string | null;
    hotline?: string | null;
    zaloUrl?: string | null;
    email?: string | null;
    address?: string | null;
    mapUrl?: string | null;
  };
  social: Record<'facebook' | 'instagram' | 'youtube' | 'tiktok', string | null | undefined>;
  businessHours: Record<string, unknown>;
  seo: Record<string, unknown>;
  media?: { logo?: PublicMediaAsset | null; favicon?: PublicMediaAsset | null; og?: PublicMediaAsset | null };
  assets?: Record<string, PublicMediaAsset>;
  [key: string]: unknown;
}

type PublicSiteResponse = {
  settings?: Record<string, unknown>;
  media?: PublicSiteData['media'];
  assets?: PublicSiteData['assets'];
};

type ApiAsset = { src?: string; alt?: string; width?: number; height?: number; caption?: string } | null;

function asset(value: ApiAsset): ImageAsset | null {
  if (!value?.src) return null;
  return {
    src: value.src,
    alt: value.alt ?? '',
    width: value.width ?? 1200,
    height: value.height ?? 800,
    caption: value.caption,
  };
}

function asSite(value: Record<string, unknown>): PublicSiteData {
  return {
    identity: (value['brand.identity'] as PublicSiteData['identity']) ?? {},
    contact: (value['brand.contact'] as PublicSiteData['contact']) ?? {},
    social: (value['brand.social'] as PublicSiteData['social']) ?? { facebook: null, instagram: null, youtube: null, tiktok: null },
    businessHours: (value['brand.businessHours'] as Record<string, unknown>) ?? {},
    seo: (value['seo.defaults'] as Record<string, unknown>) ?? {},
    media: (value['public.media'] as PublicSiteData['media']) ?? undefined,
    ...value,
  };
}

const loadPublicSite = cache(async (): Promise<PublicSiteData> => {
  const response = await serverApiRequest<PublicSiteResponse>('/public/site');
  return { ...asSite(response?.settings ?? {}), media: response?.media, assets: response?.assets ?? {} };
});

export function getPublicSite(): Promise<PublicSiteData> {
  return loadPublicSite();
}

export async function getPublicSeoUrls(): Promise<PublicSeoUrl[]> {
  const response = await serverApiRequest<{ items: PublicSeoUrl[] }>('/public/seo/urls');
  return response?.items ?? [];
}

async function loadPublicLegacyTarget(kind: 'combo' | 'destination', value: string): Promise<string | null> {
  const query = new URLSearchParams({ kind, value });
  try {
    const result = await serverApiRequest<{ path: string }>(`/public/legacy-target?${query}`);
    return result?.path ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getPublicLegacyTarget = cache(loadPublicLegacyTarget);

type ApiRoom = {
  id: string;
  name: string;
  capacity: number;
  areaM2: number;
  view: string;
  description: string;
  pricePerNight: number;
  image: ApiAsset;
  breakfastIncluded: boolean;
  maxRooms: number;
};

type ApiStay = Omit<Stay, 'image' | 'gallery' | 'roomTypes' | 'home' | 'host' | 'mapPin' | 'isDemo' | 'cardFeatures'> & {
  body?: RichDocument | null;
  image: ApiAsset;
  gallery?: ApiAsset[];
  roomTypes?: ApiRoom[];
  home?: { image: ApiAsset; location: string; tags: string[] };
  cardFeatures?: Array<{ icon: string; label: string }>;
  mapPin?: { x: number; y: number } | null;
};

function normalizeStay(value: ApiStay): Stay | null {
  const image = asset(value.image);
  if (!image) return null;
  const rooms: RoomType[] = (value.roomTypes ?? [])
    .map((room) => {
      const roomImage = asset(room.image) ?? image;
      return { ...room, image: roomImage };
    })
    .filter((room) => Number.isFinite(room.pricePerNight) && room.pricePerNight > 0);
  if (!rooms.length) return null;
  const features = (value.cardFeatures ?? []).filter((feature) => !!feature.label?.trim()).slice(0, 3).map((feature) => ({ icon: feature.icon as never, label: feature.label }));
  const gallery = (value.gallery ?? []).map(asset).filter((item): item is ImageAsset => !!item);
  return {
    ...value,
    descriptionDocument: value.body ?? value.descriptionDocument,
    type: value.type as Stay['type'],
    area: value.area as Stay['area'],
    amenities: value.amenities as Stay['amenities'],
    cardFeatures: features as unknown as Stay['cardFeatures'],
    image,
    gallery,
    home: value.home?.image
      ? { image: asset(value.home.image) ?? image, location: value.home.location, tags: [value.home.tags[0] ?? '', value.home.tags[1] ?? ''] }
      : undefined,
    host: null,
    roomTypes: rooms,
    mapPin: value.mapPin ?? undefined,
    nearby: value.nearby ?? [],
    isDemo: false,
  };
}

const loadPublicStays = cache(async (featured = false): Promise<Stay[]> => {
  const response = await serverApiRequest<{ items?: ApiStay[] }>(`/public/stays${featured ? '?featured=true' : ''}`);
  return (response?.items ?? []).map(normalizeStay).filter((item): item is Stay => !!item);
});

export function getPublicStays(featured = false): Promise<Stay[]> {
  return loadPublicStays(featured);
}

async function loadPublicStay(slug: string): Promise<Stay | null> {
  try {
    const response = await serverApiRequest<ApiStay>(`/public/stays/${encodeURIComponent(slug)}`);
    return response ? normalizeStay(response) : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getPublicStay = cache(loadPublicStay);

type ApiCombo = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  body?: RichDocument | null;
  image: ApiAsset;
  durationDays: number;
  durationNights: number;
  fromPriceVnd: number | null;
  priceUnit: string;
  badge: { label: string; kind: string };
  itinerary: Array<{ day: number; title: string; items: string[] }>;
  included: string[];
  excluded: string[];
  publicPath?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
  featured?: boolean;
  isDemo?: boolean;
};

export interface PublicComboRecord {
  id: string;
  slug: string;
  publicPath: string;
  title: string;
  subtitle: string;
  body: RichDocument | null;
  image: ImageAsset | null;
  durationDays: number;
  durationNights: number;
  fromPriceVnd: number | null;
  priceUnit: string;
  itinerary: Array<{ day: string; title: string; items: string[] }>;
  included: string[];
  excluded: string[];
  noindex: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  firstPublishedAt: string | null;
  lastPublicChangedAt: string | null;
  isDemo: false;
}

async function loadPublicCombo(slug: string): Promise<PublicComboRecord | null> {
  try {
    const item = await serverApiRequest<ApiCombo & {
      publicPath?: string; metaTitle?: string | null; metaDescription?: string | null; noindex?: boolean;
      firstPublishedAt?: string | null; lastPublicChangedAt?: string | null; isDemo?: boolean;
    }>(`/public/combos/${encodeURIComponent(slug)}`);
    if (!item || item.isDemo) return null;
    return {
      ...item,
      publicPath: item.publicPath ?? `/combo-du-lich/${item.slug}`,
      image: asset(item.image),
      itinerary: item.itinerary.map((day) => ({ ...day, day: String(day.day) })),
      noindex: item.noindex === true,
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      firstPublishedAt: item.firstPublishedAt ?? null,
      lastPublicChangedAt: item.lastPublicChangedAt ?? null,
      isDemo: false,
    } as PublicComboRecord;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getPublicCombo = cache(loadPublicCombo);

const loadPublicCombos = cache(async (): Promise<Combo[]> => {
  const response = await serverApiRequest<{ items?: ApiCombo[] }>('/public/combos');
  return (response?.items ?? []).map((item): Combo | null => {
    if (item.isDemo) return null;
    const image = asset(item.image);
    if (!image || item.fromPriceVnd === null) return null;
    const lines = item.included.slice(0, 3).map((text, index) => ({ icon: (['leaf', 'food', 'route'] as const)[index] ?? 'leaf', text }));
    return {
      id: item.id,
      slug: item.slug,
      publicPath: item.publicPath ?? `/combo-du-lich/${item.slug}`,
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      noindex: item.noindex === true,
      firstPublishedAt: item.firstPublishedAt ?? null,
      lastPublicChangedAt: item.lastPublicChangedAt ?? null,
      title: item.title,
      subtitle: item.subtitle,
      body: item.body ?? undefined,
      durationDays: item.durationDays,
      durationNights: item.durationNights,
      badge: { label: item.badge.label, icon: 'calendar' as const },
      audienceTags: [],
      includedHighlights: lines,
      fromPriceVnd: item.fromPriceVnd,
      priceUnit: 'người' as const,
      popularity: 0,
      image,
      itinerary: item.itinerary.map((day) => ({ day: `Ngày ${day.day}`, items: day.items })),
      included: item.included,
      excluded: item.excluded,
      isDemo: false,
    } as Combo;
  }).filter((item): item is Combo => !!item);
});

export function getPublicCombos(): Promise<Combo[]> {
  return loadPublicCombos();
}

type ApiDestination = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  summary: string;
  description: string;
  body?: RichDocument | null;
  image: ApiAsset;
  tags: string[];
  activities: string[];
  notes: string[];
  badge: string;
  publicPath?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
  featured?: boolean;
  isDemo?: boolean;
};

const loadPublicDestinations = cache(async (): Promise<Destination[]> => {
  const response = await serverApiRequest<{ items?: ApiDestination[] }>('/public/destinations');
  return (response?.items ?? []).map((item): Destination | null => {
    if (item.isDemo) return null;
    const image = asset(item.image);
    if (!image) return null;
    return {
      id: item.id,
      slug: item.slug,
      publicPath: item.publicPath ?? `/diem-den/${item.slug}`,
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      noindex: item.noindex === true,
      firstPublishedAt: item.firstPublishedAt ?? null,
      lastPublicChangedAt: item.lastPublicChangedAt ?? null,
      name: item.name,
      subtitle: item.location ?? item.summary,
      badge: item.badge,
      tags: item.tags as Destination['tags'],
      summary: item.summary,
      tips: item.activities.slice(0, 3).map((text) => ({ icon: 'check' as const, text })),
      description: item.description,
      body: item.body ?? undefined,
      activities: item.activities,
      notes: item.notes,
      image,
      featured: item.featured === true,
      isDemo: false,
    } as Destination;
  }).filter((item): item is Destination => !!item);
});

export function getPublicDestinations(): Promise<Destination[]> {
  return loadPublicDestinations();
}

export interface PublicDestinationRecord extends Destination {
  slug: string;
  publicPath: string;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  firstPublishedAt: string | null;
  lastPublicChangedAt: string | null;
  isDemo: boolean;
}

async function loadPublicDestination(slug: string): Promise<PublicDestinationRecord | null> {
  try {
    const item = await serverApiRequest<ApiDestination & {
      publicPath?: string; metaTitle?: string | null; metaDescription?: string | null; noindex?: boolean;
      firstPublishedAt?: string | null; lastPublicChangedAt?: string | null; isDemo?: boolean;
    }>(`/public/destinations/${encodeURIComponent(slug)}`);
    if (!item || item.isDemo) return null;
    const image = asset(item.image);
    if (!image) return null;
    return {
      id: item.id,
      slug: item.slug,
      publicPath: item.publicPath ?? `/diem-den/${item.slug}`,
      name: item.name,
      subtitle: item.location ?? item.summary,
      badge: item.badge,
      tags: item.tags as Destination['tags'],
      summary: item.summary,
      tips: item.activities.slice(0, 3).map((text) => ({ icon: 'check' as const, text })),
      description: item.description,
      body: item.body ?? undefined,
      activities: item.activities,
      notes: item.notes,
      image,
      featured: item.featured === true,
      isDemo: false,
      metaTitle: item.metaTitle ?? null,
      metaDescription: item.metaDescription ?? null,
      noindex: item.noindex === true,
      firstPublishedAt: item.firstPublishedAt ?? null,
      lastPublicChangedAt: item.lastPublicChangedAt ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getPublicDestination = cache(loadPublicDestination);

export interface PublicArticleRecord {
  id: string;
  slug: string;
  path: string;
  title: string;
  excerpt: string | null;
  body: RichDocument | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  cover: ImageAsset | null;
  authorName: string | null;
  readMinutes: number | null;
  firstPublishedAt: string | null;
  lastPublicChangedAt: string | null;
  isDemo: boolean;
}

type ApiArticle = Omit<PublicArticleRecord, 'cover'> & { cover: ApiAsset };

async function loadPublicArticles(): Promise<PublicArticleRecord[]> {
  const response = await serverApiRequest<{ items: ApiArticle[] }>('/public/articles');
  return (response?.items ?? []).flatMap((item) => {
    if (item.isDemo) return [];
    return [{ ...item, cover: asset(item.cover), isDemo: false }];
  });
}

export const getPublicArticles = cache(loadPublicArticles);

async function loadPublicArticle(slug: string): Promise<PublicArticleRecord | null> {
  try {
    const item = await serverApiRequest<ApiArticle>(`/public/articles/${encodeURIComponent(slug)}`);
    if (!item || item.isDemo) return null;
    return { ...item, cover: asset(item.cover), isDemo: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export const getPublicArticle = cache(loadPublicArticle);

export async function getPublicReviews(contentId?: string): Promise<Review[]> {
  const response = await serverApiRequest<{ items?: Array<{ id: string; author: string; rating: number; quote: string; date?: string }> }>(`/public/reviews${contentId ? `?contentId=${encodeURIComponent(contentId)}` : ''}`);
  return (response?.items ?? []).map((item) => ({ ...item, avatar: null, isDemo: false }));
}

export interface PublicNavigationItem {
  label: string;
  href: string;
}

export async function getPublicNavigation(): Promise<PublicNavigationItem[]> {
  const result = await serverApiRequest<PublicNavigationItem[]>('/public/navigation/primary');
  return Array.isArray(result) ? result.filter((item) => !!item?.label && !!item?.href) : [];
}

export interface PublicStaticPage {
  id: string;
  title: string;
  slug: string;
  path: string;
  excerpt: string | null;
  body: RichDocument | null;
  metaTitle: string | null;
  metaDescription: string | null;
  noindex: boolean;
  cover: ImageAsset | null;
  updatedAt: string | null;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
}

export async function getPublicPage(slug: string): Promise<PublicStaticPage | null> {
  try {
    return await serverApiRequest<PublicStaticPage>(`/public/pages/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getPublicPages(): Promise<Array<Pick<PublicStaticPage, 'id' | 'title' | 'slug' | 'path' | 'updatedAt' | 'noindex'>>> {
  const response = await serverApiRequest<{ items?: Array<Pick<PublicStaticPage, 'id' | 'title' | 'slug' | 'path' | 'updatedAt' | 'noindex'>> }>('/public/pages');
  return response?.items ?? [];
}
