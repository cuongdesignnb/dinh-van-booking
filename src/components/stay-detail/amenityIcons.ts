import {
  Bath,
  Car,
  CigaretteOff,
  Coffee,
  CookingPot,
  Fence,
  Laptop,
  Leaf,
  Mountain,
  Refrigerator,
  Snowflake,
  Sparkles,
  SprayCan,
  Trees,
  Tv,
  Users,
  Waves,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

/** Icons for property amenity codes and verified room facility codes. */
const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  breakfast: Coffee,
  view: Mountain,
  kitchen: CookingPot,
  family: Users,
  parking: Car,
  eco: Leaf,
  pool: Waves,
  ac: Snowflake,
  bath: Bath,
  toiletries: SprayCan,
  balcony: Fence,
  desk: Laptop,
  nosmoke: CigaretteOff,
  room_wifi: Wifi,
  room_air_conditioning: Snowflake,
  room_balcony: Fence,
  room_private_bathroom: Bath,
  room_bathtub: Bath,
  room_kitchen: CookingPot,
  room_tv: Tv,
  room_refrigerator: Refrigerator,
  room_forest_view: Trees,
  room_lake_view: Waves,
  room_private_pool: Waves,
};

export function amenityIcon(code: string): LucideIcon {
  return AMENITY_ICONS[code] ?? Sparkles;
}

/** Highlights are free text, so pick an icon by keyword (Vietnamese, accents stripped). */
const HIGHLIGHT_KEYWORDS: [RegExp, LucideIcon][] = [
  [/boi|ho boi|be boi/, Waves],
  [/khoang|bon tam|onsen|spa/, Bath],
  [/an sang|nha hang|cafe|ca phe|am thuc/, Coffee],
  [/gia dinh|nhom|tre em/, Users],
  [/wifi|wi-fi|internet/, Wifi],
  [/rung|cay|vuon|xanh|thien nhien/, Trees],
  [/nui|view|ngam canh|tam nhin/, Mountain],
  [/bep|nau/, CookingPot],
  [/do xe|bai xe|o to/, Car],
];

export function highlightIcon(label: string): LucideIcon | undefined {
  const text = label.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
  return HIGHLIGHT_KEYWORDS.find(([re]) => re.test(text))?.[1];
}
