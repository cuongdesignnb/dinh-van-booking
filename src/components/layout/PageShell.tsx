import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/home/SiteFooter';
import { SiteHeader } from '@/components/home/SiteHeader';
import { DialogHost } from '@/components/ui/DialogHost';
import { MotionController } from '@/components/ui/MotionController';
import { SiteDataProvider } from '@/components/site/SiteDataProvider';
import { getPublicNavigation, getPublicSite } from '@/lib/api/public';

/** Header + footer + global dialogs shared by every page. */
export async function PageShell({
  children,
  footer = 'default',
  className,
}: {
  children: ReactNode;
  footer?: 'default' | 'checkout';
  className?: string;
}) {
  const [site, navigation] = await Promise.all([getPublicSite(), getPublicNavigation()]);
  return (
    <SiteDataProvider data={site} navigation={navigation}>
      <SiteHeader navigation={navigation} />
      <main className={className}>{children}</main>
      <SiteFooter variant={footer} navigation={navigation} />
      <DialogHost />
      <MotionController />
    </SiteDataProvider>
  );
}
