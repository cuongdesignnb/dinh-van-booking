/**
 * Demo fixtures reproduced from the design mockup.
 * Prices, ratings, reviews and destination copy are illustrative only and must
 * be replaced with confirmed data before production.
 */
const IMG = '/images/dinh-van-booking';

export interface Stay {
  id: string;
  slug: string;
  name: string;
  rating: number;
  reviewCount: number;
  location: string;
  amenities: [string, string];
  /** VND per night */
  pricePerNight: number;
  maxGuests: number;
  badge?: string;
  image: { src: string; alt: string; width: number; height: number; position?: string };
  summary: string;
  demo: true;
}

export const stays: Stay[] = [
  {
    id: 'stay-01',
    slug: 'cuc-phuong-forest-homestay',
    name: 'Cúc Phương Forest Homestay',
    rating: 4.9,
    reviewCount: 128,
    location: 'Gần Vườn quốc gia Cúc Phương',
    amenities: ['Không gian xanh', 'Phù hợp gia đình'],
    pricePerNight: 650000,
    maxGuests: 6,
    badge: 'Bán chạy',
    image: {
      src: `${IMG}/stay-forest.webp`,
      alt: 'Cụm nhà gỗ lên đèn ấm giữa vườn cây xanh',
      width: 264,
      height: 104,
    },
    summary:
      'Nhà gỗ giữa vườn cây, cách cổng Vườn quốc gia một đoạn ngắn. Phù hợp gia đình muốn không gian xanh, yên tĩnh.',
    demo: true,
  },
  {
    id: 'stay-02',
    slug: 'an-nhien-retreat',
    name: 'An Nhiên Retreat',
    rating: 4.8,
    reviewCount: 96,
    location: 'Giữa thiên nhiên yên tĩnh',
    amenities: ['View núi', 'Không gian riêng tư'],
    pricePerNight: 850000,
    maxGuests: 3,
    image: {
      src: `${IMG}/stay-retreat.webp`,
      alt: 'Phòng ngủ cửa kính lớn nhìn ra vườn cây',
      width: 264,
      height: 104,
    },
    summary:
      'Phòng ngủ cửa kính lớn, nhìn thẳng ra vườn và núi. Không gian riêng tư cho kỳ nghỉ chậm rãi.',
    demo: true,
  },
  {
    id: 'stay-03',
    slug: 'cuc-phuong-eco-lodge',
    name: 'Cúc Phương Eco Lodge',
    rating: 4.9,
    reviewCount: 112,
    location: 'Gần hồ Yên Quang',
    amenities: ['Không gian xanh', 'Trải nghiệm thiên nhiên'],
    pricePerNight: 1200000,
    maxGuests: 4,
    image: {
      src: `${IMG}/stay-eco-lodge.webp`,
      alt: 'Dãy bungalow gỗ bên mặt hồ, núi rừng phía sau',
      width: 252,
      height: 104,
    },
    summary:
      'Dãy bungalow bên mặt nước, lưng tựa núi rừng. Thích hợp cho những ai muốn trải nghiệm thiên nhiên trọn vẹn.',
    demo: true,
  },
  {
    id: 'stay-04',
    slug: 'moc-son-homestay',
    name: 'Mộc Sơn Homestay',
    rating: 4.7,
    reviewCount: 85,
    location: 'Gần trung tâm, thuận tiện di chuyển',
    amenities: ['Phòng hiện đại', 'Phù hợp cặp đôi'],
    pricePerNight: 700000,
    maxGuests: 2,
    image: {
      src: `${IMG}/stay-moc-son.webp`,
      alt: 'Phòng ngủ hiện đại có ban công nhìn ra núi',
      width: 251,
      height: 104,
    },
    summary:
      'Phòng hiện đại, ban công nhìn ra núi, gần trung tâm nên đi lại thuận tiện. Hợp với cặp đôi.',
    demo: true,
  },
];

export const trustItems = [
  { id: 'quality', icon: 'leaf', lines: ['Phòng nghỉ chất lượng', 'tuyển chọn kỹ lưỡng'] },
  { id: 'care', icon: 'heart', lines: ['Tư vấn tận tình như người địa phương'] },
  { id: 'price', icon: 'shield', lines: ['Giá tốt, không qua trung gian'] },
  { id: 'journey', icon: 'users', lines: ['Đồng hành trước - trong - sau chuyến đi'] },
] as const;

export const reasons = [
  { id: 'local', icon: 'user', lines: ['Người địa phương', 'tư vấn tận tâm'] },
  { id: 'rooms', icon: 'house', lines: ['Phòng nghỉ', 'tuyển chọn kỹ'] },
  { id: 'support', icon: 'message', lines: ['Hỗ trợ nhanh chóng', 'qua Zalo, điện thoại'] },
  { id: 'price', icon: 'tag', lines: ['Giá tốt', 'không qua trung gian'] },
  { id: 'plan', icon: 'map', lines: ['Gợi ý lịch trình, điểm đến', 'phù hợp nhu cầu'] },
] as const;

export interface Destination {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number };
  demo: true;
}

export const destinations: Destination[] = [
  {
    id: 'vuon-quoc-gia-cuc-phuong',
    name: 'Vườn quốc gia Cúc Phương',
    subtitle: 'Khám phá rừng nguyên sinh',
    description:
      'Đi bộ xuyên rừng, ngắm cây chò nghìn năm và tìm hiểu các chương trình bảo tồn động vật.',
    image: {
      src: `${IMG}/destination-cuc-phuong.webp`,
      alt: 'Cổng gỗ Vườn quốc gia Cúc Phương giữa rừng',
      width: 163,
      height: 80,
    },
    demo: true,
  },
  {
    id: 'ho-yen-quang',
    name: 'Hồ Yên Quang',
    subtitle: 'Vẻ đẹp yên bình giữa núi rừng',
    description: 'Mặt hồ phẳng lặng soi bóng núi đá vôi, đẹp nhất vào sáng sớm và lúc hoàng hôn.',
    image: {
      src: `${IMG}/destination-yen-quang.webp`,
      alt: 'Mặt hồ xanh phản chiếu dãy núi',
      width: 160,
      height: 80,
    },
    demo: true,
  },
  {
    id: 'dong-nguoi-xua',
    name: 'Động người xưa',
    subtitle: 'Dấu tích lịch sử hàng nghìn năm',
    description: 'Hang động nằm sâu trong rừng, lối vào rợp bóng cây, gắn với dấu tích người tiền sử.',
    image: {
      src: `${IMG}/destination-dong-nguoi-xua.webp`,
      alt: 'Nhóm du khách đi bộ trên đường rừng dẫn vào động',
      width: 161,
      height: 80,
    },
    demo: true,
  },
  {
    id: 'trang-an',
    name: 'Tràng An - Ninh Bình',
    subtitle: 'Non nước hữu tình, di sản thế giới',
    description: 'Ngồi thuyền len qua các hang xuyên thủy, giữa non nước hữu tình của quần thể danh thắng.',
    image: {
      src: `${IMG}/destination-trang-an.webp`,
      alt: 'Thuyền nhỏ trên sông giữa các núi đá vôi Tràng An',
      width: 164,
      height: 80,
    },
    demo: true,
  },
  {
    id: 'am-thuc-ninh-binh',
    name: 'Ẩm thực Ninh Bình',
    subtitle: 'Thưởng thức đặc sản địa phương',
    description: 'Dê núi, cơm cháy, rau rừng… những món ăn mộc mạc đậm vị núi rừng Ninh Bình.',
    image: {
      src: `${IMG}/destination-am-thuc.webp`,
      alt: 'Mâm cơm với nhiều món đặc sản địa phương',
      width: 176,
      height: 80,
    },
    demo: true,
  },
];

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  context: string;
  avatar: string | null;
  /** Design sample, not a verified review. Do not emit review structured data. */
  demo: true;
}

export const testimonials: Testimonial[] = [
  {
    id: 't-01',
    quote:
      'Chuyến đi Cúc Phương của gia đình mình thật tuyệt vời! Anh Đinh Vân tư vấn rất nhiệt tình, phòng đẹp, đúng như hình ảnh. Cảm giác rất an tâm vì có người bản địa hỗ trợ.',
    author: 'Nguyễn Thu Hà',
    context: 'Gia đình có trẻ nhỏ',
    avatar: `${IMG}/testimonial-avatar.webp`,
    demo: true,
  },
  {
    id: 't-02',
    quote:
      'Lần đầu đi Ninh Bình mà không phải lo gì cả. Lịch trình được gợi ý vừa sức, homestay yên tĩnh, sáng dậy nghe chim hót.',
    author: 'Khách mẫu (demo)',
    context: 'Cặp đôi',
    avatar: null,
    demo: true,
  },
  {
    id: 't-03',
    quote:
      'Nhóm bạn tụi mình được tư vấn phòng gần hồ Yên Quang, giá hợp lý và hỗ trợ rất nhanh qua điện thoại.',
    author: 'Khách mẫu (demo)',
    context: 'Nhóm bạn',
    avatar: null,
    demo: true,
  },
  {
    id: 't-04',
    quote: 'Được chỉ chỗ ăn đặc sản ngon mà giá phải chăng, cảm giác như có người nhà ở Cúc Phương.',
    author: 'Khách mẫu (demo)',
    context: 'Du lịch một mình',
    avatar: null,
    demo: true,
  },
];

export const formatVnd = (value: number) =>
  `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
