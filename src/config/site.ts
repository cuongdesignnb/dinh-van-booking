/**
 * Runtime site data is loaded from `/public/site`. This module intentionally
 * contains no mutable business values; the empty shape is only used while the
 * API is unavailable or the database has not been onboarded.
 */
export interface SiteContact {
  phone: string | null;
  hotline: string | null;
  zaloUrl: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
}

export interface SiteSocial {
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
}

export interface RuntimeSiteData {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  contact: SiteContact;
  social: SiteSocial;
  usesDemoData: boolean;
}

export const emptySiteData: RuntimeSiteData = {
  name: '',
  shortName: '',
  tagline: '',
  contact: { phone: null, hotline: null, zaloUrl: null, email: null, address: null, mapUrl: null },
  description: '',
  social: { facebook: null, instagram: null, youtube: null, tiktok: null },
  usesDemoData: false,
};

/** Kept as a compatibility export for non-rendering tooling. */
export const siteConfig = emptySiteData;
