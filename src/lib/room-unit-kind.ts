export const ROOM_UNIT_KINDS = [
  { value: 'room', label: 'Phòng riêng' },
  { value: 'suite', label: 'Suite' },
  { value: 'villa', label: 'Villa / biệt thự' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'whole_house', label: 'Nguyên căn' },
  { value: 'stilt_house', label: 'Nhà sàn' },
  { value: 'dorm_bed', label: 'Giường trong phòng chung' },
  { value: 'tent', label: 'Lều / glamping' },
  { value: 'other', label: 'Loại hình khác' },
] as const;

export function roomUnitKindLabel(value: string | null | undefined): string | null {
  return ROOM_UNIT_KINDS.find((item) => item.value === value)?.label ?? null;
}
