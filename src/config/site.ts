/**
 * Site configuration.
 *
 * Every contact channel below is `null` until the site owner confirms it.
 * The labels in `previewLabels` reproduce the mockup for visual comparison only
 * and are never turned into working links.
 */
export type SiteMode = 'preview' | 'production';

export interface SiteContact {
  phone: string | null;
  zaloUrl: string | null;
  email: string | null;
  address: string | null;
}

export interface SiteSocial {
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
}

export const siteConfig = {
  mode: 'preview' as SiteMode,
  name: 'Đinh Vân Booking',
  tagline: 'Ở ĐÂY CÓ NHỮNG CHUYẾN ĐI Ý NGHĨA',
  description:
    'Tư vấn và đặt phòng nghỉ tại Cúc Phương, Ninh Bình cùng người bản địa Đinh Vân.',
  /** Demo data (rooms, prices, reviews) is shown — never publish as real data. */
  usesDemoData: true,
  contact: {
    phone: null,
    zaloUrl: null,
    email: null,
    address: null,
  } satisfies SiteContact as SiteContact,
  social: {
    facebook: null,
    instagram: null,
    youtube: null,
    tiktok: null,
  } satisfies SiteSocial as SiteSocial,
  /** Mockup labels, shown as plain text only (not links). */
  previewLabels: {
    phone: '096x xxx xxx',
    zalo: 'Zalo: Đinh Vân Booking',
    email: 'dinhvanbooking@gmail.com',
    address: 'Cúc Phương, Nho Quan, Ninh Bình',
  },
};

export const isPreview = siteConfig.mode === 'preview';
