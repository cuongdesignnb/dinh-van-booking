import type { Metadata } from 'next';
import { Checkout } from '@/components/booking/Checkout';
import { PageShell } from '@/components/layout/PageShell';
import { PageHero } from '@/components/site/PageHero';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { getPublicSite, getPublicStays } from '@/lib/api/public';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { publicAsset, publicSetting, publicText } from '@/lib/public-content';
import '@/styles/checkout.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [query, site] = await Promise.all([searchParams, getPublicSite()]);
  const page = publicSetting(site, 'catalog.bookingPage');
  return buildPageMetadata({ path: '/dat-phong', eligible: false, noindex: true, follow: false, canonical: false, searchParams: query, title: publicText(page.heroTitle) || undefined });
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, stays, site] = await Promise.all([searchParams, getPublicStays(), getPublicSite()]);
  const page = publicSetting(site, 'catalog.bookingPage');
  const image = publicAsset(site, page.heroImageMediaId);
  const stayKey = typeof params.stay === 'string' ? params.stay : null;
  const stay = stays.find((item) => item.id === stayKey || item.slug === stayKey) ?? null;
  const title = publicText(page.heroTitle);
  const kicker = publicText(page.heroKicker);
  const securityNote = publicText(page.securityNote);
  return <PageShell className="page-checkout" footer="checkout">
    {title && <PageHero id="co-h1" size="sm" title={title} eyebrow={kicker} lead={page.heroDescription} image={image} />}

    {securityNote && <div className="co-strip"><div className="co-shell co-strip__inner"><Breadcrumb variant="plain" home items={[{ label: 'Phòng nghỉ', href: '/phong-nghi' }, { label: title || 'Đặt phòng' }]} /><p className="co-strip__msg">{securityNote}</p></div></div>}
    <div className="co-shell"><Checkout stay={stay} /></div>
  </PageShell>;
}
