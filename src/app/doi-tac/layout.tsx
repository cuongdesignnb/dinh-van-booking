import type { Metadata } from 'next';
import { buildPrivateMetadata } from '@/lib/seo/metadata';
import './portal.css';
import '@/styles/admin-editor.css';

// Partner portal: always noindex, nofollow and never in the sitemap.
export function generateMetadata(): Promise<Metadata> {
  return buildPrivateMetadata('Cổng đối tác');
}

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <main className="partner-portal dvb-admin">{children}</main>;
}
