import type { Metadata } from 'next';
import { FaqCard } from '@/components/shared/FaqCard';
import { ReviewsStrip } from '@/components/shared/ReviewsStrip';
import { PageShell } from '@/components/layout/PageShell';
import { AdvisorCard } from '@/components/stays/AdvisorCard';
import { NotFoundCard } from '@/components/stays/NotFoundCard';
import { StaysExplorer } from '@/components/stays/StaysExplorer';
import { StaysHero } from '@/components/stays/StaysHero';
import { SmallLeaf } from '@/components/ui/Decor';
import { getPublicReviews, getPublicSeoUrls, getPublicSite, getPublicStays } from '@/lib/api/public';
import { JsonLd } from '@/components/seo/JsonLd';
import { isSubstantivePublicContent } from '@/lib/seo/content';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { isSeoSchemaAllowed } from '@/lib/seo/policy';
import { buildCollectionGraph } from '@/lib/seo/schema';
import '@/styles/stays.css';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const [query, stays, urls] = await Promise.all([searchParams, getPublicStays(), getPublicSeoUrls()]);
  return buildPageMetadata({
    path: '/phong-nghi',
    title: 'Phòng nghỉ Cúc Phương — Đinh Vân Booking',
    description: 'Những nơi lưu trú được Đinh Vân tuyển chọn tại Cúc Phương, Ninh Bình.',
    eligible: urls.some((entry) => entry.path === '/phong-nghi') && stays.length > 0,
    searchParams: query,
  });
}

function Reviews({ reviews }: { reviews: Awaited<ReturnType<typeof getPublicReviews>> }) {
  return (
    <section className="stays-reviews" aria-labelledby="stays-reviews-t">
      <div className="stays-reviews__head">
        <h2 id="stays-reviews-t" className="stays-reviews__title">
          Khách hàng nói về
          <br /> phòng nghỉ tại Đinh Vân Booking <SmallLeaf className="section-title__leaf" />
        </h2>
        <p className="stays-reviews__sub">Những chia sẻ chân thật từ những người đã trải nghiệm</p>
      </div>
      <ReviewsStrip reviews={reviews} />
    </section>
  );
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Per-request render so filters/selection from the URL are server-rendered.
  const query = await searchParams;
  const [stays, reviews, site, urls] = await Promise.all([getPublicStays(), getPublicReviews(), getPublicSite(), getPublicSeoUrls()]);
  const indexablePaths = new Set(urls.map((entry) => entry.path));
  const schemaItems = stays
    .filter((stay) => !stay.noindex && !!stay.publicPath && indexablePaths.has(stay.publicPath) && isSubstantivePublicContent(stay.descriptionDocument ?? stay.description))
    .map((stay) => ({ name: stay.name, href: stay.publicPath! }));
  const structuredData = isSeoSchemaAllowed(site, '/phong-nghi', { eligible: schemaItems.length > 0, searchParams: query })
    ? buildCollectionGraph(site, { path: '/phong-nghi', title: 'Phòng nghỉ Cúc Phương', items: schemaItems })
    : null;
  return (
    <PageShell className="page-stays">
      <StaysHero />
        <StaysExplorer
          stays={stays}
          advisor={<AdvisorCard />}
          notFound={<NotFoundCard />}
          reviews={<Reviews reviews={reviews} />}
          faq={
            <FaqCard
              className="stays-faq"
              title={
                <>
                  Câu hỏi thường gặp <SmallLeaf className="section-title__leaf" />
                  <br /> về phòng nghỉ
                </>
              }
              items={[]}
            />
          }
        />
      <JsonLd data={structuredData} />
    </PageShell>
  );
}
