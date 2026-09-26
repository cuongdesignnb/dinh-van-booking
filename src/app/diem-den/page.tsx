import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { DestinationExplorer } from '@/components/destinations/DestinationExplorer';
import { ItineraryTabs, LocalMap, Seasons } from '@/components/destinations/DiscoveryLower';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { SmallLeaf } from '@/components/ui/Decor';
import { getPublicDestinations, getPublicLegacyTarget, getPublicSeoUrls, getPublicSite } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildCollectionGraph } from '@/lib/seo/schema';
import '@/styles/destinations.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const query = await searchParams;
  if (query.d !== undefined) return { title: 'Điểm đến Cúc Phương — Đinh Vân Booking' };
  const [destinations, urls] = await Promise.all([getPublicDestinations(), getPublicSeoUrls()]);
  return buildPageMetadata({
    path: '/diem-den',
    title: 'Khám phá Cúc Phương - Ninh Bình — Đinh Vân Booking',
    description: 'Rừng xanh, núi đá, văn hóa và trải nghiệm chân thật tại Cúc Phương - Ninh Bình.',
    eligible: urls.some((entry) => entry.path === '/diem-den') && destinations.length > 0,
    searchParams: query,
  });
}

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  if (query.d !== undefined) {
    const value = typeof query.d === 'string' ? query.d.trim() : query.d.length === 1 ? query.d[0].trim() : '';
    if (!value) notFound();
    const path = await getPublicLegacyTarget('destination', value);
    if (!path) notFound();
    permanentRedirect(path);
  }
  const [destinations, site, urls] = await Promise.all([getPublicDestinations(), getPublicSite(), getPublicSeoUrls()]);
  const indexablePaths = new Set(urls.map((entry) => entry.path));
  const schemaItems = destinations
    .filter((destination) => !destination.noindex && !!destination.publicPath && indexablePaths.has(destination.publicPath) && isSubstantivePublicContent(destination.body ?? destination.description))
    .map((destination) => ({ name: destination.name, href: destination.publicPath! }));
  const structuredData = isSeoSchemaAllowed(site, '/diem-den', { eligible: schemaItems.length > 0, searchParams: query })
    ? buildCollectionGraph(site, { path: '/diem-den', title: 'Điểm đến Cúc Phương', items: schemaItems })
    : null;
  return (
    <PageShell className="page-destinations">
      <section className="phero phero--dest" aria-labelledby="dest-h1">
        <div className="phero__media" aria-hidden="true">
          <Image src="/images/dinh-van-booking/pages/destinations-hero.webp" alt="" fill priority sizes="100vw" className="phero__img" />
          <div className="phero__shade" />
        </div>
        <div className="phero__inner content-shell">
          <Breadcrumb variant="light" items={[{ label: 'Trang chủ', href: '/' }, { label: 'Điểm đến' }]} />
          <p className="phero__script handwritten" data-reveal="write">
            Khám phá thiên nhiên kỳ diệu
          </p>
          <h1 id="dest-h1" className="phero__title" data-reveal="fade-up" style={{ '--d': '120ms' } as React.CSSProperties}>
            Cúc Phương - Ninh Bình
          </h1>
          <p className="phero__text" data-reveal="fade-up" style={{ '--d': '240ms' } as React.CSSProperties}>
            Nơi rừng xanh, núi đá, văn hóa và những trải nghiệm chân thật
            <br /> cùng tạo nên hành trình đáng nhớ.
          </p>
          <p className="phero__quotebox" data-reveal="fade-up" style={{ '--d': '360ms' } as React.CSSProperties}>
            <span className="phero__quotebox-ic" aria-hidden="true">
              <SmallLeaf />
            </span>
            <span className="phero__quotebox-text">
              “Không chỉ là một điểm đến, mà là hành trình trở về với thiên nhiên,
              <br /> văn hóa và chính mình...”
            </span>
          </p>
          <p className="phero__side handwritten" aria-hidden="true">
            Thiên nhiên chữa lành
            <br /> Những chuyến đi
            <br /> kết nối trái tim
            <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
              <path
                d="M12 20.5s-7.5-4.6-8.9-9.4C2 7.4 4.6 4.5 7.6 4.9c1.9.2 3.4 1.6 4.4 3.3 1-1.7 2.5-3.1 4.4-3.3 3-.4 5.6 2.5 4.5 6.2-1.4 4.8-8.9 9.4-8.9 9.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </p>
        </div>
      </section>

        <DestinationExplorer destinations={destinations} />

      <div className="discovery-lower content-shell">
        <ItineraryTabs />
        <Seasons />
        <div className="discovery-lower__right">
            <LocalMap destinations={destinations} />
          <section className="note-card" aria-labelledby="note-t">
            <div className="note-card__body">
              <h2 className="note-card__title" id="note-t">
                <SmallLeaf className="note-card__leaf" /> Lời nhắn từ Đinh Vân <SmallLeaf className="note-card__leaf" />
              </h2>
              <blockquote className="note-card__quote">
                “Với chúng mình, Cúc Phương - Ninh Bình không chỉ là điểm đến, mà là nơi lưu giữ những cảm xúc thật. Chúng
                mình mong rằng mỗi chuyến đi cùng Đinh Vân Booking sẽ giúp bạn tìm thấy sự bình yên, kết nối với thiên
                nhiên và thêm yêu những giá trị bản địa Việt Nam.”
              </blockquote>
              <p className="note-card__by">
                — Đinh Vân
                <br />
                <span>Đinh Vân Booking</span>
              </p>
            </div>
            <p className="note-card__script handwritten" aria-hidden="true">
              Đi để thấy
              <br /> thiên nhiên
              <br /> thật tuyệt!
            </p>
            <Image src="/images/dinh-van-booking/people/advisor-note.webp" alt="Hình minh họa Đinh Vân" width={102} height={110} className="note-card__img" />
          </section>
        </div>
      </div>
      <JsonLd data={structuredData} />
    </PageShell>
  );
}
