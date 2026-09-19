/**
 * Review and FAQ fixtures. Reviews are design samples, not verified customer
 * reviews: never emit Review structured data from them. FAQ answers only point
 * the visitor to a consultation and do not state binding policies.
 */
import type { Faq, ImageAsset, Review } from './types';

const IMG = '/images/dinh-van-booking';
const av = (file: string): ImageAsset => ({ src: `${IMG}/people/${file}`, alt: '', width: 46, height: 46 });

export const stayListingReviews: Review[] = [
  {
    id: 'rs-1',
    author: 'Nguyễn Thị Mai',
    rating: 5,
    quote: 'Phòng sạch sẽ, view rừng rất đẹp. Chủ nhà thân thiện và nhiệt tình! Chắc chắn sẽ quay lại.',
    avatar: av('review-stays-1.webp'),
    isDemo: true,
  },
  {
    id: 'rs-2',
    author: 'Trần Quốc Hùng',
    rating: 5,
    quote: 'Đinh Vân tư vấn rất có tâm, chọn cho gia đình mình chỗ ở phù hợp. Trải nghiệm tuyệt vời!',
    avatar: av('review-stays-2.webp'),
    isDemo: true,
  },
  {
    id: 'rs-3',
    author: 'Lê Thu Hà',
    rating: 5,
    quote: 'Không gian yên tĩnh, gần gũi thiên nhiên. Rất thích cảm giác buổi sáng thức dậy giữa tiếng chim rừng.',
    avatar: av('review-stays-3.webp'),
    isDemo: true,
  },
  {
    id: 'rs-4',
    author: 'Khách mẫu (demo)',
    rating: 4.5,
    quote: 'Được gợi ý phòng gần hồ Yên Quang, giá hợp lý và hỗ trợ rất nhanh.',
    avatar: null,
    isDemo: true,
  },
  {
    id: 'rs-5',
    author: 'Khách mẫu (demo)',
    rating: 5,
    quote: 'Nhà sàn rất đặc biệt, bọn trẻ thích mê. Cảm ơn Đinh Vân đã tư vấn!',
    avatar: null,
    isDemo: true,
  },
];

export const stayDetailReviews: Review[] = [
  {
    id: 'rd-1',
    author: 'Nguyễn Thu Hà',
    rating: 5,
    date: '2026-08-12',
    quote: 'Homestay tuyệt vời, chủ nhà rất thân thiện và nhiệt tình. Phòng sạch sẽ, view rừng cực đẹp. Chắc chắn sẽ quay lại!',
    avatar: av('review-detail-1.webp'),
    photos: [1, 2, 3].map((i) => ({ src: `${IMG}/reviews/r1-${i}.webp`, alt: 'Ảnh khách chia sẻ (minh họa)', width: 52, height: 34 })),
    isDemo: true,
  },
  {
    id: 'rd-2',
    author: 'Trần Minh Quân',
    rating: 5,
    date: '2026-08-02',
    quote: 'Trải nghiệm đáng nhớ! Bữa sáng ngon, không khí trong lành, rất phù hợp để nghỉ dưỡng cuối tuần.',
    avatar: av('review-detail-2.webp'),
    photos: [1, 2, 3].map((i) => ({ src: `${IMG}/reviews/r2-${i}.webp`, alt: 'Ảnh khách chia sẻ (minh họa)', width: 52, height: 34 })),
    isDemo: true,
  },
  {
    id: 'rd-3',
    author: 'Lê Hoàng Anh',
    rating: 4.8,
    date: '2026-07-28',
    quote: 'Homestay đẹp hơn cả mong đợi, mọi thứ đều chỉn chu và gần gũi thiên nhiên. Cảm ơn anh Nam đã chăm sóc rất chu đáo!',
    avatar: av('review-detail-3.webp'),
    photos: [1, 2, 3].map((i) => ({ src: `${IMG}/reviews/r3-${i}.webp`, alt: 'Ảnh khách chia sẻ (minh họa)', width: 52, height: 34 })),
    isDemo: true,
  },
];

export const comboReviews: Review[] = [
  {
    id: 'rc-1',
    author: 'Nguyễn Thị Mai',
    context: 'Hà Nội',
    rating: 5,
    quote: 'Chuyến đi Cúc Phương thật tuyệt vời! Lịch trình hợp lý, dịch vụ chu đáo và hướng dẫn viên rất am hiểu.',
    avatar: av('review-combo-1.webp'),
    isDemo: true,
  },
  {
    id: 'rc-2',
    author: 'Trần Minh Đức',
    context: 'TP. Hồ Chí Minh',
    rating: 5,
    quote: 'Gia đình mình rất hài lòng. Các bé thích nhất là đi rừng và thăm các loài động vật. Cảm ơn Đinh Vân Booking!',
    avatar: av('review-combo-2.webp'),
    isDemo: true,
  },
  {
    id: 'rc-3',
    author: 'Lê Thu Hằng',
    context: 'Đà Nẵng',
    rating: 5,
    quote: 'Team mình có chuyến đi đáng nhớ với nhiều hoạt động thú vị. Sẽ quay lại trong các hành trình tiếp theo!',
    avatar: av('review-combo-3.webp'),
    isDemo: true,
  },
];

const consult = ' Đinh Vân sẽ tư vấn cụ thể cho từng chỗ nghỉ/combo và thời điểm bạn đi.';

export const stayFaqs: Faq[] = [
  { id: 'huy-phong', question: 'Có thể hủy phòng không?', answer: 'Chính sách hủy khác nhau tùy chỗ nghỉ và đang được cập nhật.' + consult },
  { id: 'bua-sang', question: 'Có bữa sáng không?', answer: 'Nhiều chỗ nghỉ có bữa sáng đặc sản địa phương, có nơi tính phí riêng.' + consult },
  { id: 'gio-nhan-tra', question: 'Thời gian nhận và trả phòng?', answer: 'Giờ nhận/trả phòng tham khảo ở trang chi tiết từng chỗ nghỉ; nhận sớm tùy tình trạng phòng.' + consult },
  { id: 'gia-dinh', question: 'Phù hợp cho gia đình không?', answer: 'Có nhiều lựa chọn phòng gia đình, bungalow và nhà sàn rộng.' + consult },
  { id: 'lien-he-chu-nha', question: 'Tôi có thể liên hệ trực tiếp với chủ nhà không?', answer: 'Đinh Vân sẽ kết nối bạn với chủ nhà khi cần thiết sau khi tư vấn.' },
  { id: 'thanh-toan', question: 'Thanh toán như thế nào?', answer: 'Phương thức thanh toán đang được cập nhật. Hiện website chỉ tiếp nhận nhu cầu để tư vấn.' },
];

export const comboFaqs: Faq[] = [
  { id: 'gom-gi', question: 'Giá combo đã bao gồm những gì?', answer: 'Mỗi combo có danh sách bao gồm/chưa bao gồm riêng trong phần chi tiết. Giá là tham khảo.' + consult },
  { id: 'tuy-chinh', question: 'Có thể tùy chỉnh lịch trình theo yêu cầu không?', answer: 'Lịch trình có thể điều chỉnh theo nhu cầu và điều kiện thực tế.' + consult },
  { id: 'tre-em', question: 'Trẻ em có tính giá như người lớn không?', answer: 'Giá trẻ em tùy từng combo và dịch vụ đi kèm, chưa có chính sách chung.' + consult },
  { id: 'hoan-huy', question: 'Chính sách hoàn hủy như thế nào?', answer: 'Chính sách hoàn hủy tùy combo và sẽ được xác nhận khi tư vấn; hiện chưa có điều khoản công bố.' },
];

export const contactFaqs: Faq[] = [
  { id: 'nhan-tra', question: 'Thời gian nhận và trả phòng như thế nào?', answer: 'Tùy từng chỗ nghỉ; thường nhận phòng buổi chiều và trả phòng buổi trưa.' + consult },
  { id: 'tour', question: 'Có hỗ trợ đặt tour tham quan Cúc Phương không?', answer: 'Có thể gợi ý lịch trình và kết nối dịch vụ phù hợp.' + consult },
  { id: 'tre-nho', question: 'Nhà có phù hợp cho gia đình có trẻ nhỏ không?', answer: 'Có nhiều chỗ nghỉ phù hợp gia đình.' + consult },
  { id: 'dat-coc', question: 'Có cần đặt cọc trước không?', answer: 'Chính sách đặt cọc tùy chỗ nghỉ/combo và chưa được công bố.' + consult },
  { id: 'phan-hoi', question: 'Bao lâu mình nhận được phản hồi?', answer: 'Website đang ở bản xem trước, chưa gửi yêu cầu tự động. Vui lòng liên hệ khi thông tin liên hệ được cập nhật.' },
];
