import type { Metadata } from 'next';
import Image from '@/components/ui/ManagedImage';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicCombo, getPublicSite } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildComboGraph } from '@/lib/seo/schema';
import '@/styles/static-pages.css';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const combo = await getPublicCombo(slug);
  if (!combo) return { title: 'Không tìm thấy combo' };
  return buildPageMetadata({
    path: combo.publicPath,
    title: combo.metaTitle ?? combo.title,
    description: combo.metaDescription ?? combo.subtitle,
    image: combo.image,
    noindex: combo.noindex,
    eligible: !!combo.image && isSubstantivePublicContent(combo.body),
    searchParams: query,
  });
}

export default async function ComboDetailPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const combo = await getPublicCombo(slug);
  if (!combo) notFound();
  const canonicalPath = `/combo-du-lich/${slug}`;
  if (combo.publicPath !== canonicalPath) permanentRedirect(combo.publicPath);
  const site = await getPublicSite();

  return (
    <PageShell className="page-static-content">
      <section className="static-page">
        <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Combo du lịch', href: '/combo-du-lich' }, { label: combo.title }]} />
        <article className="static-page__article">
          <header className="static-page__header">
            <p className="static-page__eyebrow">Hành trình địa phương</p>
            <h1>{combo.title}</h1>
            <p className="static-page__excerpt">{combo.subtitle}</p>
            <p className="static-page__fact">{combo.durationDays} ngày · {combo.durationNights} đêm</p>
          </header>
          {combo.image && <figure className="static-page__cover"><Image src={combo.image.src} alt={combo.image.alt} width={combo.image.width} height={combo.image.height} unoptimized priority /></figure>}
          {combo.body && <RichContentRenderer document={combo.body} className="static-page__body" />}
          {combo.itinerary.length > 0 && <section className="static-page__section">
            <h2>Lịch trình</h2>
            {combo.itinerary.map((day) => <article className="static-page__day" key={day.day}>
              <h3>Ngày {day.day}: {day.title}</h3>
              <ul>{day.items.map((item, index) => <li key={`${day.day}-${index}`}>{item}</li>)}</ul>
            </article>)}
          </section>}
          {(combo.included.length > 0 || combo.excluded.length > 0) && <section className="static-page__section static-page__columns">
            {combo.included.length > 0 && <div><h2>Đã bao gồm</h2><ul>{combo.included.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {combo.excluded.length > 0 && <div><h2>Chưa bao gồm</h2><ul>{combo.excluded.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </section>}
        </article>
      </section>
      <JsonLd data={isSeoSchemaAllowed(site, combo.publicPath, {
        eligible: !!combo.image && isSubstantivePublicContent(combo.body),
        noindex: combo.noindex,
        searchParams: query,
      }) ? buildComboGraph(site, combo, combo.publicPath) : null} />
    </PageShell>
  );
}
