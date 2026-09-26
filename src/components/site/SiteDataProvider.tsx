'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { emptySiteData, type RuntimeSiteData } from '@/config/site';
import type { PublicSiteData } from '@/lib/api/public';

const SiteDataContext = createContext<RuntimeSiteData>(emptySiteData);

export function SiteDataProvider({ data, children }: { data: PublicSiteData; children: ReactNode }) {
  const identity = data.identity ?? {};
  const contact = data.contact ?? {};
  const social = data.social ?? {};
  const mode = (data['ops.dataMode'] as { usesDemoData?: boolean } | undefined)?.usesDemoData ?? false;
  const runtime: RuntimeSiteData = {
    name: typeof identity.name === 'string' ? identity.name : '',
    shortName: typeof identity.shortName === 'string' ? identity.shortName : '',
    tagline: typeof identity.tagline === 'string' ? identity.tagline : '',
    description: typeof identity.description === 'string' ? identity.description : '',
    contact: {
      phone: contact.phone ?? null,
      hotline: contact.hotline ?? null,
      zaloUrl: contact.zaloUrl ?? null,
      email: contact.email ?? null,
      address: contact.address ?? null,
      mapUrl: contact.mapUrl ?? null,
    },
    social: {
      facebook: social.facebook ?? null,
      instagram: social.instagram ?? null,
      youtube: social.youtube ?? null,
      tiktok: social.tiktok ?? null,
    },
    usesDemoData: mode,
  };
  return <SiteDataContext.Provider value={runtime}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): RuntimeSiteData {
  return useContext(SiteDataContext);
}
