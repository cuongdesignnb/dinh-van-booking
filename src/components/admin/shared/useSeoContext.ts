'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { richDocumentToText } from '@/lib/content/rich-document';
import { applyTitleTemplate } from '@/lib/seo/title';

/** Site-level SEO facts the Admin previews need: brand, title template, canonical origin, index gate. */
export type SeoContext = {
  /** Owner-approved canonical origin, or this browser's origin as a preview fallback. */
  origin: string | null;
  canonicalApproved: boolean;
  brandName: string;
  titleTemplate: string | null;
  indexingAllowed: boolean;
  blockedReasons: string[];
  structuredDataCore: boolean;
};

const EMPTY: SeoContext = {
  origin: null, canonicalApproved: false, brandName: '', titleTemplate: null, indexingAllowed: false, blockedReasons: [], structuredDataCore: true,
};

let cached: Promise<SeoContext> | null = null;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function loadSeoContext(): Promise<SeoContext> {
  const [site, policy] = await Promise.all([
    apiRequest<{ settings: Record<string, unknown> }>('/public/site').catch(() => ({ settings: {} as Record<string, unknown> })),
    apiRequest<{ canonicalOrigin: string | null; indexingAllowed: boolean; blockedReasons: string[]; structuredData?: { core?: boolean } }>('/public/seo/policy').catch(() => null),
  ]);
  const identity = record(site.settings['brand.identity']);
  const seo = record(site.settings['seo.defaults']);
  const brandName = richDocumentToText(identity.shortName) || richDocumentToText(identity.name);
  return {
    origin: policy?.canonicalOrigin ?? (typeof window !== 'undefined' ? window.location.origin : null),
    canonicalApproved: !!policy?.canonicalOrigin,
    brandName,
    titleTemplate: richDocumentToText(seo.titleTemplate) || null,
    indexingAllowed: policy?.indexingAllowed === true,
    blockedReasons: policy?.blockedReasons ?? [],
    structuredDataCore: policy?.structuredData?.core !== false,
  };
}

export function useSeoContext(): SeoContext {
  const [value, setValue] = useState<SeoContext>(EMPTY);
  useEffect(() => {
    let alive = true;
    cached ??= loadSeoContext();
    cached.then((context) => { if (alive) setValue(context); }, () => undefined);
    return () => { alive = false; };
  }, []);
  return value;
}

/** Same rule as the public `<title>` (`applyTitleTemplate`), so the preview matches. */
export function fullSeoTitle(title: string, context: Pick<SeoContext, 'brandName' | 'titleTemplate'>): string {
  return applyTitleTemplate(title, context.titleTemplate, context.brandName);
}
