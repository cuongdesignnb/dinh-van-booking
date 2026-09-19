import { DestinationGrid } from '@/components/home/DestinationGrid';
import { FeaturedStays } from '@/components/home/FeaturedStays';
import { HeroSection } from '@/components/home/HeroSection';
import { PersonalContact } from '@/components/home/PersonalContact';
import { Testimonials } from '@/components/home/Testimonials';
import { TrustStrip } from '@/components/home/TrustStrip';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { PageShell } from '@/components/layout/PageShell';

export default function HomePage() {
  return (
    <PageShell className="page-home">
      <HeroSection />
      <TrustStrip />
      <FeaturedStays />
      <div className="lower content-shell">
        <div className="lower__left">
          <WhyChooseUs />
          <DestinationGrid />
        </div>
        <div className="lower__right">
          <Testimonials />
          <PersonalContact />
        </div>
      </div>
    </PageShell>
  );
}
