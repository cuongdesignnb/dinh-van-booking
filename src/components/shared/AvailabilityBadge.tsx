import { BedDouble } from 'lucide-react';

export type AvailabilityStatus = 'available' | 'sold_out' | 'unknown';
const labels: Record<AvailabilityStatus, string> = { available: 'Còn phòng', sold_out: 'Hết phòng', unknown: 'Đang cập nhật' };

/** Status pill on stay photos: label + icon, never colour alone. */
export function AvailabilityBadge({ status = 'unknown', className = '' }: { status?: AvailabilityStatus; className?: string }) {
  const valid = status in labels ? status : 'unknown';
  return (
    <span className={`cp-pill cp-pill--${valid} ${className}`.trim()} aria-label={`Tình trạng phòng: ${labels[valid]}`}>
      <BedDouble size={15} strokeWidth={2} aria-hidden="true" />
      {labels[valid]}
    </span>
  );
}
