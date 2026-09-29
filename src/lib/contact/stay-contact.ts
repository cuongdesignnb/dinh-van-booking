import { writeSelection, type Selection } from '@/lib/selection';

/** Carry only a public stay slug, optional room ID and non-sensitive trip choices. */
export function stayContactHref(slug: string, selection?: Selection, roomTypeId?: string): string {
  const params = selection ? writeSelection(selection) : new URLSearchParams();
  params.set('intent', 'stay');
  params.set('item', slug);
  if (roomTypeId) params.set('room', roomTypeId);
  return `/lien-he?${params.toString()}`;
}
