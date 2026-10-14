/** Server-safe helper: the editable first chat message for an advisor CTA. */

const viDate = (value: string) => {
  const [y, m, d] = value.split('-');
  return d && m && y ? `${d}/${m}` : value;
};

/** Builds a short, editable first message from what the visitor was looking at. */
export function chatDraft(parts: {
  subject?: string | null;
  room?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number | null;
  children?: number | null;
  rooms?: number | null;
  note?: string | null;
}): string {
  const bits: string[] = [];
  if (parts.subject) bits.push(`Mình cần tư vấn về ${parts.subject}${parts.room ? ` (hạng ${parts.room})` : ''}`);
  else bits.push('Mình cần tư vấn chuyến đi');
  if (parts.checkIn && parts.checkOut) bits.push(`ngày ${viDate(parts.checkIn)}–${viDate(parts.checkOut)}`);
  else if (parts.checkIn) bits.push(`ngày ${viDate(parts.checkIn)}`);
  if (parts.adults) bits.push(`${parts.adults} người lớn${parts.children ? `, ${parts.children} trẻ em` : ''}${parts.rooms && parts.rooms > 1 ? `, ${parts.rooms} phòng` : ''}`);
  return `${bits.join(', ')}.${parts.note ? ` ${parts.note}` : ''}`;
}

/** "combo X" unless the title already says it, e.g. "Combo Cúc Phương 2N1Đ". */
export function comboSubject(title: string): string {
  return /^combo/i.test(title.trim()) ? title.trim() : `combo ${title.trim()}`;
}
