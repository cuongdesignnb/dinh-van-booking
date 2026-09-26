'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
import { MediaLibrary, type MediaAsset } from '../media/MediaLibrary';

type Option = { value: string; label: string };
type FieldKind = 'text' | 'textarea' | 'number' | 'time' | 'email' | 'url' | 'tel' | 'select' | 'boolean' | 'media' | 'bytes' | 'multi' | 'ordered';
type FieldMeta = {
  label: string;
  kind?: FieldKind;
  help?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  nullable?: boolean;
  required?: boolean;
  suffix?: string;
  options?: Option[];
};

const SECTIONS: Option[] = [
  { value: 'hero', label: 'Ảnh bìa và giới thiệu' },
  { value: 'search', label: 'Tìm kiếm phòng' },
  { value: 'featured', label: 'Nơi lưu trú nổi bật' },
  { value: 'combos', label: 'Combo du lịch' },
  { value: 'destinations', label: 'Điểm đến' },
  { value: 'reviews', label: 'Đánh giá khách hàng' },
  { value: 'promo', label: 'Khuyến mãi' },
  { value: 'faq', label: 'Câu hỏi thường gặp' },
  { value: 'contact', label: 'Liên hệ' },
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
  'brand.identity.name': { label: 'Tên thương hiệu', required: true, placeholder: 'Ví dụ: Đinh Vân Booking' },
  'brand.identity.shortName': { label: 'Tên viết gọn', placeholder: 'Tên ngắn dùng trên menu' },
  'brand.identity.tagline': { label: 'Khẩu hiệu', placeholder: 'Thông điệp ngắn của thương hiệu' },
  'brand.identity.description': { label: 'Mô tả thương hiệu', kind: 'textarea' },
  'brand.identity.logoMediaId': { label: 'Logo', kind: 'media', help: 'Chọn ảnh đã có hoặc tải ảnh mới lên Thư viện ảnh.' },
  'brand.identity.faviconMediaId': { label: 'Biểu tượng trình duyệt (favicon)', kind: 'media' },
  'brand.contact.phone': { label: 'Số điện thoại', kind: 'tel', placeholder: '024…' },
  'brand.contact.hotline': { label: 'Hotline', kind: 'tel' },
  'brand.contact.zaloUrl': { label: 'Liên kết Zalo', kind: 'url', placeholder: 'https://zalo.me/…' },
  'brand.contact.email': { label: 'Email liên hệ', kind: 'email' },
  'brand.contact.address': { label: 'Địa chỉ', kind: 'textarea' },
  'brand.contact.mapUrl': { label: 'Liên kết bản đồ', kind: 'url', placeholder: 'https://maps.google.com/…' },
  'brand.social.facebook': { label: 'Facebook', kind: 'url' },
  'brand.social.instagram': { label: 'Instagram', kind: 'url' },
  'brand.social.youtube': { label: 'YouTube', kind: 'url' },
  'brand.social.tiktok': { label: 'TikTok', kind: 'url' },
  'brand.businessHours.weekdays': { label: 'Giờ làm việc ngày thường', placeholder: 'Ví dụ: 08:00–17:30' },
  'brand.businessHours.weekend': { label: 'Giờ làm việc cuối tuần', placeholder: 'Ví dụ: 08:00–17:30' },
  'brand.businessHours.note': { label: 'Ghi chú giờ làm việc', kind: 'textarea' },

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
  'booking.cancellation.note': { label: 'Ghi chú chính sách huỷ', kind: 'textarea' },
  'booking.payment.methods': { label: 'Phương thức thanh toán', kind: 'multi', options: PAYMENT_METHODS, help: 'Chỉ chọn phương thức cơ sở thực sự chấp nhận.' },
  'booking.payment.bankAccount.bankName': { label: 'Tên ngân hàng' },
  'booking.payment.bankAccount.accountNumber': { label: 'Số tài khoản' },
  'booking.payment.bankAccount.accountHolder': { label: 'Chủ tài khoản' },
  'booking.payment.bankAccount.branch': { label: 'Chi nhánh' },
  'booking.payment.bankAccount.qrMediaId': { label: 'Mã QR thanh toán', kind: 'media' },

  'locale.formats.locale': { label: 'Ngôn ngữ', kind: 'select', options: [{ value: 'vi-VN', label: 'Tiếng Việt' }, { value: 'en-US', label: 'English (US)' }] },
  'locale.formats.timezone': { label: 'Múi giờ', kind: 'select', options: [{ value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (Asia/Ho_Chi_Minh)' }, { value: 'UTC', label: 'UTC' }] },
  'locale.formats.currency': { label: 'Đơn vị tiền tệ', kind: 'select', options: [{ value: 'VND', label: 'Việt Nam đồng (VND)' }, { value: 'USD', label: 'Đô la Mỹ (USD)' }] },
  'locale.formats.currencySuffix': { label: 'Ký hiệu sau số tiền', placeholder: 'Ví dụ: đ' },
  'locale.formats.dateFormat': { label: 'Định dạng ngày', kind: 'select', options: [{ value: 'dd/MM/yyyy', label: '23/09/2026' }, { value: 'dd-MM-yyyy', label: '23-09-2026' }, { value: 'yyyy-MM-dd', label: '2026-09-23' }] },

  'seo.defaults.titleTemplate': { label: 'Mẫu tiêu đề trang', placeholder: '%s | Đinh Vân Booking' },
  'seo.defaults.defaultTitle': { label: 'Tiêu đề mặc định', placeholder: 'Đinh Vân Booking — nghỉ dưỡng Cúc Phương' },
  'seo.defaults.defaultDescription': { label: 'Mô tả mặc định', kind: 'textarea' },
  'seo.defaults.canonicalBase': { label: 'Tên miền chính thức', kind: 'url', placeholder: 'https://tenmien.vn' },
  'seo.defaults.ogMediaId': { label: 'Ảnh chia sẻ mạng xã hội', kind: 'media' },
  'seo.defaults.robotsIndex': { label: 'Cho phép công cụ tìm kiếm lập chỉ mục website', kind: 'boolean', help: 'Đây là lựa chọn nội dung. Máy chủ chỉ mở index khi môi trường và domain chính thức cũng được Owner duyệt.' },
  'seo.defaults.verification.google': { label: 'Mã xác minh Google' },
  'seo.defaults.verification.bing': { label: 'Mã xác minh Bing' },
  'seo.structuredData.core': { label: 'Schema nền tảng', kind: 'boolean', help: 'Website, tổ chức, trang, danh mục và breadcrumb từ dữ liệu public thật.' },
  'seo.structuredData.offers': { label: 'Schema giá và ưu đãi', kind: 'boolean', help: 'Chưa phát ra cho tới khi API giá và tồn phòng được xác minh đầy đủ.' },
  'seo.structuredData.reviews': { label: 'Schema đánh giá', kind: 'boolean', help: 'Chưa phát ra cho tới khi quy trình duyệt và dữ liệu review public đủ điều kiện.' },
  'seo.structuredData.vacationRental': { label: 'Schema Vacation Rental', kind: 'boolean', help: 'Đang khóa theo điều kiện eligibility và tích hợp Google Hotels; không bật chỉ bằng một công tắc.' },

  'analytics.providers.googleAnalyticsId': { label: 'Mã Google Analytics', placeholder: 'G-XXXXXXXXXX' },
  'analytics.providers.metaPixelId': { label: 'Mã Meta Pixel' },
  'analytics.providers.enabled': { label: 'Bật tích hợp thống kê', kind: 'boolean', help: 'Chỉ bật khi đã nhập mã theo dõi thật.' },
  'home.sections.order': { label: 'Thứ tự các khối trang chủ', kind: 'ordered', options: SECTIONS, help: 'Dùng nút lên/xuống để sắp xếp thứ tự hiển thị.' },
  'home.sections.hidden': { label: 'Ẩn các khối trang chủ', kind: 'multi', options: SECTIONS },

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
  'ops.dataMode.usesDemoData': { label: 'Website đang dùng dữ liệu mẫu', kind: 'boolean' },
  'ops.dataMode.demoBanner': { label: 'Thông báo về dữ liệu mẫu', kind: 'textarea' },
};

const OBJECT_TEMPLATES: Record<string, Record<string, unknown>> = {
  'booking.cancellation.tiers': CANCELLATION_TIER,
};

const GROUP_LABELS: Record<string, string> = {
  brand: 'Thương hiệu',
  booking: 'Đặt phòng',
  locale: 'Ngôn ngữ & định dạng',
  seo: 'SEO & thống kê',
  content: 'Nội dung',
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
  maintenance: 'Chế độ bảo trì', allowAdmin: 'Cho quản trị viên truy cập', dataMode: 'Nguồn dữ liệu',
  usesDemoData: 'Đang dùng dữ liệu mẫu', demoBanner: 'Thông báo dữ liệu mẫu', beforeHours: 'Huỷ trước ít nhất',
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

function mediaIdFrom(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function MediaIdField({ value, onChange, disabled, label }: { value: unknown; onChange: (value: unknown) => void; disabled: boolean; label: string }) {
  const id = mediaIdFrom(value);
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setAsset(null);
      return;
    }
    let current = true;
    void apiRequest<MediaAsset>(`/media/${encodeURIComponent(id)}`)
      .then((next) => { if (current) setAsset(next); })
      .catch(() => { if (current) setAsset(null); });
    return () => { current = false; };
  }, [id]);

  return (
    <div className="settings-media-field">
      {asset ? (
        <div className="settings-media-field__selected">
          <Image src={asset.url} alt={asset.altText ?? label} width={120} height={76} unoptimized />
          <span>{asset.originalFilename}</span>
        </div>
      ) : <p className="ahint">{id ? 'Ảnh đã chọn nhưng không tải được thông tin xem trước.' : 'Chưa chọn ảnh.'}</p>}
      <div className="settings-media-field__actions">
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setOpen(true)} disabled={disabled}>{id ? 'Chọn ảnh khác' : 'Chọn từ Thư viện ảnh'}</button>
        {id && <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => { setAsset(null); onChange(null); }} disabled={disabled}>Bỏ ảnh</button>}
      </div>
      <MediaLibrary
        mode="modal"
        open={open}
        onClose={() => setOpen(false)}
        selectedId={id}
        title={`Chọn ${label.toLocaleLowerCase('vi-VN')}`}
        onSelect={(next) => { setAsset(next); onChange(next.id); setOpen(false); }}
      />
    </div>
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
              <li key={`${item}-${index}`}>
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
              <article className="settings-form__repeat-item" key={`${path}-${index}`}>
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

  const kind = meta?.kind ?? (typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text');
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

  if (kind === 'media') {
    return <div className="afield settings-form__field"><span>{label}</span><MediaIdField value={value} onChange={onChange} disabled={disabled} label={label} />{meta?.help && <small className="ahint">{meta.help}</small>}</div>;
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
  const root = isRecord(value) ? value : {};
  return (
    <div className="settings-form">
      <ValueField settingKey={settingKey} path="" value={root} onChange={onChange} disabled={disabled} />
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
    if (typeof current === 'string' && current.trim() && meta?.kind === 'url') {
      try {
        const url = new URL(current.trim());
        if (!['http:', 'https:'].includes(url.protocol)) return `${label}: liên kết phải bắt đầu bằng http:// hoặc https://.`;
      } catch {
        return `${label}: nhập một liên kết hợp lệ.`;
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
