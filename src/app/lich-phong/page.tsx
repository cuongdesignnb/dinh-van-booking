import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { AvailabilitySearch } from '@/components/public/AvailabilitySearch';
import { parseSelection, selectionQuery } from '@/lib/selection';
import { PUBLIC_ROUTES } from '@/lib/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import './availability.css';

// A date/guest search tool: always noindex (follow), no canonical, never in the sitemap.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  return buildPageMetadata({
    path: PUBLIC_ROUTES.availability,
    title: 'Tra cứu tình trạng phòng',
    description: 'Kiểm tra các cơ sở lưu trú tham gia theo ngày nhận, ngày trả và nhu cầu của bạn. Tình trạng phòng được đối chiếu theo từng đêm.',
    eligible: false,
    noindex: true,
    canonical: false,
    searchParams: await searchParams,
  });
}

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const selection = parseSelection(await searchParams);
  return <PageShell className="availability-page"><AvailabilitySearch key={selectionQuery(selection)} initialSelection={selection} /></PageShell>;
}
