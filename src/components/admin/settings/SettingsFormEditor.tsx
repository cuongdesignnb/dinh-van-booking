'use client';

import { useMemo, useRef, useState } from 'react';
import { AdminMediaField } from '../media/AdminMediaField';
import { MediaLibrary } from '../media/MediaLibrary';
import { RichTextEditor, type RichDocument } from '../shared/RichTextEditor';
import { AboutPageForm } from './AboutPageForm';

type Option = { value: string; label: string; description?: string };
type FieldKind = 'text' | 'textarea' | 'rich' | 'number' | 'time' | 'email' | 'url' | 'route' | 'tel' | 'select' | 'radio' | 'boolean' | 'media' | 'bytes' | 'multi' | 'ordered';
type FieldMeta = {
  label: string;
  kind?: FieldKind;
  help?: string;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  nullable?: boolean;
  required?: boolean;
  suffix?: string;
  options?: Option[];
  recommendedWidth?: number;
  recommendedHeight?: number;
  recommendedRatio?: number;
};

const SECTIONS: Option[] = [
  { value: 'hero', label: 'Hero' },
  { value: 'trust', label: 'Cam kết' },
  { value: 'search', label: 'Tìm kiếm' },
  { value: 'featured', label: 'Phòng nghỉ nổi bật' },
  { value: 'why', label: 'Vì sao chọn chúng tôi' },
  { value: 'contact', label: 'Người tư vấn (cạnh “Vì sao chọn”)' },
  { value: 'stats', label: 'Những con số' },
  { value: 'partner', label: 'Mời hợp tác đối tác' },
  { value: 'combos', label: 'Combo' },
  { value: 'destinations', label: 'Điểm đến' },
  { value: 'reviews', label: 'Đánh giá' },
  { value: 'promo', label: 'Giới thiệu trải nghiệm' },
  { value: 'faq', label: 'FAQ' },
];

const BLOCKS: Option[] = [
  { value: 'paragraph', label: 'Đoạn văn' },
  { value: 'heading', label: 'Tiêu đề' },
  { value: 'bulletList', label: 'Danh sách gạch đầu dòng' },
  { value: 'orderedList', label: 'Danh sách đánh số' },
  { value: 'blockquote', label: 'Trích dẫn' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'table', label: 'Bảng' },
  { value: 'callout', label: 'Khung ghi chú' },
];

const MIME_TYPES: Option[] = [
  { value: 'image/jpeg', label: 'JPEG / JPG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/avif', label: 'AVIF' },
  { value: 'image/gif', label: 'GIF' },
];

const CRM_SOURCES: Option[] = [
  { value: 'website', label: 'Website' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'phone', label: 'Điện thoại' },
  { value: 'walk_in', label: 'Khách đến trực tiếp' },
  { value: 'referral', label: 'Được giới thiệu' },
];

const PAYMENT_METHODS: Option[] = [
  { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'online', label: 'Thanh toán trực tuyến' },
  { value: 'card', label: 'Thẻ ngân hàng' },
];

const CANCELLATION_TIER = { beforeHours: 24, refundPercent: 100 };

const FIELD_META: Record<string, FieldMeta> = {
  'brand.identity.name': { label: 'Tên thương hiệu', required: true, placeholder: 'Ví dụ: Cúc Phương Travel' },
  'brand.identity.shortName': { label: 'Tên viết gọn', placeholder: 'Tên ngắn dùng trên menu' },
  'brand.identity.tagline': { label: 'Khẩu hiệu', placeholder: 'Thông điệp ngắn của thương hiệu' },
  'brand.identity.description': { label: 'Mô tả thương hiệu', kind: 'rich', help: 'Nội dung dài dùng trình soạn thảo; có thể chèn ảnh từ Media Library.' },
  'brand.identity.logoMediaId': { label: 'Logo', kind: 'media', recommendedWidth: 600, recommendedHeight: 200, recommendedRatio: 3, help: 'Khuyến nghị ảnh ngang từ 600 × 200 px.' },
  'brand.identity.faviconMediaId': { label: 'Biểu tượng trình duyệt (favicon)', kind: 'media', recommendedWidth: 512, recommendedHeight: 512, recommendedRatio: 1, help: 'Khuyến nghị ảnh vuông tối thiểu 512 × 512 px.' },
  'brand.contact.phone': { label: 'Số điện thoại', kind: 'tel', placeholder: '024…' },
  'brand.contact.hotline': { label: 'Hotline', kind: 'tel' },
  'brand.contact.zaloUrl': { label: 'Liên kết Zalo', kind: 'url', placeholder: 'https://zalo.me/…' },
  'brand.contact.email': { label: 'Email liên hệ', kind: 'email' },
  'brand.contact.address': { label: 'Địa chỉ', placeholder: 'Địa chỉ hiển thị công khai' },
  'brand.contact.mapUrl': { label: 'Liên kết bản đồ', kind: 'url', placeholder: 'https://maps.google.com/…' },
  'brand.social.facebook': { label: 'Facebook', kind: 'url' },
  'brand.social.instagram': { label: 'Instagram', kind: 'url' },
  'brand.social.youtube': { label: 'YouTube', kind: 'url' },
  'brand.social.tiktok': { label: 'TikTok', kind: 'url' },
  'brand.businessHours.weekdays': { label: 'Giờ làm việc ngày thường', placeholder: 'Ví dụ: 08:00–17:30' },
  'brand.businessHours.weekend': { label: 'Giờ làm việc cuối tuần', placeholder: 'Ví dụ: 08:00–17:30' },
  'brand.businessHours.note': { label: 'Ghi chú giờ làm việc', kind: 'rich' },

  'booking.rules.minNights': { label: 'Số đêm tối thiểu', kind: 'number', min: 1, step: 1, required: true, suffix: 'đêm' },
  'booking.rules.maxNights': { label: 'Số đêm tối đa', kind: 'number', min: 1, step: 1, required: true, suffix: 'đêm' },
  'booking.rules.maxAdults': { label: 'Số người lớn tối đa', kind: 'number', min: 1, step: 1, required: true, suffix: 'người' },
  'booking.rules.maxChildren': { label: 'Số trẻ em tối đa', kind: 'number', min: 0, step: 1, required: true, suffix: 'trẻ' },
  'booking.rules.maxRoomsPerBooking': { label: 'Số phòng tối đa mỗi đơn', kind: 'number', min: 1, step: 1, required: true, suffix: 'phòng' },
  'booking.rules.advanceBookingDays': { label: 'Được đặt trước tối đa', kind: 'number', min: 1, step: 1, required: true, suffix: 'ngày' },
  'booking.rules.sameDayCutoffHour': { label: 'Giờ chốt nhận đặt trong ngày', kind: 'number', min: 0, max: 23, step: 1, nullable: true, suffix: 'giờ (0–23)' },
  'booking.rules.defaultCheckInTime': { label: 'Giờ nhận phòng mặc định', kind: 'time', nullable: true },
  'booking.rules.defaultCheckOutTime': { label: 'Giờ trả phòng mặc định', kind: 'time', nullable: true },
  'booking.rules.depositPercent': { label: 'Tỷ lệ đặt cọc', kind: 'number', min: 0, max: 100, step: 1, nullable: true, suffix: '%' },
  'booking.rules.holdMinutes': { label: 'Thời gian giữ phòng', kind: 'number', min: 1, step: 1, nullable: true, suffix: 'phút' },
  'booking.rules.quoteMinutes': { label: 'Thời hạn hiệu lực báo giá', kind: 'number', min: 1, step: 1, nullable: true, suffix: 'phút' },
  'booking.rules.requirePhone': { label: 'Bắt buộc số điện thoại', kind: 'boolean' },
  'booking.rules.requireEmail': { label: 'Bắt buộc email', kind: 'boolean' },
  'booking.rules.allowOnlinePayment': { label: 'Cho phép thanh toán trực tuyến', kind: 'boolean' },
  'booking.cancellation.freeCancelHours': { label: 'Huỷ miễn phí trước giờ nhận phòng', kind: 'number', min: 0, step: 1, nullable: true, suffix: 'giờ' },
  'booking.cancellation.tiers': { label: 'Các mốc hoàn tiền', help: 'Thêm mốc theo số giờ trước ngày nhận phòng và tỷ lệ hoàn tương ứng.' },
  'booking.cancellation.tiers[].beforeHours': { label: 'Huỷ trước ít nhất', kind: 'number', min: 0, step: 1, required: true, suffix: 'giờ' },
  'booking.cancellation.tiers[].refundPercent': { label: 'Tỷ lệ hoàn tiền', kind: 'number', min: 0, max: 100, step: 1, required: true, suffix: '%' },
  'booking.cancellation.note': { label: 'Ghi chú chính sách huỷ', kind: 'rich' },
  'booking.payment.methods': { label: 'Phương thức thanh toán', kind: 'multi', options: PAYMENT_METHODS, help: 'Chỉ chọn phương thức cơ sở thực sự chấp nhận.' },
  'booking.payment.bankAccount.bankName': { label: 'Tên ngân hàng' },
  'booking.payment.bankAccount.accountNumber': { label: 'Số tài khoản' },
  'booking.payment.bankAccount.accountHolder': { label: 'Chủ tài khoản' },
  'booking.payment.bankAccount.branch': { label: 'Chi nhánh' },
  'booking.payment.bankAccount.qrMediaId': { label: 'Mã QR thanh toán', kind: 'media', recommendedWidth: 800, recommendedHeight: 800, recommendedRatio: 1, help: 'Khuyến nghị ảnh vuông tối thiểu 800 × 800 px để mã dễ quét.' },

  'locale.formats.locale': { label: 'Ngôn ngữ', kind: 'select', options: [{ value: 'vi-VN', label: 'Tiếng Việt' }, { value: 'en-US', label: 'English (US)' }] },
  'locale.formats.timezone': { label: 'Múi giờ', kind: 'select', options: [{ value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (Asia/Ho_Chi_Minh)' }, { value: 'UTC', label: 'UTC' }] },
  'locale.formats.currency': { label: 'Đơn vị tiền tệ', kind: 'select', options: [{ value: 'VND', label: 'Việt Nam đồng (VND)' }, { value: 'USD', label: 'Đô la Mỹ (USD)' }] },
  'locale.formats.currencySuffix': { label: 'Ký hiệu sau số tiền', placeholder: 'Ví dụ: đ' },
  'locale.formats.dateFormat': { label: 'Định dạng ngày', kind: 'select', options: [{ value: 'dd/MM/yyyy', label: '23/09/2026' }, { value: 'dd-MM-yyyy', label: '23-09-2026' }, { value: 'yyyy-MM-dd', label: '2026-09-23' }] },

  'seo.defaults.titleTemplate': { label: 'Mẫu tiêu đề trang', placeholder: '%s | Cúc Phương Travel' },
  'seo.defaults.defaultTitle': { label: 'Tiêu đề mặc định', placeholder: 'Cúc Phương Travel — nghỉ dưỡng Cúc Phương' },
  'seo.defaults.defaultDescription': { label: 'Mô tả mặc định', maxLength: 320, placeholder: 'Mô tả ngắn dùng cho kết quả tìm kiếm' },
  'seo.defaults.canonicalBase': { label: 'Tên miền chính thức', kind: 'url', placeholder: 'https://tenmien.vn' },
  'seo.defaults.ogMediaId': { label: 'Ảnh chia sẻ mạng xã hội', kind: 'media', recommendedWidth: 1200, recommendedHeight: 630, recommendedRatio: 1.91 },
  'seo.defaults.robotsIndex': { label: 'Cho phép công cụ tìm kiếm lập chỉ mục website', kind: 'boolean', help: 'Đây là lựa chọn nội dung. Máy chủ chỉ mở index khi môi trường và domain chính thức cũng được Owner duyệt.' },
  'seo.defaults.verification.google': { label: 'Mã xác minh Google' },
  'seo.defaults.verification.bing': { label: 'Mã xác minh Bing' },
  'seo.structuredData.core': { label: 'Schema nền tảng', kind: 'boolean', help: 'Website, tổ chức, trang, danh mục và breadcrumb từ dữ liệu public thật.' },
  'seo.structuredData.offers': { label: 'Schema giá và ưu đãi', kind: 'boolean', help: 'Chưa phát ra cho tới khi API giá và tồn phòng được xác minh đầy đủ.' },
  'seo.structuredData.reviews': { label: 'Schema đánh giá', kind: 'boolean', help: 'Chưa phát ra cho tới khi quy trình duyệt và dữ liệu review public đủ điều kiện.' },
  'seo.structuredData.localBusiness': { label: 'Đã xác minh thông tin doanh nghiệp (TravelAgency)', kind: 'boolean', help: 'Chỉ bật khi tên, số điện thoại, địa chỉ và khu vực phục vụ trong Cài đặt là thật và đang hiển thị trên website. Khi tắt, Schema chỉ dùng Organization.' },
  'seo.structuredData.vacationRental': { label: 'Schema Vacation Rental', kind: 'boolean', help: 'Đang khóa theo điều kiện eligibility và tích hợp Google Hotels; không bật chỉ bằng một công tắc.' },

  'analytics.providers.googleAnalyticsId': { label: 'Mã Google Analytics', placeholder: 'G-XXXXXXXXXX' },
  'analytics.providers.metaPixelId': { label: 'Mã Meta Pixel' },
  'analytics.providers.enabled': { label: 'Bật tích hợp thống kê', kind: 'boolean', help: 'Chỉ bật khi đã nhập mã theo dõi thật.' },
  'home.sections.order': { label: 'Thứ tự các khối trang chủ', kind: 'ordered', options: SECTIONS, help: 'Dùng nút lên/xuống để sắp xếp thứ tự hiển thị.' },
  'home.sections.hidden': { label: 'Ẩn các khối trang chủ', kind: 'multi', options: SECTIONS },
  'site.header.mottoLine1': { label: 'Khẩu hiệu — dòng 1' },
  'site.header.mottoLine2': { label: 'Khẩu hiệu — dòng 2' },
  'site.header.ctaLabel': { label: 'Nhãn nút chính' },
  'site.header.ctaTarget': { label: 'Đích nút chính', kind: 'route', placeholder: 'Ví dụ: /phong-nghi' },
  'site.footer.quote': { label: 'Trích dẫn chân trang' },
  'site.footer.quoteAuthor': { label: 'Tác giả trích dẫn' },
  'site.footer.motto': { label: 'Khẩu hiệu chân trang' },
  'site.footer.copyrightText': { label: 'Nội dung bản quyền' },
  'home.hero.enabled': { label: 'Hiển thị Hero', kind: 'boolean' },
  'home.hero.kicker': { label: 'Kicker / lời dẫn' },
  'home.hero.titleLine1': { label: 'Tiêu đề — dòng 1', required: true },
  'home.hero.titleLine2': { label: 'Tiêu đề — dòng 2' },
  'home.hero.signature': { label: 'Chữ ký thương hiệu' },
  'home.hero.description': { label: 'Mô tả Hero', kind: 'rich', help: 'Nội dung dài dùng Rich Text Editor.' },
  'home.hero.note': { label: 'Ghi chú viết tay' },
  'home.hero.imageMediaId': { label: 'Ảnh Hero desktop', kind: 'media', recommendedWidth: 1920, recommendedHeight: 900, recommendedRatio: 2.13 },
  'home.hero.mobileImageMediaId': { label: 'Ảnh Hero mobile', kind: 'media', recommendedWidth: 900, recommendedHeight: 1200, recommendedRatio: 0.75 },
  'home.trust.enabled': { label: 'Hiển thị dải cam kết', kind: 'boolean' },
  'home.trust.items': { label: 'Các cam kết' },
  'home.trust.items[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'home.trust.items[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'leaf', label: 'Lá' }, { value: 'heart', label: 'Trái tim' }, { value: 'shield', label: 'Khiên' }, { value: 'users', label: 'Cộng đồng' }] },
  'home.trust.items[].line1': { label: 'Nhãn ngắn', help: 'Hiển thị trong ảnh Hero, cạnh biểu tượng.' },
  'home.trust.items[].line2': { label: 'Dòng phụ (không bắt buộc)' },
  'home.why.enabled': { label: 'Hiển thị khối', kind: 'boolean' },
  'home.why.title': { label: 'Tiêu đề' },
  'home.why.intro': { label: 'Đoạn giới thiệu', kind: 'rich' },
  'home.why.reasons': { label: 'Các lý do' },
  'home.why.reasons[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'home.why.reasons[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'user', label: 'Người' }, { value: 'house', label: 'Lưu trú' }, { value: 'message', label: 'Tư vấn' }, { value: 'tag', label: 'Ưu đãi' }, { value: 'map', label: 'Bản đồ' }, { value: 'leaf', label: 'Lá' }, { value: 'bolt', label: 'Tia chớp' }] },
  'home.why.reasons[].title': { label: 'Tiêu đề' },
  'home.why.reasons[].description': { label: 'Mô tả ngắn' },
  'home.featured.enabled': { label: 'Hiển thị', kind: 'boolean' },
  'home.featured.title': { label: 'Tiêu đề khối' },
  'home.featured.subtitle': { label: 'Mô tả ngắn' },
  'home.featured.ctaLabel': { label: 'Nhãn liên kết' },
  'home.featured.ctaTarget': { label: 'Đường dẫn nội bộ', kind: 'route', placeholder: '/phong-nghi' },
  'home.featured.limit': { label: 'Số nơi lưu trú tối đa', kind: 'number', min: 1, max: 12, step: 1, required: true },
  'home.featured.selectionMode': { label: 'Phạm vi phòng nghỉ trên trang chủ', kind: 'radio', options: [
    { value: 'featured', label: 'Chỉ phòng nổi bật', description: 'Cần bật “Nổi bật trên trang chủ” ở từng nơi lưu trú.' },
    { value: 'all', label: 'Tất cả phòng đã xuất bản', description: 'Hiển thị mọi nơi lưu trú đủ điều kiện public.' },
  ] },
  'home.combos.enabled': { label: 'Hiển thị combo nổi bật', kind: 'boolean' },
  'home.combos.title': { label: 'Tiêu đề khối combo' },
  'home.combos.subtitle': { label: 'Mô tả ngắn' },
  'home.combos.ctaLabel': { label: 'Nhãn liên kết' },
  'home.combos.ctaTarget': { label: 'Đường dẫn nội bộ', kind: 'route' },
  'home.combos.limit': { label: 'Số combo tối đa', kind: 'number', min: 1, max: 12, step: 1, required: true },
  'home.promo.enabled': { label: 'Hiển thị khối trải nghiệm', kind: 'boolean' },
  'home.promo.titleLine1': { label: 'Tiêu đề — dòng 1' },
  'home.promo.titleLine2': { label: 'Tiêu đề — dòng 2' },
  'home.promo.body': { label: 'Nội dung giới thiệu', kind: 'rich' },
  'home.promo.ctaLabel': { label: 'Nhãn nút' },
  'home.promo.ctaTarget': { label: 'Đường dẫn nút', kind: 'route' },
  'home.promo.quote': { label: 'Trích dẫn' },
  'home.promo.imageMediaId': { label: 'Ảnh giới thiệu trải nghiệm', kind: 'media', recommendedWidth: 900, recommendedHeight: 1200, recommendedRatio: 0.75 },
  'home.destinations.enabled': { label: 'Hiển thị', kind: 'boolean' },
  'home.destinations.title': { label: 'Tiêu đề khối' },
  'home.destinations.subtitle': { label: 'Mô tả ngắn' },
  'home.destinations.ctaLabel': { label: 'Nhãn liên kết' },
  'home.destinations.ctaTarget': { label: 'Đường dẫn nội bộ', kind: 'route', placeholder: '/diem-den' },
  'home.destinations.limit': { label: 'Số điểm đến tối đa', kind: 'number', min: 1, max: 12, step: 1, required: true },
  'home.destinations.selectionMode': { label: 'Nguồn lựa chọn', kind: 'select', options: [{ value: 'featured', label: 'Điểm đến nổi bật đã xuất bản' }] },
  'home.testimonials.enabled': { label: 'Hiển thị khi có đánh giá đã duyệt', kind: 'boolean' },
  'home.testimonials.title': { label: 'Tiêu đề đánh giá' },
  'home.testimonials.ctaLabel': { label: 'Nhãn liên kết' },
  'home.testimonials.limit': { label: 'Số đánh giá tối đa', kind: 'number', min: 1, max: 12, step: 1, required: true },
  'home.contactPanel.enabled': { label: 'Hiển thị khối tư vấn', kind: 'boolean' },
  'home.contactPanel.title': { label: 'Tiêu đề khối tư vấn' },
  'home.contactPanel.description': { label: 'Mô tả tư vấn', kind: 'rich' },
  'home.contactPanel.advisorName': { label: 'Tên tư vấn viên' },
  'home.contactPanel.advisorRole': { label: 'Vai trò / lời giới thiệu' },
  'home.contactPanel.zaloCtaLabel': { label: 'Nhãn nút Zalo' },
  'home.contactPanel.phoneCtaLabel': { label: 'Nhãn nút điện thoại' },
  'home.contactPanel.note': { label: 'Lời chào viết tay', help: 'Hiển thị bằng chữ viết tay phía trên ảnh người tư vấn.' },
  'home.contactPanel.imageMediaId': { label: 'Ảnh chân dung người tư vấn', kind: 'media', help: 'Để trống thì website hiện biểu tượng chữ cái, không dùng ảnh minh hoạ người khác.', recommendedWidth: 800, recommendedHeight: 800, recommendedRatio: 1 },
  'home.stats.enabled': { label: 'Hiển thị khối số liệu', kind: 'boolean', help: 'Chỉ nhập số liệu thật đã kiểm chứng. Khối tự ẩn khi chưa có số liệu.' },
  'home.stats.title': { label: 'Tiêu đề', placeholder: 'Những con số biết nói' },
  'home.stats.note': { label: 'Ghi chú viết tay' },
  'home.stats.items': { label: 'Các số liệu' },
  'home.stats.items[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'home.stats.items[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'calendar', label: 'Lịch' }, { value: 'smile', label: 'Mặt cười' }, { value: 'star', label: 'Ngôi sao' }, { value: 'users', label: 'Khách' }, { value: 'house', label: 'Nhà' }, { value: 'map', label: 'Bản đồ' }, { value: 'globe', label: 'Quả địa cầu' }] },
  'home.stats.items[].value': { label: 'Con số', placeholder: 'Ví dụ: 120+' },
  'home.stats.items[].label': { label: 'Mô tả', placeholder: 'Ví dụ: Lượt đặt phòng' },
  'home.partner.enabled': { label: 'Hiển thị khối mời hợp tác', kind: 'boolean' },
  'home.partner.title': { label: 'Tiêu đề' },
  'home.partner.description': { label: 'Nội dung', kind: 'rich' },
  'home.partner.quote': { label: 'Câu viết tay trên ảnh' },
  'home.partner.primaryLabel': { label: 'Nhãn nút chính' },
  'home.partner.primaryTarget': { label: 'Đường dẫn nút chính', kind: 'route', placeholder: '/doi-tac?mode=register' },
  'home.partner.secondaryLabel': { label: 'Nhãn nút phụ' },
  'home.partner.secondaryTarget': { label: 'Đường dẫn nút phụ', kind: 'route', placeholder: '/doi-tac' },
  'home.partner.imageMediaId': { label: 'Ảnh minh hoạ', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'home.faq.enabled': { label: 'Hiển thị FAQ', kind: 'boolean' },
  'home.faq.title': { label: 'Tiêu đề FAQ' },
  'home.faq.items': { label: 'Câu hỏi và trả lời' },
  'home.faq.items[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'home.faq.items[].question': { label: 'Câu hỏi' },
  'home.faq.items[].answer': { label: 'Câu trả lời', kind: 'rich' },
  'contact.page.heroEyebrow': { label: 'Lời dẫn đầu trang' },
  'contact.page.title': { label: 'Tiêu đề trang' },
  'contact.page.intro': { label: 'Giới thiệu', kind: 'rich' },
  'contact.page.heroImageMediaId': { label: 'Ảnh đầu trang liên hệ', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'contact.page.promises': { label: 'Các cam kết' },
  'contact.page.promises[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'contact.page.promises[].title': { label: 'Tiêu đề' },
  'contact.page.promises[].description': { label: 'Mô tả ngắn' },
  'contact.page.formTitle': { label: 'Tiêu đề biểu mẫu' },
  'contact.page.formIntro': { label: 'Lời giới thiệu biểu mẫu', kind: 'rich' },
  'contact.page.formMessageLabel': { label: 'Nhãn ô nhu cầu / lời nhắn' },
  'contact.page.formMessagePlaceholder': { label: 'Gợi ý trong ô nhu cầu / lời nhắn' },
  'contact.page.formPrivacyNote': { label: 'Ghi chú quyền riêng tư', kind: 'rich' },
  'contact.page.formSubmitLabel': { label: 'Nhãn nút gửi' },
  'contact.page.formSuccessMessage': { label: 'Thông báo sau khi gửi', kind: 'rich' },
  'contact.page.quickTitle': { label: 'Tiêu đề liên hệ nhanh' },
  'contact.page.quickIntro': { label: 'Mô tả liên hệ nhanh', kind: 'rich' },
  'contact.page.hoursTitle': { label: 'Tiêu đề giờ làm việc' },
  'contact.page.advisorName': { label: 'Tên tư vấn viên' },
  'contact.page.advisorRole': { label: 'Vai trò' },
  'contact.page.advisorDescription': { label: 'Giới thiệu tư vấn viên', kind: 'rich' },
  'contact.page.advisorImageMediaId': { label: 'Ảnh tư vấn viên', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'contact.page.advisorHighlights': { label: 'Điểm nổi bật' },
  'contact.page.advisorHighlights[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'contact.page.advisorHighlights[].text': { label: 'Nội dung ngắn' },
  'contact.page.advisorNote': { label: 'Ghi chú tư vấn', kind: 'rich' },
  'contact.page.mapTitle': { label: 'Tiêu đề khu vực bản đồ' },
  'contact.page.mapDescription': { label: 'Mô tả địa điểm', kind: 'rich' },
  'contact.page.mapImageMediaId': { label: 'Ảnh minh họa bản đồ', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5, help: 'Chỉ dùng ảnh doanh nghiệp có quyền sử dụng; bản đồ thật dùng Liên kết bản đồ ở mục Liên hệ.' },
  'contact.page.scenicImageMediaId': { label: 'Ảnh phong cảnh', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'contact.page.scriptNote': { label: 'Ghi chú cuối trang', kind: 'rich' },
  'contact.page.showFaq': { label: 'Hiển thị FAQ', kind: 'boolean' },
  'contact.page.faqTitle': { label: 'Tiêu đề FAQ' },
  'contact.page.faqs': { label: 'Câu hỏi và trả lời' },
  'contact.page.faqs[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'contact.page.faqs[].question': { label: 'Câu hỏi' },
  'contact.page.faqs[].answer': { label: 'Câu trả lời', kind: 'rich' },
  'about.page.enabled': { label: 'Hiển thị trang Về mình (/ve-minh)', kind: 'boolean', help: 'Tên, vai trò, ảnh người tư vấn mặc định lấy từ Khối tư vấn trang chủ; điện thoại và Zalo lấy từ mục Liên hệ.' },
  'about.page.heroEyebrow': { label: 'Lời dẫn đầu trang', placeholder: 'Về mình' },
  'about.page.title': { label: 'Tiêu đề trang (H1)', required: true, maxLength: 120, placeholder: 'Đặt phòng Cúc Phương cùng Đinh Vân' },
  'about.page.intro': { label: 'Giới thiệu ngắn dưới tiêu đề', kind: 'rich', help: 'Đoạn mở đầu khoảng 60–90 từ, nhắc tự nhiên từ khoá chính.' },
  'about.page.heroImageMediaId': { label: 'Ảnh đầu trang (phong cảnh)', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'about.page.phoneCtaLabel': { label: 'Nhãn nút gọi điện', placeholder: 'Gọi cho Đinh Vân' },
  'about.page.zaloCtaLabel': { label: 'Nhãn nút Zalo', help: 'Chỉ hiện khi đã nhập link Zalo ở mục Liên hệ.' },
  'about.page.contactCtaLabel': { label: 'Nhãn nút gửi yêu cầu (tới /lien-he)' },
  'about.page.storyTitle': { label: 'Tiêu đề câu chuyện' },
  'about.page.greeting': { label: 'Lời chào viết tay', help: 'Hiển thị bằng chữ viết tay phía trên ảnh chân dung.' },
  'about.page.story': { label: 'Câu chuyện của bạn', kind: 'rich', help: 'Hãy kể bằng lời của chính bạn: bạn gắn bó với Cúc Phương thế nào, vì sao bắt đầu làm tư vấn… Chỉ viết điều có thật.' },
  'about.page.portraitMediaId': { label: 'Ảnh chân dung thật của bạn', kind: 'media', help: 'Để trống thì dùng ảnh ở Khối tư vấn trang chủ; nếu cũng trống, website hiện biểu tượng chữ cái. Không dùng ảnh người khác.', recommendedWidth: 800, recommendedHeight: 1000, recommendedRatio: 0.8 },
  'about.page.signatureNote': { label: 'Dòng chữ ký', placeholder: 'Hẹn gặp bạn ở Cúc Phương!' },
  'about.page.quote': { label: 'Câu trích nổi bật', kind: 'textarea', maxLength: 300 },
  'about.page.valuesTitle': { label: 'Tiêu đề khối giá trị' },
  'about.page.valuesIntro': { label: 'Mô tả khối giá trị', kind: 'textarea', maxLength: 300 },
  'about.page.values': { label: 'Giá trị / cam kết', help: 'Nên có 3–4 mục.' },
  'about.page.values[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'about.page.values[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'check', label: 'Dấu kiểm' }, { value: 'message', label: 'Tư vấn' }, { value: 'shield', label: 'Khiên' }, { value: 'phone', label: 'Điện thoại' }, { value: 'heart', label: 'Trái tim' }, { value: 'leaf', label: 'Lá' }, { value: 'map', label: 'Bản đồ' }, { value: 'house', label: 'Nhà' }] },
  'about.page.values[].title': { label: 'Tiêu đề' },
  'about.page.values[].text': { label: 'Mô tả ngắn', kind: 'textarea', maxLength: 400, help: 'Khoảng 25–40 từ.' },
  'about.page.stepsTitle': { label: 'Tiêu đề “Cách mình đồng hành”' },
  'about.page.stepsIntro': { label: 'Mô tả các bước', kind: 'textarea', maxLength: 300 },
  'about.page.steps': { label: 'Các bước', help: 'Nên có 3–4 bước, hiển thị theo thứ tự.' },
  'about.page.steps[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'about.page.steps[].title': { label: 'Tên bước' },
  'about.page.steps[].text': { label: 'Mô tả ngắn', kind: 'textarea', maxLength: 400 },
  'about.page.areasTitle': { label: 'Tiêu đề khối địa phương', placeholder: 'Hiểu Cúc Phương như người nhà' },
  'about.page.areasIntro': { label: 'Mô tả khối địa phương', kind: 'textarea', maxLength: 400 },
  'about.page.areas': { label: 'Thẻ địa phương' },
  'about.page.areas[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'about.page.areas[].icon': { label: 'Biểu tượng (khi chưa có ảnh)', kind: 'select', options: [{ value: 'trees', label: 'Rừng' }, { value: 'mountain', label: 'Núi' }, { value: 'house', label: 'Chỗ nghỉ' }, { value: 'waves', label: 'Sông hồ' }, { value: 'map', label: 'Bản đồ' }] },
  'about.page.areas[].title': { label: 'Tiêu đề thẻ' },
  'about.page.areas[].text': { label: 'Mô tả ngắn', kind: 'textarea', maxLength: 500, help: 'Chỉ ghi thông tin công khai đã kiểm chứng; số liệu nên để ở mức “khoảng”.' },
  'about.page.areas[].linkLabel': { label: 'Nhãn liên kết' },
  'about.page.areas[].linkTarget': { label: 'Đường dẫn nội bộ', kind: 'route', placeholder: '/diem-den' },
  'about.page.areas[].imageMediaId': { label: 'Ảnh phong cảnh (không bắt buộc)', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'about.page.showFaq': { label: 'Hiển thị FAQ', kind: 'boolean' },
  'about.page.faqTitle': { label: 'Tiêu đề FAQ' },
  'about.page.faqs': { label: 'Câu hỏi và trả lời' },
  'about.page.faqs[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'about.page.faqs[].question': { label: 'Câu hỏi', maxLength: 200 },
  'about.page.faqs[].answer': { label: 'Câu trả lời', kind: 'rich' },
  'about.page.ctaTitle': { label: 'Tiêu đề dải kêu gọi cuối trang' },
  'about.page.ctaText': { label: 'Nội dung dải kêu gọi', kind: 'rich' },
  'about.page.ctaStaysLabel': { label: 'Nhãn nút xem chỗ nghỉ (tới /phong-nghi)' },
  'about.page.areaServed': { label: 'Khu vực phục vụ (cho Google)', placeholder: 'Cúc Phương, Ninh Bình', help: 'Các địa danh cách nhau bằng dấu phẩy; dùng trong dữ liệu có cấu trúc.' },
  'about.page.seoTitle': { label: 'Tiêu đề SEO', maxLength: 70, placeholder: 'Đặt phòng Cúc Phương cùng Đinh Vân', help: 'Tên thương hiệu được thêm tự động phía sau; cả tiêu đề nên ≤ 60 ký tự.' },
  'about.page.seoDescription': { label: 'Mô tả SEO', kind: 'textarea', maxLength: 170, help: 'Khoảng 150–160 ký tự.' },
  'about.page.ogDescription': { label: 'Mô tả khi chia sẻ (Facebook, Zalo…)', kind: 'textarea', maxLength: 200, help: 'Một câu ngắn. Để trống thì dùng mô tả SEO.' },
  'about.page.ogImageMediaId': { label: 'Ảnh khi chia sẻ', kind: 'media', recommendedWidth: 1200, recommendedHeight: 630, recommendedRatio: 1.91, help: 'Để trống thì dùng ảnh đầu trang.' },
  'catalog.staysPage.heroTitle': { label: 'Tiêu đề Hero phòng nghỉ' },
  'catalog.staysPage.heroKicker': { label: 'Lời dẫn Hero' },
  'catalog.staysPage.heroDescription': { label: 'Mô tả Hero', kind: 'rich' },
  'catalog.staysPage.heroImageMediaId': { label: 'Ảnh Hero phòng nghỉ', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'catalog.staysPage.heroNote': { label: 'Ghi chú Hero' },
  'catalog.staysPage.reviewsTitle': { label: 'Tiêu đề khu đánh giá' },
  'catalog.staysPage.reviewsSubtitle': { label: 'Mô tả đánh giá', kind: 'rich' },
  'catalog.staysPage.advisorTitle': { label: 'Tiêu đề tư vấn' },
  'catalog.staysPage.advisorDescription': { label: 'Nội dung tư vấn', kind: 'rich' },
  'catalog.staysPage.advisorCtaLabel': { label: 'Nhãn nút tư vấn' },
  'catalog.staysPage.advisorImageMediaId': { label: 'Ảnh tư vấn phòng nghỉ', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'catalog.staysPage.advisorBenefits': { label: 'Điểm nổi bật tư vấn' },
  'catalog.staysPage.advisorBenefits[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.staysPage.advisorBenefits[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'headset', label: 'Tư vấn' }, { value: 'route', label: 'Hành trình' }, { value: 'heart', label: 'Trái tim' }] },
  'catalog.staysPage.advisorBenefits[].text': { label: 'Nội dung ngắn' },
  'catalog.staysPage.faqTitle': { label: 'Tiêu đề FAQ' },
  'catalog.staysPage.faqs': { label: 'Câu hỏi và trả lời' },
  'catalog.staysPage.faqs[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.staysPage.faqs[].question': { label: 'Câu hỏi' },
  'catalog.staysPage.faqs[].answer': { label: 'Câu trả lời', kind: 'rich' },
  'catalog.staysPage.mapTitle': { label: 'Tiêu đề bản đồ' },
  'catalog.staysPage.mapImageMediaId': { label: 'Ảnh bản đồ phòng nghỉ', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'catalog.staysPage.emptyResultTitle': { label: 'Tiêu đề khi bộ lọc không có kết quả' },
  'catalog.staysPage.emptyResultDescription': { label: 'Mô tả khi bộ lọc không có kết quả', kind: 'rich' },
  'catalog.staysPage.emptyResultCtaLabel': { label: 'Nhãn nút tư vấn khi không có kết quả' },
  'catalog.staysPage.emptyHelpTitle': { label: 'Tiêu đề khối hỗ trợ cuối danh sách' },
  'catalog.staysPage.emptyHelpDescription': { label: 'Nội dung khối hỗ trợ cuối danh sách', kind: 'rich' },
  'catalog.staysPage.emptyHelpCtaLabel': { label: 'Nhãn nút khối hỗ trợ' },
  'catalog.stayDetail.introTitle': { label: 'Tiêu đề giới thiệu nơi lưu trú' },
  'catalog.stayDetail.introQuote': { label: 'Trích dẫn giới thiệu', kind: 'rich' },
  'catalog.stayDetail.introQuoteAuthor': { label: 'Tác giả trích dẫn' },
  'catalog.stayDetail.roomsTitle': { label: 'Tiêu đề hạng phòng' },
  'catalog.stayDetail.amenitiesTitle': { label: 'Tiêu đề tiện nghi' },
  'catalog.stayDetail.reviewsTitle': { label: 'Tiêu đề đánh giá' },
  'catalog.stayDetail.factsTitle': { label: 'Tiêu đề giờ nhận phòng và thông tin' },
  'catalog.stayDetail.checkInLabel': { label: 'Nhãn giờ nhận phòng' },
  'catalog.stayDetail.checkOutLabel': { label: 'Nhãn giờ trả phòng' },
  'catalog.stayDetail.breakfastLabel': { label: 'Nhãn thông tin bữa sáng' },
  'catalog.stayDetail.houseRulesTitle': { label: 'Tiêu đề nội quy' },
  'catalog.stayDetail.notesTitle': { label: 'Tiêu đề lưu ý' },
  'catalog.stayDetail.notesThanks': { label: 'Lời kết phần lưu ý' },
  'catalog.stayDetail.bookingNote': { label: 'Ghi chú quy trình đặt phòng', kind: 'rich', help: 'Chỉ ghi thông tin chính sách đã được xác nhận. Để trống nếu không muốn hiển thị ghi chú.' },
  'catalog.destinationDetail.eyebrow': { label: 'Dòng giới thiệu đầu trang' },
  'catalog.destinationDetail.activitiesTitle': { label: 'Tiêu đề danh sách hoạt động' },
  'catalog.destinationDetail.notesTitle': { label: 'Tiêu đề lưu ý trước chuyến đi' },
  'catalog.destinationsPage.heroKicker': { label: 'Lời dẫn Hero' },
  'catalog.destinationsPage.heroTitle': { label: 'Tiêu đề Hero' },
  'catalog.destinationsPage.heroDescription': { label: 'Mô tả Hero', kind: 'rich' },
  'catalog.destinationsPage.heroQuote': { label: 'Trích dẫn Hero', kind: 'rich' },
  'catalog.destinationsPage.heroImageMediaId': { label: 'Ảnh Hero điểm đến', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'catalog.destinationsPage.listTitle': { label: 'Tiêu đề danh sách điểm đến' },
  'catalog.destinationsPage.listSubtitle': { label: 'Mô tả danh sách điểm đến', kind: 'rich' },
  'catalog.destinationsPage.advisorCtaLabel': { label: 'Nhãn nút nhờ tư vấn điểm đến' },
  'catalog.destinationsPage.emptyTitle': { label: 'Tiêu đề khi chưa có điểm đến' },
  'catalog.destinationsPage.emptyDescription': { label: 'Mô tả khi chưa có điểm đến', kind: 'rich' },
  'catalog.destinationsPage.noteTitle': { label: 'Tiêu đề lời nhắn' },
  'catalog.destinationsPage.noteBody': { label: 'Lời nhắn', kind: 'rich' },
  'catalog.destinationsPage.noteAuthor': { label: 'Người gửi lời nhắn' },
  'catalog.destinationsPage.noteImageMediaId': { label: 'Ảnh người gửi lời nhắn', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'catalog.destinationsPage.mapImageMediaId': { label: 'Ảnh bản đồ điểm đến', kind: 'media', recommendedWidth: 1200, recommendedHeight: 800, recommendedRatio: 1.5 },
  'catalog.destinationsPage.itineraryImageMediaId': { label: 'Ảnh lịch trình', kind: 'media', recommendedWidth: 900, recommendedHeight: 1200, recommendedRatio: 0.75 },
  'catalog.destinationsPage.itineraryTitle': { label: 'Tiêu đề lịch trình' },
  'catalog.destinationsPage.itinerarySubtitle': { label: 'Mô tả lịch trình', kind: 'rich' },
  'catalog.destinationsPage.itineraries': { label: 'Các lựa chọn lịch trình' },
  'catalog.destinationsPage.itineraries[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.destinationsPage.itineraries[].label': { label: 'Tên tab' },
  'catalog.destinationsPage.itineraries[].subtitle': { label: 'Mô tả ngắn' },
  'catalog.destinationsPage.itineraries[].title': { label: 'Tiêu đề lịch trình' },
  'catalog.destinationsPage.itineraries[].days': { label: 'Các ngày trong lịch trình' },
  'catalog.destinationsPage.itineraries[].days[].title': { label: 'Tiêu đề ngày' },
  'catalog.destinationsPage.itineraries[].days[].activities': { label: 'Hoạt động trong ngày' },
  'catalog.destinationsPage.itineraries[].days[].activities[]': { label: 'Hoạt động' },
  'catalog.destinationsPage.seasonsTitle': { label: 'Tiêu đề thông tin theo mùa' },
  'catalog.destinationsPage.seasonsSubtitle': { label: 'Mô tả thông tin theo mùa', kind: 'rich' },
  'catalog.destinationsPage.seasons': { label: 'Thông tin theo mùa' },
  'catalog.destinationsPage.seasons[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.destinationsPage.seasons[].title': { label: 'Tên mùa' },
  'catalog.destinationsPage.seasons[].description': { label: 'Mô tả mùa', kind: 'rich' },
  'catalog.combosPage.heroTitle': { label: 'Tiêu đề Hero combo' },
  'catalog.combosPage.heroKicker': { label: 'Lời dẫn Hero' },
  'catalog.combosPage.heroDescription': { label: 'Mô tả Hero', kind: 'rich' },
  'catalog.combosPage.heroImageMediaId': { label: 'Ảnh Hero combo', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'catalog.combosPage.listTitle': { label: 'Tiêu đề danh sách combo' },
  'catalog.combosPage.listSubtitle': { label: 'Mô tả danh sách combo', kind: 'rich' },
  'catalog.combosPage.advisorCtaLabel': { label: 'Nhãn nút nhờ tư vấn combo' },
  'catalog.combosPage.emptyTitle': { label: 'Tiêu đề khi chưa có combo' },
  'catalog.combosPage.emptyDescription': { label: 'Mô tả khi chưa có combo', kind: 'rich' },
  'catalog.combosPage.emptyCtaLabel': { label: 'Nhãn nút khi chưa có combo' },
  'catalog.combosPage.quoteLeft': { label: 'Trích dẫn bên trái', kind: 'rich' },
  'catalog.combosPage.quoteRight': { label: 'Trích dẫn bên phải', kind: 'rich' },
  'catalog.combosPage.benefitsTitle': { label: 'Tiêu đề lợi ích' },
  'catalog.combosPage.benefits': { label: 'Các lợi ích' },
  'catalog.combosPage.benefits[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.combosPage.benefits[].icon': { label: 'Biểu tượng', kind: 'select', options: [{ value: 'user', label: 'Người' }, { value: 'gem', label: 'Đá quý' }, { value: 'heart', label: 'Trái tim' }, { value: 'leaf', label: 'Lá' }] },
  'catalog.combosPage.benefits[].title': { label: 'Tiêu đề' },
  'catalog.combosPage.benefits[].description': { label: 'Mô tả ngắn' },
  'catalog.combosPage.stepsTitle': { label: 'Tiêu đề quy trình' },
  'catalog.combosPage.stepsSubtitle': { label: 'Mô tả quy trình', kind: 'rich' },
  'catalog.combosPage.steps': { label: 'Các bước' },
  'catalog.combosPage.steps[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.combosPage.steps[].title': { label: 'Tên bước' },
  'catalog.combosPage.steps[].description': { label: 'Mô tả bước' },
  'catalog.combosPage.reviewsTitle': { label: 'Tiêu đề đánh giá combo' },
  'catalog.combosPage.faqTitle': { label: 'Tiêu đề FAQ' },
  'catalog.combosPage.faqs': { label: 'Câu hỏi và trả lời' },
  'catalog.combosPage.faqs[].enabled': { label: 'Đang hiển thị', kind: 'boolean' },
  'catalog.combosPage.faqs[].question': { label: 'Câu hỏi' },
  'catalog.combosPage.faqs[].answer': { label: 'Câu trả lời', kind: 'rich' },
  'catalog.bookingPage.heroTitle': { label: 'Tiêu đề Hero đặt phòng' },
  'catalog.bookingPage.heroDescription': { label: 'Mô tả Hero', kind: 'rich' },
  'catalog.bookingPage.heroKicker': { label: 'Lời dẫn Hero' },
  'catalog.bookingPage.heroImageMediaId': { label: 'Ảnh Hero đặt phòng', kind: 'media', recommendedWidth: 1600, recommendedHeight: 900, recommendedRatio: 1.78 },
  'catalog.bookingPage.securityNote': { label: 'Thông điệp an toàn' },
  'catalog.bookingPage.helpTitle': { label: 'Tiêu đề hỗ trợ đặt phòng' },
  'catalog.bookingPage.helpDescription': { label: 'Mô tả hỗ trợ đặt phòng', kind: 'rich' },
  'catalog.bookingPage.confirmationNote': { label: 'Thông báo sau khi gửi yêu cầu đặt phòng', kind: 'rich' },
  'catalog.staticPages.eyebrow': { label: 'Lời dẫn danh sách chuyên trang' },
  'catalog.staticPages.title': { label: 'Tiêu đề danh sách chuyên trang' },
  'catalog.staticPages.description': { label: 'Mô tả danh sách chuyên trang', kind: 'rich' },
  'catalog.articlesPage.eyebrow': { label: 'Lời dẫn danh sách bài viết' },
  'catalog.articlesPage.title': { label: 'Tiêu đề danh sách bài viết' },
  'catalog.articlesPage.description': { label: 'Mô tả danh sách bài viết', kind: 'rich' },
  'seo.pages.home.title': { label: 'Meta title — trang chủ' },
  'seo.pages.home.description': { label: 'Meta description — trang chủ', maxLength: 320 },
  'seo.pages.stays.title': { label: 'Meta title — phòng nghỉ' },
  'seo.pages.stays.description': { label: 'Meta description — phòng nghỉ', maxLength: 320 },
  'seo.pages.destinations.title': { label: 'Meta title — điểm đến' },
  'seo.pages.destinations.description': { label: 'Meta description — điểm đến', maxLength: 320 },
  'seo.pages.combos.title': { label: 'Meta title — combo' },
  'seo.pages.combos.description': { label: 'Meta description — combo', maxLength: 320 },
  'seo.pages.contact.title': { label: 'Meta title — liên hệ' },
  'seo.pages.contact.description': { label: 'Meta description — liên hệ', maxLength: 320 },
  'seo.pages.booking.title': { label: 'Meta title — đặt phòng' },
  'seo.pages.booking.description': { label: 'Meta description — đặt phòng', maxLength: 320 },
  'seo.pages.articles.title': { label: 'Meta title — danh sách bài viết' },
  'seo.pages.articles.description': { label: 'Meta description — danh sách bài viết', maxLength: 320 },
  'seo.pages.staticPages.title': { label: 'Meta title — danh sách chuyên trang' },
  'seo.pages.staticPages.description': { label: 'Meta description — danh sách chuyên trang', maxLength: 320 },

  'content.editor.allowedBlocks': { label: 'Các khối được phép dùng', kind: 'multi', options: BLOCKS },
  'content.editor.maxImageWidth': { label: 'Chiều rộng ảnh tối đa trong nội dung', kind: 'number', min: 320, max: 10000, step: 1, required: true, suffix: 'px' },
  'content.editor.autosaveSeconds': { label: 'Chu kỳ tự lưu', kind: 'number', min: 1, max: 600, step: 1, required: true, suffix: 'giây' },

  'media.processing.convertToWebp': { label: 'Tự chuyển ảnh sang WebP', kind: 'boolean' },
  'media.processing.deleteOriginal': { label: 'Xoá tệp gốc sau khi chuyển đổi', kind: 'boolean', help: 'Chỉ bật nếu chính sách lưu trữ của bạn yêu cầu không giữ ảnh gốc.' },
  'media.processing.quality': { label: 'Chất lượng ảnh WebP', kind: 'number', min: 1, max: 100, step: 1, required: true, suffix: '/ 100' },
  'media.processing.maxWidth': { label: 'Chiều rộng ảnh tải lên tối đa', kind: 'number', min: 320, max: 10000, step: 1, required: true, suffix: 'px' },
  'media.processing.maxBytes': { label: 'Dung lượng ảnh tải lên tối đa', kind: 'bytes', min: 0.1, max: 200, step: 0.1, required: true, suffix: 'MB' },
  'media.processing.allowedMimeTypes': { label: 'Định dạng ảnh được nhận', kind: 'multi', options: MIME_TYPES },
  'media.processing.renditions': { label: 'Các kích thước ảnh tự tạo' },
  'media.processing.renditions[].name': { label: 'Tên kích thước', placeholder: 'thumb, card, wide…' },
  'media.processing.renditions[].width': { label: 'Chiều rộng', kind: 'number', min: 1, max: 10000, step: 1, required: true, suffix: 'px' },
  'media.processing.stripMetadata': { label: 'Gỡ thông tin vị trí và metadata ảnh', kind: 'boolean' },

  'crm.pipeline.stages': { label: 'Các giai đoạn tư vấn' },
  'crm.pipeline.stages[].code': { label: 'Mã giai đoạn', placeholder: 'Ví dụ: contacted', required: true },
  'crm.pipeline.stages[].label': { label: 'Tên hiển thị', placeholder: 'Ví dụ: Đã liên hệ', required: true },
  'crm.pipeline.sources': { label: 'Nguồn khách hàng', kind: 'multi', options: CRM_SOURCES },
  'crm.pipeline.followUpDefaultHours': { label: 'Thời gian nhắc chăm sóc mặc định', kind: 'number', min: 1, step: 1, required: true, suffix: 'giờ' },
  'crm.pipeline.slaFirstResponseHours': { label: 'Thời hạn phản hồi lần đầu', kind: 'number', min: 1, step: 1, required: true, suffix: 'giờ' },

  'notifications.channels.email.enabled': { label: 'Gửi email thông báo', kind: 'boolean' },
  'notifications.channels.email.fromName': { label: 'Tên người gửi' },
  'notifications.channels.email.fromAddress': { label: 'Email người gửi', kind: 'email' },
  'notifications.channels.email.replyTo': { label: 'Email nhận phản hồi', kind: 'email' },
  'notifications.channels.zalo.enabled': { label: 'Bật thông báo Zalo', kind: 'boolean' },
  'notifications.channels.internalRecipients': { label: 'Email nhận thông báo nội bộ' },
  'notifications.channels.internalRecipients[]': { label: 'Email nhận thông báo', kind: 'email' },

  'ops.maintenance.enabled': { label: 'Bật chế độ bảo trì', kind: 'boolean', help: 'Khi bật, khách truy cập sẽ thấy thông báo bảo trì thay vì nội dung website.' },
  'ops.maintenance.message': { label: 'Thông báo bảo trì', kind: 'textarea' },
  'ops.maintenance.allowAdmin': { label: 'Cho quản trị viên truy cập khi bảo trì', kind: 'boolean' },
  'ops.dataMode.usesDemoData': { label: 'Nội dung cần xác minh trước khi lập chỉ mục', kind: 'boolean', help: 'Khi bật, website tiếp tục được gắn noindex cho đến khi dữ liệu đã được xác minh.' },
  'ops.dataMode.demoBanner': { label: 'Thông báo xác minh nội dung', kind: 'textarea' },
};

const OBJECT_TEMPLATES: Record<string, Record<string, unknown>> = {
  'booking.cancellation.tiers': CANCELLATION_TIER,
  'home.trust.items': { enabled: true, icon: 'leaf', line1: '', line2: '' },
  'home.why.reasons': { enabled: true, icon: 'user', title: '', description: '' },
  'home.stats.items': { enabled: true, icon: 'star', value: '', label: '' },
  'home.faq.items': { enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } },
  'contact.page.promises': { enabled: true, title: '', description: '' },
  'contact.page.advisorHighlights': { enabled: true, text: '' },
  'contact.page.faqs': { enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } },
  'catalog.staysPage.advisorBenefits': { enabled: true, icon: 'headset', text: '' },
  'catalog.staysPage.faqs': { enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } },
  'catalog.destinationsPage.itineraries': { enabled: true, label: '', subtitle: '', title: '', days: [] },
  'catalog.destinationsPage.itineraries[].days': { title: '', activities: [] },
  'catalog.destinationsPage.seasons': { enabled: true, title: '', description: { type: 'doc', content: [{ type: 'paragraph' }] } },
  'catalog.combosPage.benefits': { enabled: true, icon: 'leaf', title: '', description: '' },
  'catalog.combosPage.steps': { enabled: true, title: '', description: '' },
  'catalog.combosPage.faqs': { enabled: true, question: '', answer: { type: 'doc', content: [{ type: 'paragraph' }] } },
};

const GROUP_LABELS: Record<string, string> = {
  brand: 'Thương hiệu',
  booking: 'Đặt phòng',
  locale: 'Ngôn ngữ & định dạng',
  seo: 'SEO & thống kê',
  content: 'Nội dung',
  publicHeader: 'Header & chân trang',
  publicHome: 'Nội dung trang chủ',
  publicPages: 'Các trang nội dung',
  publicLegal: 'FAQ & chính sách',
  media: 'Thư viện ảnh',
  crm: 'Khách hàng & tư vấn',
  ops: 'Vận hành',
};

const COMMON_LABELS: Record<string, string> = {
  name: 'Tên', shortName: 'Tên viết gọn', tagline: 'Khẩu hiệu', description: 'Mô tả',
  logoMediaId: 'Logo', faviconMediaId: 'Favicon', phone: 'Điện thoại', hotline: 'Hotline',
  zaloUrl: 'Liên kết Zalo', email: 'Email', address: 'Địa chỉ', mapUrl: 'Liên kết bản đồ',
  facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok',
  weekdays: 'Ngày thường', weekend: 'Cuối tuần', note: 'Ghi chú', enabled: 'Đang bật',
  methods: 'Phương thức thanh toán', bankAccount: 'Tài khoản ngân hàng', bankName: 'Ngân hàng',
  accountNumber: 'Số tài khoản', accountHolder: 'Chủ tài khoản', branch: 'Chi nhánh', qrMediaId: 'Mã QR',
  locale: 'Ngôn ngữ', timezone: 'Múi giờ', currency: 'Tiền tệ', currencySuffix: 'Ký hiệu tiền tệ',
  dateFormat: 'Định dạng ngày', titleTemplate: 'Mẫu tiêu đề', defaultTitle: 'Tiêu đề mặc định',
  defaultDescription: 'Mô tả mặc định', canonicalBase: 'Tên miền chính thức', ogMediaId: 'Ảnh chia sẻ',
  verification: 'Xác minh công cụ tìm kiếm', google: 'Mã xác minh Google', bing: 'Mã xác minh Bing',
  order: 'Thứ tự hiển thị', hidden: 'Các mục đang ẩn', allowedBlocks: 'Khối nội dung được phép',
  maxImageWidth: 'Chiều rộng ảnh tối đa', autosaveSeconds: 'Chu kỳ tự lưu', convertToWebp: 'Chuyển ảnh sang WebP',
  deleteOriginal: 'Xoá tệp gốc', quality: 'Chất lượng ảnh', maxWidth: 'Chiều rộng tối đa', maxBytes: 'Dung lượng tối đa',
  allowedMimeTypes: 'Định dạng ảnh được nhận', renditions: 'Kích thước ảnh tự tạo', stripMetadata: 'Gỡ metadata ảnh',
  stages: 'Các giai đoạn', sources: 'Nguồn khách hàng', code: 'Mã', label: 'Tên hiển thị',
  followUpDefaultHours: 'Nhắc chăm sóc sau', slaFirstResponseHours: 'Thời hạn phản hồi',
  fromName: 'Tên người gửi', fromAddress: 'Email người gửi', replyTo: 'Email nhận phản hồi', internalRecipients: 'Người nhận nội bộ',
  maintenance: 'Chế độ bảo trì', allowAdmin: 'Cho quản trị viên truy cập', dataMode: 'Kiểm duyệt nội dung',
  usesDemoData: 'Nội dung cần xác minh', demoBanner: 'Thông báo xác minh', beforeHours: 'Huỷ trước ít nhất',
  refundPercent: 'Tỷ lệ hoàn tiền', freeCancelHours: 'Huỷ miễn phí trước', tiers: 'Các mốc hoàn tiền',
  minNights: 'Số đêm tối thiểu', maxNights: 'Số đêm tối đa', maxAdults: 'Số người lớn tối đa',
  maxChildren: 'Số trẻ em tối đa', maxRoomsPerBooking: 'Số phòng tối đa mỗi đơn', advanceBookingDays: 'Đặt trước tối đa',
  sameDayCutoffHour: 'Giờ chốt nhận đặt trong ngày', defaultCheckInTime: 'Giờ nhận phòng mặc định',
  defaultCheckOutTime: 'Giờ trả phòng mặc định', depositPercent: 'Tỷ lệ đặt cọc', holdMinutes: 'Thời gian giữ phòng',
  quoteMinutes: 'Thời hạn báo giá', requirePhone: 'Bắt buộc số điện thoại', requireEmail: 'Bắt buộc email',
  allowOnlinePayment: 'Cho phép thanh toán trực tuyến', message: 'Thông báo',
  googleAnalyticsId: 'Mã Google Analytics', metaPixelId: 'Mã Meta Pixel',
};

function canonicalPath(path: string): string {
  return path.replace(/\[\d+\]/g, '[]');
}

function pathMeta(settingKey: string, path: string): FieldMeta | undefined {
  return FIELD_META[canonicalPath(path ? `${settingKey}.${path}` : settingKey)];
}

function displayLabel(settingKey: string, path: string): string {
  const meta = pathMeta(settingKey, path);
  if (meta) return meta.label;
  const key = path.split(/[.\[\]]/).filter(Boolean).at(-1) ?? settingKey.split('.').at(-1) ?? settingKey;
  if (COMMON_LABELS[key]) return COMMON_LABELS[key];
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toLocaleUpperCase('vi-VN'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function copyValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copyValue);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyValue(item)]));
  return value;
}

function blankLike(value: unknown): unknown {
  if (Array.isArray(value)) return [];
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blankLike(item)]));
  if (typeof value === 'number') return null;
  if (typeof value === 'boolean') return false;
  return '';
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function MediaIdField({ value, onChange, disabled, label, meta }: { value: unknown; onChange: (value: unknown) => void; disabled: boolean; label: string; meta?: FieldMeta }) {
  return (
    <AdminMediaField
      label={label}
      mediaId={typeof value === 'string' ? value : null}
      disabled={disabled}
      guidance={{
        width: meta?.recommendedWidth ?? 1200,
        height: meta?.recommendedHeight ?? 800,
        ratio: meta?.recommendedRatio,
        note: meta?.help,
      }}
      onChange={(asset) => onChange(asset?.id ?? null)}
    />
  );
}

function RichSettingField({ value, onChange, disabled, label, help }: { value: unknown; onChange: (value: unknown) => void; disabled: boolean; label: string; help?: string }) {
  const [open, setOpen] = useState(false);
  const insertRef = useRef<((attrs: { src: string; alt?: string; mediaId?: string }) => void) | null>(null);
  const documentValue = useMemo<RichDocument | null>(() => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as RichDocument;
    if (typeof value !== 'string' || !value) return null;
    return {
      type: 'doc',
      content: value.split(/\r?\n/).map((line) => ({
        type: 'paragraph',
        ...(line ? { content: [{ type: 'text', text: line }] } : {}),
      })),
    };
  }, [value]);
  return (
    <>
      <RichTextEditor
        label={label}
        hint={help ?? 'Nội dung dài dùng TipTap; ảnh chèn trong bài phải chọn từ Media Library.'}
        value={documentValue}
        disabled={disabled}
        onChange={(document) => onChange(document)}
        onPickImage={(insert) => { insertRef.current = insert; setOpen(true); }}
      />
      <MediaLibrary
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        title="Chèn ảnh từ Media Library"
        onSelect={(asset) => {
          insertRef.current?.({ src: asset.url, alt: asset.altText ?? asset.originalFilename, mediaId: asset.id });
          insertRef.current = null;
          setOpen(false);
        }}
      />
    </>
  );
}

function ValueField({
  settingKey,
  path,
  value,
  onChange,
  disabled,
}: {
  settingKey: string;
  path: string;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}) {
  const meta = pathMeta(settingKey, path);
  const label = displayLabel(settingKey, path);
  const fullPath = canonicalPath(path ? `${settingKey}.${path}` : settingKey);
  const kind = meta?.kind ?? (typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text');

  if (kind === 'media') {
    return <div className="afield settings-form__field"><span>{label}</span><MediaIdField value={value} onChange={onChange} disabled={disabled} label={label} meta={meta} />{meta?.help && <small className="ahint">{meta.help}</small>}</div>;
  }

  if (kind === 'rich') {
    return <div className="settings-form__field settings-form__field--rich"><RichSettingField value={value} onChange={onChange} disabled={disabled} label={label} help={meta?.help} /></div>;
  }

  if (isRecord(value)) {
    const fields = Object.entries(value).map(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      return <ValueField key={childPath} settingKey={settingKey} path={childPath} value={child} onChange={(next) => onChange({ ...value, [key]: next })} disabled={disabled} />;
    });
    if (!path) return <div className="settings-form__grid">{fields}</div>;
    return (
      <fieldset className="settings-form__section">
        <legend>{label}</legend>
        {meta?.help && <p className="ahint">{meta.help}</p>}
        <div className="settings-form__grid">{fields}</div>
      </fieldset>
    );
  }

  if (Array.isArray(value)) {
    const kind = meta?.kind;
    if (kind === 'multi') {
      const options = meta?.options ?? [];
      const selected = value.filter((item): item is string => typeof item === 'string');
      const knownValues = new Set(options.map((option) => option.value));
      const allOptions = [...options, ...selected.filter((item) => !knownValues.has(item)).map((item) => ({ value: item, label: item }))];
      return (
        <fieldset className="settings-form__array">
          <legend>{label}</legend>
          {meta?.help && <p className="ahint">{meta.help}</p>}
          <div className="settings-form__choices">
            {allOptions.map((option) => (
              <label className="settings-form__choice" key={option.value}>
                <input type="checkbox" checked={selected.includes(option.value)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    }
    if (kind === 'ordered') {
      const items = value.filter((item): item is string => typeof item === 'string');
      const options = meta?.options ?? [];
      const knownValues = new Set(options.map((option) => option.value));
      const allOptions = [...options, ...items.filter((item) => !knownValues.has(item)).map((item) => ({ value: item, label: item }))];
      const addValue = options.find((option) => !items.includes(option.value))?.value;
      return (
        <section className="settings-form__array">
          <h4>{label}</h4>
          {meta?.help && <p className="ahint">{meta.help}</p>}
          <ol className="settings-form__ordered-list">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onChange(moveItem(items, Number(event.dataTransfer.getData('text/plain')), index)); }}>
                <span className="settings-form__drag-handle" aria-hidden="true">⠿</span>
                <span className="settings-form__order-number">{index + 1}</span>
                <select className="ainput" aria-label={`${label}, mục ${index + 1}`} value={item} disabled={disabled} onChange={(event) => onChange(items.map((entry, itemIndex) => itemIndex === index ? event.target.value : entry))}>
                  {allOptions.filter((option) => option.value === item || !items.includes(option.value)).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button type="button" className="abtn abtn--ghost abtn--sm" aria-label="Chuyển lên" disabled={disabled || index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>↑</button>
                <button type="button" className="abtn abtn--ghost abtn--sm" aria-label="Chuyển xuống" disabled={disabled || index === items.length - 1} onClick={() => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next); }}>↓</button>
                <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Bỏ</button>
              </li>
            ))}
          </ol>
          <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled || !addValue} onClick={() => addValue && onChange([...items, addValue])}>+ Thêm khối</button>
        </section>
      );
    }

    const template = OBJECT_TEMPLATES[fullPath];
    const isObjectRows = value.some(isRecord) || !!template;
    if (isObjectRows) {
      const rows = value;
      const newRow = template ? copyValue(template) : rows.length ? blankLike(rows[0]) : {};
      return (
        <section className="settings-form__array">
          <h4>{label}</h4>
          {meta?.help && <p className="ahint">{meta.help}</p>}
          {!rows.length && <p className="ahint">Chưa có mục nào.</p>}
          <div className="settings-form__repeat-list">
            {rows.map((row, index) => (
              <article className="settings-form__repeat-item" key={`${path}-${index}`} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onChange(moveItem(rows, Number(event.dataTransfer.getData('text/plain')), index)); }}>
                <div className="settings-form__repeat-head"><strong>{label} {index + 1}</strong><button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Xoá mục</button></div>
                {isRecord(row) ? (
                  <div className="settings-form__grid">{Object.entries(row).map(([key, child]) => {
                    const childPath = `${path}[${index}].${key}`;
                    return <ValueField key={childPath} settingKey={settingKey} path={childPath} value={child} onChange={(next) => onChange(rows.map((entry, rowIndex) => rowIndex === index ? { ...row, [key]: next } : entry))} disabled={disabled} />;
                  })}</div>
                ) : <p className="ahint">Mục này có định dạng không được hỗ trợ.</p>}
              </article>
            ))}
          </div>
          <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled} onClick={() => onChange([...rows, copyValue(newRow)])}>+ Thêm mục</button>
        </section>
      );
    }

    const rows = value;
    return (
      <section className="settings-form__array">
        <h4>{label}</h4>
        {meta?.help && <p className="ahint">{meta.help}</p>}
        {!rows.length && <p className="ahint">Chưa có địa chỉ nào.</p>}
        <div className="settings-form__repeat-list">
          {rows.map((row, index) => (
            <div className="settings-form__string-row" key={`${path}-${index}`}>
              <input className="ainput" type={path.endsWith('internalRecipients') ? 'email' : 'text'} value={typeof row === 'string' ? row : ''} aria-label={`${label}, mục ${index + 1}`} disabled={disabled} onChange={(event) => onChange(rows.map((entry, rowIndex) => rowIndex === index ? event.target.value : entry))} />
              <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Xoá</button>
            </div>
          ))}
        </div>
        <button type="button" className="abtn abtn--ghost abtn--sm" disabled={disabled} onClick={() => onChange([...rows, ''])}>+ Thêm địa chỉ</button>
      </section>
    );
  }

  if (kind === 'boolean') {
    return (
      <div className="settings-form__toggle-field">
        <label className="atoggle">
          <input type="checkbox" checked={value === true} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
          <span className="atoggle__track"><span className="atoggle__thumb" /></span>
          <span className="atoggle__text"><strong>{label}</strong>{meta?.help && <small>{meta.help}</small>}</span>
        </label>
      </div>
    );
  }

  if (kind === 'radio') {
    return (
      <fieldset className="settings-form__array settings-form__radio" aria-label={label}>
        <legend>{label}</legend>
        <div className="settings-form__choices">
          {(meta?.options ?? []).map((option) => (
            <label className="settings-form__choice" key={option.value}>
              <input type="radio" name={`${settingKey}.${path}`} value={option.value} checked={value === option.value} disabled={disabled} onChange={() => onChange(option.value)} />
              <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const asNumber = kind === 'number' || kind === 'bytes';
  const displayValue = kind === 'bytes' && typeof value === 'number' ? String(Number((value / (1024 * 1024)).toFixed(2))) : asNumber ? (typeof value === 'number' ? String(value) : '') : (typeof value === 'string' ? value : '');
  const fieldType = kind === 'select' ? 'select' : kind === 'textarea' ? 'textarea' : asNumber ? 'number' : kind === 'time' ? 'time' : kind === 'email' ? 'email' : kind === 'url' ? 'url' : kind === 'tel' ? 'tel' : 'text';
  const input = kind === 'select' ? (
    <select className="ainput" value={displayValue} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
      {(meta?.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      {displayValue && !(meta?.options ?? []).some((option) => option.value === displayValue) && <option value={displayValue}>{displayValue}</option>}
    </select>
  ) : fieldType === 'textarea' ? (
    <textarea className="ainput" value={displayValue} placeholder={meta?.placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value || null)} />
  ) : (
    <input
      className="ainput"
      type={fieldType}
      value={displayValue}
      placeholder={meta?.placeholder}
      maxLength={!asNumber ? meta?.maxLength : undefined}
      min={asNumber ? meta?.min : undefined}
      max={asNumber ? meta?.max : undefined}
      step={asNumber ? (kind === 'bytes' ? (meta?.step ?? 0.1) : (meta?.step ?? 1)) : undefined}
      required={meta?.required}
      disabled={disabled}
      onChange={(event) => {
        if (!asNumber) onChange(event.target.value || null);
        else if (!event.target.value) onChange(null);
        else {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? (kind === 'bytes' ? Math.round(parsed * 1024 * 1024) : parsed) : null);
        }
      }}
    />
  );

  return (
    <label className={`afield settings-form__field${fieldType === 'textarea' ? ' settings-form__field--wide' : ''}`}>
      <span>{label}{meta?.required && <b aria-hidden="true"> *</b>}</span>
      <div className="settings-form__input-wrap">{input}{meta?.suffix && <small>{meta.suffix}</small>}</div>
      {meta?.help && <small className="ahint">{meta.help}</small>}
    </label>
  );
}

export function SettingsFormEditor({ settingKey, value, disabled, onChange }: { settingKey: string; value: unknown; disabled: boolean; onChange: (value: unknown) => void }) {
  if (settingKey === 'home.sections') {
    const root = isRecord(value) ? value : {};
    const incoming = Array.isArray(root.order) ? root.order.filter((item): item is string => typeof item === 'string') : [];
    const order = [...incoming, ...SECTIONS.map((item) => item.value).filter((id) => !incoming.includes(id))];
    const hidden = Array.isArray(root.hidden) ? root.hidden.filter((item): item is string => typeof item === 'string') : [];
    return (
      <ol className="settings-home-sections" aria-label="Thứ tự và trạng thái các khối trang chủ">
        {order.map((id, index) => {
          const option = SECTIONS.find((item) => item.value === id);
          if (!option) return null;
          return (
            <li key={id} data-home-section={id} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
              event.preventDefault();
              const moving = event.dataTransfer.getData('text/plain');
              const from = order.indexOf(moving);
              onChange({ ...root, order: moveItem(order, from, index), hidden });
            }}>
              <span className="settings-form__drag-handle" aria-hidden="true">⠿</span>
              <span className="settings-form__order-number">{index + 1}</span>
              <strong>{option.label}</strong>
              <label className="atoggle settings-home-sections__toggle">
                <input type="checkbox" aria-label={'Hiện ' + option.label} checked={!hidden.includes(id)} disabled={disabled} onChange={(event) => onChange({ ...root, order, hidden: event.target.checked ? hidden.filter((item) => item !== id) : [...new Set([...hidden, id])] })} />
                <span className="atoggle__track"><span className="atoggle__thumb" /></span>
                <span className="atoggle__text"><strong>{hidden.includes(id) ? 'Ẩn' : 'Hiện'}</strong></span>
              </label>
              <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ${option.label} lên`} disabled={disabled || index === 0} onClick={() => onChange({ ...root, order: moveItem(order, index, index - 1), hidden })}>↑</button>
              <button type="button" className="abtn abtn--ghost abtn--sm" aria-label={`Chuyển ${option.label} xuống`} disabled={disabled || index === order.length - 1} onClick={() => onChange({ ...root, order: moveItem(order, index, index + 1), hidden })}>↓</button>
            </li>
          );
        })}
      </ol>
    );
  }
  if (settingKey === 'about.page') return <AboutPageForm value={value} onChange={onChange} disabled={disabled} Field={ValueField} />;
  return (
    <div className="settings-form">
      <ValueField settingKey={settingKey} path="" value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function settingGroupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

export function validateSetting(settingKey: string, value: unknown): string | null {
  const visit = (path: string, current: unknown): string | null => {
    const meta = pathMeta(settingKey, path);
    const label = displayLabel(settingKey, path);
    if (meta?.kind === 'number' || meta?.kind === 'bytes') {
      if (current === null || current === undefined) return meta.nullable ? null : `${label}: nhập giá trị này trước khi lưu.`;
      if (typeof current !== 'number' || !Number.isFinite(current)) return `${label}: nhập một số hợp lệ.`;
      const compare = meta.kind === 'bytes' ? current / (1024 * 1024) : current;
      if (meta.min !== undefined && compare < meta.min) return `${label}: giá trị phải từ ${meta.min} trở lên.`;
      if (meta.max !== undefined && compare > meta.max) return `${label}: giá trị không được vượt quá ${meta.max}.`;
      if (meta.kind === 'number' && meta.step === 1 && !Number.isInteger(current)) return `${label}: chỉ nhập số nguyên.`;
      return null;
    }
    if (meta?.required && (typeof current !== 'string' || !current.trim())) return `${label}: không được để trống.`;
    if (typeof current === 'string' && current.trim() && meta?.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.trim())) return `${label}: nhập địa chỉ email hợp lệ.`;
    if (typeof current === 'string' && meta?.maxLength !== undefined && current.length > meta.maxLength) return `${label}: tối đa ${meta.maxLength} ký tự.`;
    if (typeof current === 'string' && current.trim() && meta?.kind === 'url') {
      try {
        const url = new URL(current.trim());
        if (!['http:', 'https:'].includes(url.protocol)) return `${label}: liên kết phải bắt đầu bằng http:// hoặc https://.`;
      } catch {
        return `${label}: nhập một liên kết hợp lệ.`;
      }
    }
    if (typeof current === 'string' && current.trim() && meta?.kind === 'route') {
      const target = current.trim();
      if (target.startsWith('/')) {
        if (target.startsWith('//') || /[\u0000-\u001f\\]/.test(target)) return `${label}: nhập đường dẫn nội bộ hợp lệ.`;
      } else {
        try {
          const url = new URL(target);
          if (!['http:', 'https:'].includes(url.protocol)) return `${label}: chỉ nhận đường dẫn nội bộ hoặc liên kết http(s).`;
        } catch {
          return `${label}: nhập đường dẫn bắt đầu bằng / hoặc liên kết http(s).`;
        }
      }
    }
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        const issue = visit(`${path}[${index}]`, current[index]);
        if (issue) return issue;
      }
    } else if (isRecord(current)) {
      for (const [key, child] of Object.entries(current)) {
        const issue = visit(path ? `${path}.${key}` : key, child);
        if (issue) return issue;
      }
    }
    return null;
  };
  return visit('', value);
}
