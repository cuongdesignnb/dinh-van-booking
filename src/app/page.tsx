import { DestinationGrid } from '@/components/home/DestinationGrid';
import { FeaturedStays } from '@/components/home/FeaturedStays';
import { HeroSection } from '@/components/home/HeroSection';
import { PersonalContact } from '@/components/home/PersonalContact';
import { SiteFooter } from '@/components/home/SiteFooter';
import { SiteHeader } from '@/components/home/SiteHeader';
import { Testimonials } from '@/components/home/Testimonials';
import { TrustStrip } from '@/components/home/TrustStrip';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { DialogHost } from '@/components/ui/DialogHost';
import { MotionController } from '@/components/ui/MotionController';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
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
      </main>
      <SiteFooter />
      <DialogHost />
      <MotionController />
    </>
  );
}
