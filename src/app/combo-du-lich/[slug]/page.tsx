import type { Metadata } from 'next';
import { ArrowRight, CalendarDays, Check, Route, X } from 'lucide-react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PageShell } from '@/components/layout/PageShell';
import { PageHero } from '@/components/site/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { getPublicCombo, getPublicSite } from '@/lib/api/public';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildComboGraph } from '@/lib/seo/schema';
import { comboPriceUnitLabel } from '@/lib/catalog/combo-pricing';
import { formatVnd } from '@/lib/format';
import '@/styles/site/detail.css';

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

  const hasPrice = combo.fromPriceVnd !== null && combo.fromPriceVnd > 0;
  const contactHref = `/lien-he?intent=combo&item=${encodeURIComponent(combo.slug)}`;

  return (
    <PageShell className="page-detail">
      <PageHero id="combo-detail-h1" title={combo.title} eyebrow="Hành trình địa phương" lead={combo.subtitle} image={combo.image}
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Trải nghiệm', href: '/combo-du-lich' }, { label: combo.title }]}>
        <ul className="cp-detail__facts">
          <li><CalendarDays size={17} aria-hidden="true" /> {combo.durationDays} ngày · {combo.durationNights} đêm</li>
          {combo.itinerary.length > 0 && <li><Route size={17} aria-hidden="true" /> {combo.itinerary.length} chặng lịch trình</li>}
        </ul>
      </PageHero>

      <div className="cp-detail cp-shell">
        <div className="cp-detail__main">
          {combo.body && <section className="cp-detail__card" aria-labelledby="combo-intro">
            <h2 id="combo-intro">Giới thiệu</h2>
            <RichContentRenderer document={combo.body} className="cp-detail__body" />
          </section>}

          {combo.itinerary.length > 0 && <section className="cp-detail__card" aria-labelledby="combo-itinerary">
            <h2 id="combo-itinerary">Lịch trình</h2>
            <ol className="cp-timeline">
              {combo.itinerary.map((day) => <li key={day.day} className="cp-timeline__day">
                <span className="cp-timeline__badge">Ngày {day.day}</span>
                <h3>{day.title}</h3>
                <ul>{day.items.map((item, index) => <li key={`${day.day}-${index}`}>{item}</li>)}</ul>
              </li>)}
            </ol>
          </section>}

          {(combo.included.length > 0 || combo.excluded.length > 0) && <section className="cp-detail__card cp-detail__split" aria-label="Dịch vụ">
            {combo.included.length > 0 && <div>
              <h2>Đã bao gồm</h2>
              <ul className="cp-checklist">{combo.included.map((item) => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
            </div>}
            {combo.excluded.length > 0 && <div>
              <h2>Chưa bao gồm</h2>
              <ul className="cp-checklist cp-checklist--muted">{combo.excluded.map((item) => <li key={item}><X size={17} aria-hidden="true" />{item}</li>)}</ul>
            </div>}
          </section>}
        </div>

        <aside className="cp-detail__aside">
          <div className="cp-offer">
            {hasPrice
              ? <p className="cp-offer__price"><span>Từ</span> <strong>{formatVnd(combo.fromPriceVnd as number)}</strong> <span>/ {comboPriceUnitLabel(combo.priceUnit)}</span></p>
              : <p className="cp-offer__price"><strong>Liên hệ để nhận giá</strong></p>}
            <p className="cp-offer__note">{hasPrice ? 'Giá tham khảo; chưa tạo đơn đặt.' : 'Chưa có giá công khai; không đặt hoặc thanh toán trực tuyến.'}</p>
            <ul className="cp-offer__facts">
              <li><CalendarDays size={17} aria-hidden="true" /> {combo.durationDays} ngày · {combo.durationNights} đêm</li>
            </ul>
            <Link className="btn btn--primary btn--lg cp-offer__cta" href={contactHref}>Liên hệ tư vấn <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="btn btn--outline cp-offer__cta" href="/combo-du-lich">Xem trải nghiệm khác</Link>
          </div>
        </aside>
      </div>
      <JsonLd data={isSeoSchemaAllowed(site, combo.publicPath, {
        eligible: !!combo.image && isSubstantivePublicContent(combo.body),
        noindex: combo.noindex,
        searchParams: query,
      }) ? buildComboGraph(site, combo, combo.publicPath) : null} />
    </PageShell>
  );
}
