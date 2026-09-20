import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/home/SiteFooter';
import { SiteHeader } from '@/components/home/SiteHeader';
import { DialogHost } from '@/components/ui/DialogHost';
import { MotionController } from '@/components/ui/MotionController';
import { MobileBottomBar } from './MobileBottomBar';

/** Header + footer + global dialogs shared by every page. */
export function PageShell({
  children,
  footer = 'default',
  className,
}: {
  children: ReactNode;
  footer?: 'default' | 'checkout';
  className?: string;
}) {
  return (
    <>
      <SiteHeader />
      <main className={className}>{children}</main>
      <SiteFooter variant={footer} />
      <MobileBottomBar />
      <DialogHost />
      <MotionController />
    </>
  );
}
