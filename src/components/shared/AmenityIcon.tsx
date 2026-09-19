import { CookingPot, Leaf, Mountain, SquareParking, Users, Waves, Wifi } from 'lucide-react';
import type { AmenityId } from '@/data/types';

/** Breakfast glyph from the mockup: a small filled leaf-shield. */
function BreakfastIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M8 1.5 2.8 3.4v4.2c0 3.2 2.2 5.6 5.2 6.9 3-1.3 5.2-3.7 5.2-6.9V3.4L8 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 11.3c-.2-2.4.5-4.6 2.6-6-2.9.3-4.6 2.4-4.4 5.2.6.4 1.2.6 1.8.8Z" fill="currentColor" />
    </svg>
  );
}

export function AmenityIcon({ id, size = 14 }: { id: AmenityId; size?: number }) {
  const p = { size, strokeWidth: 2, 'aria-hidden': true as const };
  switch (id) {
    case 'wifi':
      return <Wifi {...p} />;
    case 'breakfast':
      return <BreakfastIcon size={size} />;
    case 'view':
      return <Mountain {...p} />;
    case 'kitchen':
      return <CookingPot {...p} />;
    case 'family':
      return <Users {...p} />;
    case 'parking':
      return <SquareParking {...p} />;
    case 'eco':
      return <Leaf {...p} />;
    case 'pool':
      return <Waves {...p} />;
  }
}
