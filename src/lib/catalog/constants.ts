import type { ComboCategory } from '@/data/combos';
import type { AmenityId, StayType } from '@/data/types';
import type { DestinationCategory } from '@/data/destinations';

/** Controlled taxonomy labels are UI metadata, not commercial records. */
export const STAY_TYPES: { id: StayType; label: string }[] = [
  { id: 'homestay', label: 'Homestay' },
  { id: 'eco-lodge', label: 'Eco Lodge' },
  { id: 'resort', label: 'Resort' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'nha-san', label: 'Nhà sàn' },
  { id: 'villa', label: 'Villa' },
  { id: 'glamping', label: 'Glamping' },
  { id: 'other', label: 'Loại khác' },
];

export const AMENITIES: { id: AmenityId; label: string; short: string }[] = [
  { id: 'wifi', label: 'Wi-Fi miễn phí', short: 'Wi-Fi' },
  { id: 'breakfast', label: 'Bữa sáng', short: 'Bữa sáng' },
  { id: 'view', label: 'View rừng / núi', short: 'View rừng' },
  { id: 'kitchen', label: 'Có bếp', short: 'Có bếp' },
  { id: 'family', label: 'Phù hợp gia đình', short: 'Phù hợp gia đình' },
  { id: 'parking', label: 'Chỗ đậu xe', short: 'Chỗ đậu xe' },
  { id: 'eco', label: 'Thân thiện môi trường', short: 'Thân thiện môi trường' },
];

export const COMBO_CATEGORIES: { id: ComboCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'Tất cả combo', icon: 'calendar' },
  { id: '2n1d', label: '2N1D', icon: 'calendar' },
  { id: '3n2d', label: '3N2D', icon: 'calendar' },
  { id: 'gia-dinh', label: 'Gia đình', icon: 'family' },
  { id: 'cap-doi', label: 'Cặp đôi', icon: 'heart' },
  { id: 'nhom', label: 'Nhóm – Team', icon: 'team' },
  { id: 'thien-nhien', label: 'Trải nghiệm thiên nhiên', icon: 'leaf' },
];

export const DESTINATION_CATEGORIES: { id: DestinationCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'thien-nhien', label: 'Thiên nhiên' },
  { id: 'van-hoa', label: 'Văn hóa' },
  { id: 'check-in', label: 'Check-in' },
  { id: 'am-thuc', label: 'Ẩm thực' },
  { id: 'gia-dinh', label: 'Gia đình' },
];
