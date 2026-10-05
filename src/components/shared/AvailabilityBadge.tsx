import '@/styles/availability-badge.css';
export type AvailabilityStatus = 'available' | 'sold_out' | 'unknown';
const labels: Record<AvailabilityStatus, string> = { available: 'Còn phòng', sold_out: 'Hết phòng', unknown: 'Đang cập nhật' };
export function AvailabilityBadge({ status = 'unknown' }: { status?: AvailabilityStatus }) {
  const valid = status in labels ? status : 'unknown';
  return <span className={`availability-badge availability-badge--${valid}`} aria-label={`Tình trạng phòng: ${labels[valid]}`}><span className="availability-badge__dot" aria-hidden="true" />{labels[valid]}</span>;
}
