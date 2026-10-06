import type { Metadata, Viewport } from 'next';
import { getPublicSite } from '@/lib/api/public';
import { metadataForSite } from '@/lib/seo/metadata';
import { richDocumentToText } from '@/lib/content/rich-document';
import '@/styles/design-system/tokens.css';
import './globals.css';
import '@/styles/design-system/components.css';
import '@/styles/pages.css';
import '@/styles/mobile-nav.css';
import '@/styles/rich-content.css';

// SEO settings are editable at runtime. Keep metadata request-time so toggling
// robotsIndex in admin takes effect without rebuilding or redeploying the site.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite();
  const metadata = metadataForSite(site, {
    path: '/',
    title: typeof site.seo.defaultTitle === 'string' ? site.seo.defaultTitle : site.identity.name,
    description: typeof site.seo.defaultDescription === 'string' ? site.seo.defaultDescription : richDocumentToText(site.identity.description),
    eligible: true,
    canonical: false,
  });
  // Root metadata supplies site-wide defaults only. Route-level metadata owns
  // robots and canonical URLs; inheriting these from `/` makes 404s and child
  // pages advertise duplicate or incorrect directives/URLs.
  delete metadata.robots;
  return metadata;
}

export const viewport: Viewport = {
  themeColor: '#194526',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
