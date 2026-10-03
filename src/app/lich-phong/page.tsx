import type { Metadata } from 'next';
import { PageShell } from '@/components/layout/PageShell';
import { AvailabilitySearch } from '@/components/public/AvailabilitySearch';
import { parseSelection, selectionQuery } from '@/lib/selection';
import './availability.css';

export const metadata: Metadata = {
  title: 'Tra cứu tình trạng phòng | Đinh Vân Booking',
  description: 'Kiểm tra các cơ sở lưu trú tham gia theo ngày nhận, ngày trả và nhu cầu của bạn. Tình trạng phòng được đối chiếu theo từng đêm.',
  alternates: { canonical: '/lich-phong' },
};

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const selection = parseSelection(await searchParams);
  return <PageShell className="availability-page"><AvailabilitySearch key={selectionQuery(selection)} initialSelection={selection} /></PageShell>;
}
