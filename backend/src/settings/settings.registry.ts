/**
 * Every configurable value in the product lives here, with its default and
 * whether the public site may read it. Nothing about the brand, contacts,
 * booking rules or homepage copy is hardcoded in the frontend: the admin edits
 * these keys and both sites follow.
 */
export interface SettingDefinition {
  key: string;
  group: string;
  label: string;
  description?: string;
  isPublic: boolean;
  schemaVersion: number;
  defaultValue: unknown;
}

const def = (d: SettingDefinition): SettingDefinition => d;

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  def({
    key: 'brand.identity',
    group: 'brand',
    label: 'Thương hiệu',
    description: 'Tên, khẩu hiệu và mô tả chung hiển thị trên toàn site.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      name: null,
      shortName: null,
      tagline: null,
      description: null,
      logoMediaId: null,
      faviconMediaId: null,
    },
  }),
  def({
    key: 'brand.contact',
    group: 'brand',
    label: 'Liên hệ',
    description: 'Để trống nếu kênh đó chưa sẵn sàng — site sẽ ẩn thay vì hiện link hỏng.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      phone: null,
      hotline: null,
      zaloUrl: null,
      email: null,
      address: null,
      mapUrl: null,
    },
  }),
  def({
    key: 'brand.social',
    group: 'brand',
    label: 'Mạng xã hội',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: { facebook: null, instagram: null, youtube: null, tiktok: null },
  }),
  def({
    key: 'brand.businessHours',
    group: 'brand',
    label: 'Giờ làm việc',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: { weekdays: null, weekend: null, note: null },
  }),
  def({
    key: 'booking.rules',
    group: 'booking',
    label: 'Quy tắc đặt phòng',
    description: 'Áp dụng khi hạng phòng không có quy tắc riêng.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      minNights: 1,
      maxNights: 30,
      maxAdults: 10,
      maxChildren: 6,
      maxRoomsPerBooking: 5,
      advanceBookingDays: 365,
      sameDayCutoffHour: null,
      defaultCheckInTime: null,
      defaultCheckOutTime: null,
      depositPercent: null,
      holdMinutes: null,
      quoteMinutes: null,
      requirePhone: true,
      requireEmail: false,
      allowOnlinePayment: false,
    },
  }),
  def({
    key: 'booking.cancellation',
    group: 'booking',
    label: 'Chính sách huỷ mặc định',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      freeCancelHours: null,
      tiers: [],
      note: null,
    },
  }),
  def({
    key: 'booking.payment',
    group: 'booking',
    label: 'Hướng dẫn thanh toán',
    description: 'Hiển thị ở bước đặt phòng. Không bật kênh nào chưa cấu hình thật.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      methods: [],
      bankAccount: {
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        branch: null,
        qrMediaId: null,
      },
    },
  }),
  def({
    key: 'locale.formats',
    group: 'locale',
    label: 'Ngôn ngữ và định dạng',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      locale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND',
      currencySuffix: 'đ',
      dateFormat: 'dd/MM/yyyy',
    },
  }),
  def({
    key: 'seo.defaults',
    group: 'seo',
    label: 'SEO mặc định',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      titleTemplate: null,
      defaultTitle: null,
      defaultDescription: null,
      canonicalBase: null,
      ogMediaId: null,
      robotsIndex: false,
      verification: { google: null, bing: null },
    },
  }),
  def({
    key: 'seo.structuredData',
    group: 'seo',
    label: 'Dữ liệu có cấu trúc',
    description: 'Chọn các loại Schema được phép dựng từ dữ liệu đã công khai. Tính năng thương mại bị chặn cho tới khi có nguồn dữ liệu và phê duyệt phù hợp.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: { core: true, offers: false, reviews: false, vacationRental: false },
  }),
  def({
    key: 'analytics.providers',
    group: 'seo',
    label: 'Thống kê',
    description: 'Chỉ nạp script khi có mã thật; không gửi thông tin cá nhân.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: { googleAnalyticsId: null, metaPixelId: null, enabled: false },
  }),
  def({
    key: 'home.sections',
    group: 'content',
    label: 'Bố cục trang chủ',
    description: 'Bật/tắt và sắp xếp từng khối trên trang chủ.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      order: ['hero', 'search', 'featured', 'combos', 'destinations', 'reviews', 'promo', 'faq', 'contact'],
      hidden: [],
    },
  }),
  def({
    key: 'content.editor',
    group: 'content',
    label: 'Trình soạn thảo',
    isPublic: false,
    schemaVersion: 1,
    defaultValue: {
      allowedBlocks: [
        'paragraph',
        'heading',
        'bulletList',
        'orderedList',
        'blockquote',
        'image',
        'table',
        'callout',
      ],
      maxImageWidth: 1600,
      autosaveSeconds: 20,
    },
  }),
  def({
    key: 'media.processing',
    group: 'media',
    label: 'Xử lý ảnh',
    description: 'Ảnh tải lên được chuyển sang WebP và xoá file gốc.',
    isPublic: false,
    schemaVersion: 1,
    defaultValue: {
      convertToWebp: true,
      deleteOriginal: true,
      quality: 82,
      maxWidth: 2560,
      maxBytes: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
      renditions: [
        { name: 'thumb', width: 320 },
        { name: 'card', width: 720 },
        { name: 'wide', width: 1440 },
      ],
      stripMetadata: true,
    },
  }),
  def({
    key: 'crm.pipeline',
    group: 'crm',
    label: 'Quy trình tư vấn',
    isPublic: false,
    schemaVersion: 1,
    defaultValue: {
      stages: [
        { code: 'new', label: 'Mới' },
        { code: 'contacted', label: 'Đã liên hệ' },
        { code: 'quoted', label: 'Đã báo giá' },
        { code: 'won', label: 'Chốt' },
        { code: 'lost', label: 'Không thành' },
      ],
      sources: ['website', 'zalo', 'facebook', 'phone', 'walk_in', 'referral'],
      followUpDefaultHours: 24,
      slaFirstResponseHours: 4,
    },
  }),
  def({
    key: 'notifications.channels',
    group: 'ops',
    label: 'Thông báo',
    description: 'Chưa cấu hình thì hệ thống ghi nhận nhưng không giả vờ đã gửi.',
    isPublic: false,
    schemaVersion: 1,
    defaultValue: {
      email: { enabled: false, fromName: null, fromAddress: null, replyTo: null },
      zalo: { enabled: false },
      internalRecipients: [],
    },
  }),
  def({
    key: 'ops.maintenance',
    group: 'ops',
    label: 'Chế độ bảo trì',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: {
      enabled: false,
      message: null,
      allowAdmin: true,
    },
  }),
  def({
    key: 'ops.dataMode',
    group: 'ops',
    label: 'Nguồn dữ liệu',
    description: 'Cảnh báo hiển thị khi site còn chạy dữ liệu mẫu.',
    isPublic: true,
    schemaVersion: 1,
    defaultValue: { usesDemoData: false, demoBanner: null },
  }),
];

export const SETTINGS_BY_KEY = new Map(SETTING_DEFINITIONS.map((d) => [d.key, d]));
export const SETTING_GROUPS = [...new Set(SETTING_DEFINITIONS.map((d) => d.group))];
