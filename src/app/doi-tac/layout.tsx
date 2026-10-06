import type { Metadata } from 'next';
import './portal.css';
import '@/styles/admin-editor.css';

export const metadata: Metadata = {
  title: 'Cổng đối tác — Cúc Phương Travel',
  robots: { index: false, follow: false },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <main className="partner-portal dvb-admin">{children}</main>;
}
