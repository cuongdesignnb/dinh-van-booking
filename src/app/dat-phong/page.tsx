import type { Metadata } from 'next';
import Image from 'next/image';
import { Checkout } from '@/components/booking/Checkout';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { getPublicSite, getPublicStays } from '@/lib/api/public';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { publicAsset, publicSetting, publicText, richDocumentHasContent } from '@/lib/public-content';
import type { RichDocument } from '@/lib/content/rich-document';
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
    {title && <section className="phero phero--checkout" aria-labelledby="co-h1">
      <div className="phero__media" aria-hidden="true">
        {image?.src && <Image src={image.src} alt={image.alt ?? ''} fill priority sizes="100vw" className="phero__img" unoptimized />}
        <div className="phero__shade" />
      </div>
      <div className="phero__inner co-shell">
        <h1 id="co-h1" className="phero__title" data-reveal="fade-up">{title}</h1>
        {richDocumentHasContent(page.heroDescription) && <div className="phero__text" data-reveal="fade-up"><RichContentRenderer document={page.heroDescription as RichDocument} /></div>}
        {kicker && <p className="phero__script handwritten" data-reveal="write">{kicker}</p>}
      </div>
    </section>}

    {securityNote && <div className="co-strip"><div className="co-shell co-strip__inner"><Breadcrumb variant="plain" home items={[{ label: 'Phòng nghỉ', href: '/phong-nghi' }, { label: title || 'Đặt phòng' }]} /><p className="co-strip__msg">{securityNote}</p></div></div>}
    <div className="co-shell"><Checkout stay={stay} /></div>
  </PageShell>;
}
