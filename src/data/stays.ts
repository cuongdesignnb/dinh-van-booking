/**
 * Stay fixtures shared by the homepage, listing, detail and booking pages.
 * Names, prices, ratings, addresses and room specs reproduce the mockups and are
 * NOT verified commercial data (`isDemo: true`).
 */
import type { AmenityId, Host, ImageAsset, RoomType, StayType } from './types';
import type { RichDocument } from '@/lib/content/rich-document';

const IMG = '/images/dinh-van-booking';

export const STAY_TYPES: { id: StayType; label: string }[] = [
  { id: 'homestay', label: 'Homestay' },
  { id: 'eco-lodge', label: 'Eco Lodge' },
  { id: 'resort', label: 'Resort' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'nha-san', label: 'Nhà sàn' },
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

/** Amenities that exist on stays but are not offered as a sidebar filter. */
export const EXTRA_AMENITY_LABELS: Partial<Record<AmenityId, string>> = { pool: 'Hồ bơi' };

export interface CardFeature {
  icon: AmenityId;
  label: string;
}

export interface Stay {
  id: string;
  slug: string;
  publicPath?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  noindex?: boolean;
  firstPublishedAt?: string | null;
  lastPublicChangedAt?: string | null;
  name: string;
  type: StayType;
  /** Area tag used for location filtering; never inferred from pins. */
  area: 'cuc-phuong' | 'trang-an';
  rating: number;
  reviewCount: number;
  checkInTime?: string;
  checkOutTime?: string;
  location: string;
  address: string;
  amenities: AmenityId[];
  amenityLabels?: Record<string, string>;
  cardFeatures: CardFeature[];
  cardSummary: string;
  tagline: string;
  description: string;
  /** Published CMS body; fixtures may omit it and use description instead. */
  descriptionDocument?: RichDocument;
  highlights: string[];
  badge?: string;
  /** Explicit public projection; published and homepage-featured are separate states. */
  featured?: boolean;
  popularity: number;
  image: ImageAsset;
  home?: { image: ImageAsset; location: string; tags: string[] };
  gallery: ImageAsset[];
  galleryNote?: string;
  host: Host | null;
  roomTypes: RoomType[];
  /** Position on the illustrated map, in percent. Not a real coordinate. */
  mapPin?: { x: number; y: number };
  nearby: string[];
  houseRules?: { icon: string; text: string }[];
  notes?: string[];
  isDemo?: boolean;
}

const img = (src: string, alt: string, width: number, height: number, extra: Partial<ImageAsset> = {}) => ({
  src,
  alt,
  width,
  height,
  ...extra,
});

const ROOM_IMG = {
  standard: img(`${IMG}/rooms/standard-garden.webp`, 'Phòng ngủ gỗ, cửa kính nhìn ra vườn', 236, 82),
  deluxe: img(`${IMG}/rooms/deluxe-mountain-view.webp`, 'Phòng rộng có ban công nhìn ra núi', 236, 82),
  family: img(`${IMG}/rooms/bungalow-family.webp`, 'Bungalow gỗ giữa vườn cây xanh', 236, 82),
};

const room = (
  id: string,
  name: string,
  capacity: number,
  areaM2: number,
  view: string,
  pricePerNight: number,
  description: string,
  image: ImageAsset,
  badge?: string,
): RoomType => ({
  id,
  name,
  capacity,
  areaM2,
  view,
  pricePerNight,
  description,
  image,
  badge,
  breakfastIncluded: false,
  maxRooms: 3,
});

/** Generic room set for stays whose room data was not in the mockups. */
const defaultRooms = (base: number): RoomType[] => [
  room('standard', 'Phòng Standard', 2, 20, 'Hướng vườn', base, 'Phòng gọn gàng, phù hợp cặp đôi, nhìn ra vườn xanh.', ROOM_IMG.standard),
  room('deluxe', 'Phòng Deluxe', 3, 28, 'Hướng núi', base + 200000, 'Rộng rãi hơn, có ban công riêng và view núi.', ROOM_IMG.deluxe, 'Phổ biến'),
  room('family', 'Phòng Gia đình', 4, 40, 'Sân vườn riêng', base + 550000, 'Phù hợp gia đình hoặc nhóm bạn, không gian riêng tư.', ROOM_IMG.family),
];

const host = (name: string, tagline: string, quote: string, bio: string): Host => ({
  name,
  tagline,
  quote,
  bio,
  avatar: img(`${IMG}/people/host-anh-nam.webp`, '', 70, 70),
  isDemo: true,
});

export const stays: Stay[] = [
  {
    id: 'cuc-phuong-forest-homestay',
    slug: 'cuc-phuong-forest-homestay',
    name: 'Cúc Phương Forest Homestay',
    type: 'homestay',
    area: 'cuc-phuong',
    rating: 4.9,
    reviewCount: 128,
    location: 'Gần Vườn quốc gia Cúc Phương',
    address: 'Xã Cúc Phương, H. Nho Quan, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'view', 'family', 'parking', 'eco'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'view', label: 'View rừng' },
    ],
    cardSummary: 'Homestay mộc mạc giữa rừng, không gian gần gũi thiên nhiên, phù hợp cho cặp đôi và gia đình.',
    tagline:
      'Một homestay giữa rừng xanh, nơi bạn được sống chậm, hít thở thiên nhiên và cảm nhận sự bình yên thật sự.',
    description:
      'Cúc Phương Forest Homestay là sự kết hợp hài hòa giữa kiến trúc mộc mạc và thiên nhiên nguyên bản. Những căn phòng được thiết kế bằng gỗ tự nhiên, hướng ra rừng núi xanh mát, mang đến không gian yên tĩnh, ấm cúng, gần gũi. Đây là lựa chọn lý tưởng cho các cặp đôi, gia đình và những ai muốn tạm rời xa nhịp sống hối hả để tận hưởng thiên nhiên Cúc Phương.',
    highlights: ['View núi rừng', 'Không gian xanh', 'Bữa sáng bản địa', 'Thân thiện môi trường'],
    badge: 'Bán chạy',
    popularity: 100,
    image: img(`${IMG}/stays/cuc-phuong-forest-homestay.webp`, 'Cụm nhà gỗ lên đèn giữa rừng cây', 206, 99),
    home: {
      image: img(`${IMG}/stay-forest.webp`, 'Cụm nhà gỗ lên đèn ấm giữa vườn cây xanh', 264, 104),
      location: 'Gần Vườn quốc gia Cúc Phương',
      tags: ['Không gian xanh', 'Phù hợp gia đình'],
    },
    gallery: [
      img(`${IMG}/detail/forest-main.webp`, 'Phòng ngủ gỗ với cửa kính lớn nhìn ra núi rừng', 530, 318, {
        caption: 'Phòng ngủ gỗ nhìn ra núi rừng',
      }),
      img(`${IMG}/detail/forest-1.webp`, 'Nhà gỗ hai tầng lên đèn giữa rừng', 190, 105, { caption: 'Nhà gỗ giữa rừng' }),
      img(`${IMG}/detail/forest-2.webp`, 'Ban công có ghế thư giãn nhìn ra thung lũng', 190, 95, {
        caption: 'Ban công nhìn ra thung lũng',
      }),
      img(`${IMG}/detail/forest-3.webp`, 'Sân vườn buổi tối với dây đèn và lửa trại', 190, 107, {
        caption: 'Sân vườn buổi tối',
      }),
      img(`${IMG}/stay-forest.webp`, 'Cụm nhà gỗ lên đèn ấm giữa vườn cây xanh', 264, 104, { caption: 'Toàn cảnh homestay' }),
    ],
    galleryNote: 'Thức dậy giữa đại ngàn\nĐể thấy mình thật nhỏ bé\nvà bình yên...',
    host: host(
      'Anh Nam',
      'Người con của rừng Cúc Phương',
      'Tôi mong mỗi vị khách đến đây đều cảm nhận được sự bình yên và nét đẹp nguyên sơ của quê hương mình.',
      'Anh Nam lớn lên cạnh Vườn quốc gia, tự tay dựng những căn nhà gỗ và đón khách như người nhà. (Hồ sơ minh họa, chưa xác minh.)',
    ),
    roomTypes: [
      room(
        'standard-garden',
        'Phòng Standard Garden',
        2,
        20,
        'Hướng vườn',
        650000,
        'Phòng ấm cúng, phù hợp cho cặp đôi, view vườn xanh mát.',
        ROOM_IMG.standard,
      ),
      room(
        'deluxe-mountain-view',
        'Phòng Deluxe Mountain View',
        3,
        28,
        'Hướng núi',
        850000,
        'Không gian rộng rãi, ban công riêng, view núi rừng tuyệt đẹp.',
        ROOM_IMG.deluxe,
        'Phổ biến',
      ),
      room(
        'bungalow-family',
        'Bungalow Family',
        4,
        40,
        'Sân hiên riêng',
        1200000,
        'Phù hợp cho gia đình hoặc nhóm bạn, không gian riêng tư, gần thiên nhiên.',
        ROOM_IMG.family,
      ),
    ],
    mapPin: { x: 30.5, y: 31 },
    nearby: ['vuon-quoc-gia-cuc-phuong', 'ho-yen-quang', 'dong-nguoi-xua', 'trung-tam-cuu-ho-linh-truong'],
    isDemo: true,
  },
  {
    id: 'an-nhien-retreat',
    slug: 'an-nhien-retreat',
    name: 'An Nhiên Retreat',
    type: 'resort',
    area: 'cuc-phuong',
    rating: 4.8,
    reviewCount: 96,
    location: 'Xã Cúc Phương, Ninh Bình',
    address: 'Xã Cúc Phương, H. Nho Quan, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'kitchen', 'view', 'parking'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'kitchen', label: 'Có bếp' },
    ],
    cardSummary: 'Không gian yên tĩnh, thiết kế gỗ ấm cúng, thích hợp cho những ai tìm sự bình yên.',
    tagline: 'Những căn phòng cửa kính lớn, nơi buổi sáng bắt đầu bằng tiếng chim và màu xanh của núi.',
    description:
      'An Nhiên Retreat có các phòng ngủ cửa kính lớn nhìn thẳng ra vườn và núi. Không gian riêng tư, nội thất gỗ ấm, phù hợp cho kỳ nghỉ chậm rãi của cặp đôi hoặc người đi một mình.',
    highlights: ['View núi', 'Không gian riêng tư', 'Bếp chung', 'Yên tĩnh'],
    popularity: 95,
    image: img(`${IMG}/stays/an-nhien-retreat.webp`, 'Phòng ngủ cửa kính nhìn ra vườn cây', 204, 99),
    home: {
      image: img(`${IMG}/stay-retreat.webp`, 'Phòng ngủ cửa kính lớn nhìn ra vườn cây', 264, 104),
      location: 'Giữa thiên nhiên yên tĩnh',
      tags: ['View núi', 'Không gian riêng tư'],
    },
    gallery: [],
    host: null,
    roomTypes: defaultRooms(850000),
    mapPin: { x: 12.8, y: 51 },
    nearby: ['vuon-quoc-gia-cuc-phuong', 'ho-yen-quang'],
    isDemo: true,
  },
  {
    id: 'cuc-phuong-eco-lodge',
    slug: 'cuc-phuong-eco-lodge',
    name: 'Cúc Phương Eco Lodge',
    type: 'eco-lodge',
    area: 'cuc-phuong',
    rating: 4.9,
    reviewCount: 112,
    location: 'Gần VQG Cúc Phương',
    address: 'Gần hồ Yên Quang, H. Nho Quan, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'pool', 'view', 'eco', 'family', 'parking'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'pool', label: 'Hồ bơi' },
    ],
    cardSummary: 'Lodge sinh thái giữa thiên nhiên, phòng rộng rãi, view núi rừng thoáng đãng.',
    tagline: 'Dãy bungalow bên mặt nước, lưng tựa núi rừng, nơi thiên nhiên luôn ở ngay cửa phòng.',
    description:
      'Cúc Phương Eco Lodge gồm những bungalow gỗ bên hồ bơi và vườn cây, lưng tựa núi rừng. Thích hợp cho gia đình và những ai muốn trải nghiệm thiên nhiên trọn vẹn.',
    highlights: ['Hồ bơi', 'Không gian xanh', 'Trải nghiệm thiên nhiên', 'Thân thiện môi trường'],
    popularity: 90,
    image: img(`${IMG}/stays/cuc-phuong-eco-lodge.webp`, 'Dãy nhà gỗ bên hồ bơi xanh', 201, 99),
    home: {
      image: img(`${IMG}/stay-eco-lodge.webp`, 'Dãy bungalow gỗ bên mặt hồ, núi rừng phía sau', 252, 104),
      location: 'Gần hồ Yên Quang',
      tags: ['Không gian xanh', 'Trải nghiệm thiên nhiên'],
    },
    gallery: [],
    host: null,
    roomTypes: defaultRooms(1200000),
    mapPin: { x: 69.5, y: 58 },
    nearby: ['ho-yen-quang', 'vuon-quoc-gia-cuc-phuong'],
    isDemo: true,
  },
  {
    id: 'moc-son-homestay',
    slug: 'moc-son-homestay',
    name: 'Mộc Sơn Homestay',
    type: 'homestay',
    area: 'cuc-phuong',
    rating: 4.7,
    reviewCount: 85,
    location: 'Thôn Mộc Sơn, Cúc Phương',
    address: 'Thôn Mộc Sơn, Cúc Phương, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'view', 'family'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'view', label: 'View núi' },
    ],
    cardSummary: 'Không gian ấm cúng, view núi, phù hợp cho gia đình và nhóm bạn.',
    tagline: 'Phòng hiện đại, ban công nhìn ra núi, gần trung tâm nên đi lại thuận tiện.',
    description:
      'Mộc Sơn Homestay có phòng hiện đại với ban công nhìn ra núi, gần trung tâm nên đi lại thuận tiện. Phù hợp cặp đôi, gia đình nhỏ và nhóm bạn.',
    highlights: ['View núi', 'Phòng hiện đại', 'Gần trung tâm', 'Phù hợp cặp đôi'],
    popularity: 85,
    image: img(`${IMG}/stays/moc-son-homestay.webp`, 'Phòng ngủ có ban công nhìn ra cây xanh', 203, 99),
    home: {
      image: img(`${IMG}/stay-moc-son.webp`, 'Phòng ngủ hiện đại có ban công nhìn ra núi', 251, 104),
      location: 'Gần trung tâm, thuận tiện di chuyển',
      tags: ['Phòng hiện đại', 'Phù hợp cặp đôi'],
    },
    gallery: [],
    host: null,
    roomTypes: defaultRooms(700000),
    mapPin: { x: 31.6, y: 65 },
    nearby: ['vuon-quoc-gia-cuc-phuong'],
    isDemo: true,
  },
  {
    id: 'nha-san-cuc-phuong',
    slug: 'nha-san-cuc-phuong',
    name: 'Nhà sàn Cúc Phương',
    type: 'nha-san',
    area: 'cuc-phuong',
    rating: 4.6,
    reviewCount: 74,
    location: 'Gần trung tâm VQG',
    address: 'Gần trung tâm VQG Cúc Phương, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'family', 'eco', 'parking'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'family', label: 'Phù hợp gia đình' },
    ],
    cardSummary: 'Trải nghiệm nhà sàn truyền thống của người Mường, hòa mình vào văn hóa bản địa.',
    tagline: 'Nhà sàn gỗ truyền thống, nơi bạn nghe kể chuyện bản Mường bên bếp lửa.',
    description:
      'Nhà sàn Cúc Phương giữ nguyên kiến trúc nhà sàn gỗ truyền thống, sàn rộng cho gia đình và nhóm bạn, gần trung tâm Vườn quốc gia.',
    highlights: ['Nhà sàn truyền thống', 'Văn hóa bản địa', 'Phù hợp gia đình', 'Không gian xanh'],
    popularity: 80,
    image: img(`${IMG}/stays/nha-san-cuc-phuong.webp`, 'Nhà sàn gỗ lên đèn dưới tán cây', 206, 100),
    gallery: [],
    host: null,
    roomTypes: defaultRooms(600000),
    mapPin: { x: 31.2, y: 94 },
    nearby: ['vuon-quoc-gia-cuc-phuong', 'dong-nguoi-xua'],
    isDemo: true,
  },
  {
    id: 'cuc-phuong-bungalow',
    slug: 'cuc-phuong-bungalow',
    name: 'Cúc Phương Bungalow',
    type: 'bungalow',
    area: 'cuc-phuong',
    rating: 4.7,
    reviewCount: 62,
    location: 'Xã Cúc Phương',
    address: 'Xã Cúc Phương, H. Nho Quan, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'view', 'eco'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'view', label: 'View rừng' },
    ],
    cardSummary: 'Những căn bungalow xinh xắn giữa rừng cây, riêng tư và yên tĩnh.',
    tagline: 'Những căn bungalow nhỏ giữa rừng cây, riêng tư và yên tĩnh.',
    description:
      'Cúc Phương Bungalow gồm các căn bungalow gỗ riêng biệt giữa vườn cây, phù hợp cho cặp đôi muốn không gian riêng tư.',
    highlights: ['View rừng', 'Riêng tư', 'Không gian xanh', 'Yên tĩnh'],
    popularity: 75,
    image: img(`${IMG}/stays/cuc-phuong-bungalow.webp`, 'Bungalow gỗ giữa vườn cây xanh', 204, 100),
    gallery: [],
    host: null,
    roomTypes: defaultRooms(900000),
    mapPin: { x: 58, y: 26 },
    nearby: ['vuon-quoc-gia-cuc-phuong'],
    isDemo: true,
  },
  {
    id: 'green-valley-homestay',
    slug: 'green-valley-homestay',
    name: 'Green Valley Homestay',
    type: 'homestay',
    area: 'cuc-phuong',
    rating: 4.5,
    reviewCount: 48,
    location: 'Gần Hồ Yên Quang',
    address: 'Gần hồ Yên Quang, H. Nho Quan, Ninh Bình',
    amenities: ['wifi', 'breakfast', 'kitchen', 'family', 'parking'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'kitchen', label: 'Có bếp' },
    ],
    cardSummary: 'Không gian xanh mát, sân vườn rộng, phù hợp cho nhóm bạn.',
    tagline: 'Sân vườn rộng, bếp chung ấm cúng, hợp cho những buổi tụ họp của nhóm bạn.',
    description:
      'Green Valley Homestay có sân vườn rộng và bếp chung, gần hồ Yên Quang, phù hợp cho nhóm bạn và gia đình muốn tự nấu nướng.',
    highlights: ['Sân vườn rộng', 'Có bếp', 'Phù hợp nhóm bạn', 'Gần hồ'],
    popularity: 70,
    image: img(`${IMG}/stays/green-valley-homestay.webp`, 'Nhà gỗ có hiên và ghế tắm nắng trong vườn', 201, 100),
    gallery: [],
    host: null,
    roomTypes: defaultRooms(550000),
    mapPin: { x: 86, y: 40 },
    nearby: ['ho-yen-quang'],
    isDemo: true,
  },
  {
    id: 'trang-an-nature-lodge',
    slug: 'trang-an-nature-lodge',
    name: 'Tràng An Nature Lodge',
    type: 'resort',
    area: 'trang-an',
    rating: 4.8,
    reviewCount: 91,
    location: 'Gần Tràng An, Ninh Bình',
    address: 'Khu vực Tràng An, Ninh Bình (không thuộc Cúc Phương)',
    amenities: ['wifi', 'breakfast', 'pool', 'view', 'family', 'parking'],
    cardFeatures: [
      { icon: 'wifi', label: 'Wi-Fi' },
      { icon: 'breakfast', label: 'Bữa sáng' },
      { icon: 'pool', label: 'Hồ bơi' },
    ],
    cardSummary: 'Lodge cao cấp, tiện nghi hiện đại, kết hợp trải nghiệm thiên nhiên.',
    tagline: 'Lodge gỗ bên hồ bơi, thuận tiện khám phá Tràng An và Tam Cốc.',
    description:
      'Tràng An Nature Lodge nằm ở khu vực Tràng An, cách Cúc Phương một đoạn đường. Tiện nghi hiện đại, hồ bơi và vườn cây, thuận tiện khám phá quần thể danh thắng.',
    highlights: ['Hồ bơi', 'Tiện nghi hiện đại', 'Gần Tràng An', 'Phù hợp gia đình'],
    popularity: 65,
    image: img(`${IMG}/stays/trang-an-nature-lodge.webp`, 'Dãy lodge gỗ bên hồ bơi giữa rừng cây', 203, 100),
    gallery: [],
    host: null,
    roomTypes: defaultRooms(1500000),
    mapPin: { x: 93, y: 64 },
    nearby: ['trang-an', 'hang-mua'],
    isDemo: true,
  },
];

export const staysById = new Map(stays.map((s) => [s.id, s]));

export const getStay = (slug: string) => staysById.get(slug) ?? null;

/** Lowest nightly rate among the stay's room types. */
export const fromPrice = (stay: Stay) => Math.min(...stay.roomTypes.map((r) => r.pricePerNight));

export const maxCapacity = (stay: Stay) =>
  Math.max(...stay.roomTypes.map((r) => r.capacity * r.maxRooms));

/** Every distinct image for a stay, in display order. */
export const galleryFor = (stay: Stay): ImageAsset[] => {
  const seen = new Set<string>();
  const list = [...stay.gallery, stay.image, ...(stay.home ? [stay.home.image] : [])];
  if (!stay.gallery.length) {
    for (const r of stay.roomTypes) list.push({ ...r.image, caption: `${r.name} (ảnh minh họa)` });
  }
  return list.filter((i) => (seen.has(i.src) ? false : (seen.add(i.src), true)));
};

export const HOME_STAY_IDS = [
  'cuc-phuong-forest-homestay',
  'an-nhien-retreat',
  'cuc-phuong-eco-lodge',
  'moc-son-homestay',
];

export const CHECK_IN_FACTS = {
  checkIn: '14:00',
  checkOut: '12:00',
  earlyCheckIn: 'Hỗ trợ nhận phòng sớm (tùy tình trạng phòng)',
  luggage: 'Có thể gửi hành lý trước/sau giờ nhận phòng',
  breakfast: 'Bữa sáng: 06:30 - 09:00 (đặc sản địa phương)',
  tours: 'Hỗ trợ đặt tour rừng Cúc Phương, thuê xe, hướng dẫn viên',
  isDemo: true,
};

export const HOUSE_RULES = [
  { icon: 'smoke', text: 'Không hút thuốc trong phòng' },
  { icon: 'pet', text: 'Không mang thú cưng (trừ khi có thỏa thuận trước)' },
  { icon: 'quiet', text: 'Giữ yên tĩnh sau 22:00' },
  { icon: 'party', text: 'Không tổ chức tiệc, hát karaoke lớn' },
  { icon: 'lock', text: 'Tự bảo quản tài sản cá nhân' },
  { icon: 'fix', text: 'Bồi thường nếu làm hư hại trang thiết bị' },
] as const;

export const STAY_NOTES = [
  'Mang theo giấy tờ tùy thân',
  'Giữ gìn vệ sinh, bảo vệ môi trường',
  'Không gây ồn sau 22:00',
  'Tôn trọng văn hóa địa phương',
  'Cùng nhau giữ rừng xanh nhé!',
];

export const DETAIL_AMENITIES = [
  { icon: 'wifi', label: 'WiFi miễn phí' },
  { icon: 'ac', label: 'Điều hòa 2 chiều' },
  { icon: 'bath', label: 'Phòng tắm riêng' },
  { icon: 'toiletries', label: 'Đồ vệ sinh cá nhân' },
  { icon: 'balcony', label: 'Ban công view núi' },
  { icon: 'desk', label: 'Khu vực làm việc' },
  { icon: 'breakfast', label: 'Bữa sáng bản địa' },
  { icon: 'nosmoke', label: 'Không hút thuốc' },
] as const;

export const AMENITY_GROUPS = [
  { title: 'Phòng ngủ', items: ['Điều hòa 2 chiều', 'Chăn ga gối sạch', 'Khu vực làm việc', 'Ban công view núi'] },
  { title: 'Phòng tắm', items: ['Phòng tắm riêng', 'Nước nóng', 'Đồ vệ sinh cá nhân', 'Khăn tắm'] },
  { title: 'Ăn uống', items: ['Bữa sáng bản địa (tính phí riêng)', 'Ấm đun nước', 'Khu BBQ ngoài trời'] },
  { title: 'Chung', items: ['WiFi miễn phí', 'Chỗ đậu xe', 'Không hút thuốc trong phòng'] },
];
