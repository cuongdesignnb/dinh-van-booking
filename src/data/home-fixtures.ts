/**
 * Demo fixtures reproduced from the design mockup.
 * Prices, ratings, reviews and destination copy are illustrative only and must
 * be replaced with confirmed data before production.
 */
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
    avatar: '/images/dinh-van-booking/testimonial-avatar.webp',
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

export { formatVnd } from '@/lib/format';
