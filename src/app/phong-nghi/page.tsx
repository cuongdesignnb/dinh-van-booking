import type { Metadata } from 'next';
import { FaqCard } from '@/components/shared/FaqCard';
import { ReviewsStrip } from '@/components/shared/ReviewsStrip';
import { PageShell } from '@/components/layout/PageShell';
import { AdvisorCard } from '@/components/stays/AdvisorCard';
import { NotFoundCard } from '@/components/stays/NotFoundCard';
import { StaysExplorer } from '@/components/stays/StaysExplorer';
import { StaysHero } from '@/components/stays/StaysHero';
import { SmallLeaf } from '@/components/ui/Decor';
import { stayFaqs, stayListingReviews } from '@/data/reviews';
import '@/styles/stays.css';

export const metadata: Metadata = {
  title: 'Phòng nghỉ Cúc Phương — Đinh Vân Booking',
  description: 'Những nơi lưu trú được Đinh Vân tuyển chọn tại Cúc Phương, Ninh Bình.',
};

function Reviews() {
  return (
    <section className="stays-reviews" aria-labelledby="stays-reviews-t">
      <div className="stays-reviews__head">
        <h2 id="stays-reviews-t" className="stays-reviews__title">
          Khách hàng nói về
          <br /> phòng nghỉ tại Đinh Vân Booking <SmallLeaf className="section-title__leaf" />
        </h2>
        <p className="stays-reviews__sub">Những chia sẻ chân thật từ những người đã trải nghiệm</p>
      </div>
      <ReviewsStrip reviews={stayListingReviews} />
    </section>
  );
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Per-request render so filters/selection from the URL are server-rendered.
  await searchParams;
  return (
    <PageShell className="page-stays">
      <StaysHero />
        <StaysExplorer
          advisor={<AdvisorCard />}
          notFound={<NotFoundCard />}
          reviews={<Reviews />}
          faq={
            <FaqCard
              className="stays-faq"
              title={
                <>
                  Câu hỏi thường gặp <SmallLeaf className="section-title__leaf" />
                  <br /> về phòng nghỉ
                </>
              }
              items={stayFaqs}
            />
          }
        />
    </PageShell>
  );
}
