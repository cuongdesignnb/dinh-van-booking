/** Owner-confirmed presentation copy. No catalogue, commercial or review rows live here. */
export type BootstrapMediaKey = 'hero' | 'promo' | 'staysHero' | 'destinationsHero' | 'combosHero' | 'bookingHero';

export type BootstrapMediaSource = {
  key: BootstrapMediaKey;
  source: string;
  alt: string;
  caption: string;
};

export const PUBLIC_BOOTSTRAP_MEDIA: readonly BootstrapMediaSource[] = [
  { key: 'hero', source: 'hero-cuc-phuong.webp', alt: 'Phong cảnh núi rừng và khu nghỉ chân minh họa hành trình Cúc Phương – Ninh Bình', caption: 'Ảnh minh họa cho trang chủ Đinh Vân Booking' },
  { key: 'promo', source: 'experience-promo.webp', alt: 'Du khách ngắm cảnh thiên nhiên bên dòng nước', caption: 'Ảnh minh họa trải nghiệm thiên nhiên' },
  { key: 'staysHero', source: 'pages/stays-hero.webp', alt: 'Không gian lưu trú giữa núi rừng trong ảnh minh họa', caption: 'Ảnh minh họa cho trang phòng nghỉ' },
  { key: 'destinationsHero', source: 'pages/destinations-hero.webp', alt: 'Du khách ngắm phong cảnh núi rừng Ninh Bình', caption: 'Ảnh minh họa cho trang điểm đến' },
  { key: 'combosHero', source: 'pages/combo-hero.webp', alt: 'Du khách trước phong cảnh núi rừng Cúc Phương – Ninh Bình', caption: 'Ảnh minh họa cho trang combo' },
  { key: 'bookingHero', source: 'pages/checkout-hero.webp', alt: 'Phong cảnh núi rừng và hiên nhà trong ảnh minh họa', caption: 'Ảnh minh họa cho trang đặt phòng và liên hệ' },
];

export const PUBLIC_BOOTSTRAP_MENU = [
  { label: 'Trang chủ', externalUrl: '/' },
  { label: 'Phòng nghỉ', externalUrl: '/phong-nghi' },
  { label: 'Combo du lịch', externalUrl: '/combo-du-lich' },
  { label: 'Điểm đến', externalUrl: '/diem-den' },
  { label: 'Liên hệ', externalUrl: '/lien-he' },
] as const;

export function paragraphDoc(text: string): object {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

export function publicBootstrapSettings(media: Record<BootstrapMediaKey, string | null>): Record<string, Record<string, unknown>> {
  return {
    'brand.identity': {
      name: 'Đinh Vân Booking',
      shortName: 'Đinh Vân',
      tagline: 'Ở đây có những chuyến đi ý nghĩa',
      description: paragraphDoc('Đinh Vân Booking hỗ trợ tư vấn lưu trú và hành trình khám phá Cúc Phương – Ninh Bình theo nhu cầu thực tế của từng chuyến đi.'),
      logoMediaId: null,
      faviconMediaId: null,
    },
    'brand.contact': { phone: '0974045828', hotline: '0974045828', zaloUrl: null, email: null, address: null, mapUrl: null },
    'site.header': {
      mottoLine1: 'Du lịch bản địa',
      mottoLine2: 'Kết nối những giá trị thật',
      ctaLabel: 'Đặt ngay',
      ctaTarget: '/phong-nghi',
    },
    'site.footer': {
      quote: 'Những chuyến đi không chỉ để đến, mà còn để lưu lại những trải nghiệm đáng nhớ.',
      quoteAuthor: 'Đinh Vân Booking',
      motto: 'Du lịch bản địa – Kết nối những giá trị thật',
      copyrightText: '© {year} Đinh Vân Booking. All rights reserved.',
    },
    'home.sections': {
      order: ['hero', 'search', 'trust', 'featured', 'combos', 'why', 'destinations', 'reviews', 'promo', 'faq', 'contact'],
      hidden: [],
    },
    'home.hero': {
      enabled: true,
      kicker: 'Về với thiên nhiên, trở về những điều bình yên',
      titleLine1: 'Đặt phòng Cúc Phương',
      titleLine2: 'Ninh Bình dễ dàng hơn',
      signature: 'cùng Đinh Vân Booking',
      description: paragraphDoc('Tư vấn lưu trú và hành trình Cúc Phương – Ninh Bình theo nhu cầu của bạn.'),
      note: 'Cúc Phương luôn đẹp hơn khi có bạn ở đây!',
      imageMediaId: media.hero,
      mobileImageMediaId: null,
    },
    'home.trust': {
      enabled: true,
      items: [
        { id: 'local', icon: 'leaf', line1: 'Tư vấn địa phương', line2: 'Hiểu nhu cầu chuyến đi', enabled: true },
        { id: 'stay', icon: 'heart', line1: 'Gợi ý lưu trú phù hợp', line2: 'Theo nhu cầu thực tế', enabled: true },
        { id: 'support', icon: 'shield', line1: 'Hỗ trợ trực tiếp', line2: 'Qua điện thoại khi cần', enabled: true },
        { id: 'journey', icon: 'users', line1: 'Đồng hành cùng chuyến đi', line2: 'Từ lúc tìm hiểu đến khi khởi hành', enabled: true },
      ],
    },
    'home.why': {
      enabled: true,
      title: 'Vì sao chọn Đinh Vân Booking?',
      intro: paragraphDoc('Đinh Vân Booking tập trung vào tư vấn địa phương, gợi ý lưu trú và hành trình phù hợp khi khám phá Cúc Phương – Ninh Bình.'),
      reasons: [
        { id: 'local', icon: 'user', title: 'Người địa phương', description: 'Tư vấn gần gũi, dễ trao đổi', enabled: true },
        { id: 'stay', icon: 'house', title: 'Gợi ý lưu trú', description: 'Theo nhu cầu và lịch trình thực tế', enabled: true },
        { id: 'support', icon: 'message', title: 'Hỗ trợ nhanh', description: 'Liên hệ trực tiếp qua điện thoại', enabled: true },
        { id: 'journey', icon: 'map', title: 'Gợi ý hành trình', description: 'Kết hợp lưu trú và điểm đến phù hợp', enabled: true },
      ],
    },
    'home.featured': {
      enabled: true, title: 'Phòng nghỉ nổi bật', subtitle: 'Những nơi lưu trú đã được cập nhật và xuất bản trên hệ thống',
      ctaLabel: 'Xem tất cả', ctaTarget: '/phong-nghi', limit: 6, selectionMode: 'featured',
    },
    'home.combos': {
      enabled: true, title: 'Combo du lịch', subtitle: 'Gợi ý hành trình và dịch vụ được cập nhật trên hệ thống',
      ctaLabel: 'Xem combo', ctaTarget: '/combo-du-lich', limit: 3,
    },
    'home.destinations': {
      enabled: true, title: 'Khám phá Cúc Phương – Ninh Bình', subtitle: 'Những điểm đến được cập nhật và xuất bản trên hệ thống',
      ctaLabel: 'Xem tất cả', ctaTarget: '/diem-den', limit: 6, selectionMode: 'featured',
    },
    'home.testimonials': { enabled: true, title: 'Khách hàng chia sẻ', ctaLabel: 'Xem thêm', limit: 3 },
    'home.promo': {
      enabled: true,
      titleLine1: 'Không chỉ là',
      titleLine2: 'một nơi để nghỉ...',
      body: paragraphDoc('Cúc Phương còn có những trải nghiệm thiên nhiên và hành trình đáng để bạn dành thời gian khám phá.'),
      ctaLabel: 'Khám phá ngay',
      ctaTarget: '/diem-den',
      quote: 'Đi để gần thiên nhiên hơn.',
      imageMediaId: media.promo,
    },
    'home.contactPanel': {
      enabled: true,
      title: 'Bạn cần tư vấn riêng?',
      description: paragraphDoc('Liên hệ với Đinh Vân để được gợi ý lưu trú và lịch trình phù hợp cho chuyến đi Cúc Phương – Ninh Bình.'),
      advisorName: 'Đinh Vân',
      advisorRole: 'Người tư vấn địa phương',
      phoneCtaLabel: 'Gọi cho Đinh Vân',
      zaloCtaLabel: 'Nhắn Zalo',
      note: 'Hẹn gặp bạn ở Cúc Phương!',
      imageMediaId: null,
    },
    'home.faq': {
      enabled: true,
      title: 'Câu hỏi thường gặp',
      items: [
        { id: 'preparation', enabled: true, question: 'Tôi cần cung cấp gì khi muốn được tư vấn?', answer: paragraphDoc('Thời gian dự kiến, số người, nhu cầu lưu trú và những điểm bạn muốn trải nghiệm.') },
        { id: 'confirmation', enabled: true, question: 'Thông tin phòng và giá có được xác nhận trước khi đặt không?', answer: paragraphDoc('Có. Tình trạng phòng, mức giá và điều kiện đặt sẽ được xác nhận theo dữ liệu hiện có trước khi hoàn tất yêu cầu.') },
        { id: 'call', enabled: true, question: 'Tôi có thể gọi trực tiếp để trao đổi không?', answer: paragraphDoc('Có. Bạn có thể liên hệ Đinh Vân qua số 0974045828.') },
      ],
    },
    'contact.page': {
      enabled: true,
      heroEyebrow: 'Liên hệ',
      title: 'Cùng lên kế hoạch cho chuyến đi Cúc Phương',
      intro: paragraphDoc('Chia sẻ nhu cầu lưu trú, thời gian dự kiến và số người để Đinh Vân hỗ trợ bạn dễ dàng hơn.'),
      heroImageMediaId: media.bookingHero,
      formTitle: 'Gửi yêu cầu tư vấn',
      formIntro: paragraphDoc('Thông tin của bạn được dùng để liên hệ và hỗ trợ cho yêu cầu này.'),
      formMessageLabel: 'Bạn đang cần hỗ trợ điều gì?',
      formMessagePlaceholder: 'Ví dụ: cần phòng cho gia đình, dự kiến đi 2 ngày 1 đêm...',
      formSubmitLabel: 'Gửi yêu cầu',
      formSuccessMessage: paragraphDoc('Đã nhận yêu cầu. Đinh Vân sẽ kiểm tra thông tin và liên hệ lại.'),
      quickTitle: 'Liên hệ trực tiếp',
      quickIntro: paragraphDoc('Bạn có thể gọi trực tiếp nếu cần trao đổi nhanh.'),
      advisorName: 'Đinh Vân',
      advisorRole: 'Người tư vấn địa phương',
      advisorDescription: paragraphDoc('Hỗ trợ gợi ý lưu trú và hành trình tại khu vực Cúc Phương – Ninh Bình.'),
      advisorImageMediaId: null,
    },
    'catalog.staysPage': {
      heroTitle: 'Phòng nghỉ Cúc Phương',
      heroKicker: 'Gợi ý lưu trú cho hành trình gần thiên nhiên',
      heroDescription: paragraphDoc('Khám phá các nơi lưu trú đã được cập nhật trên hệ thống, hoặc liên hệ Đinh Vân để trao đổi nhu cầu của bạn.'),
      heroImageMediaId: media.staysHero,
      advisorTitle: 'Cần gợi ý chỗ nghỉ?',
      advisorDescription: paragraphDoc('Gọi cho Đinh Vân để trao đổi về thời gian đi, số người và nhu cầu lưu trú.'),
      advisorCtaLabel: 'Liên hệ Đinh Vân',
      advisorImageMediaId: null,
      emptyResultTitle: 'Chưa có nơi lưu trú được xuất bản',
      emptyResultDescription: paragraphDoc('Nội dung đang được cập nhật. Bạn có thể liên hệ Đinh Vân để được hỗ trợ.'),
      emptyResultCtaLabel: 'Liên hệ tư vấn',
    },
    'catalog.destinationsPage': {
      heroKicker: 'Khám phá theo cách của bạn',
      heroTitle: 'Điểm đến Cúc Phương – Ninh Bình',
      heroDescription: paragraphDoc('Gợi ý những điểm đến được cập nhật trên hệ thống cho hành trình gần thiên nhiên.'),
      heroImageMediaId: media.destinationsHero,
      listTitle: 'Khám phá điểm đến',
      listSubtitle: paragraphDoc('Thông tin điểm đến sẽ hiển thị khi được quản trị viên xuất bản.'),
      advisorCtaLabel: 'Liên hệ tư vấn',
      emptyTitle: 'Chưa có điểm đến được xuất bản',
      emptyDescription: paragraphDoc('Đinh Vân đang cập nhật nội dung. Bạn có thể gọi để được gợi ý trước khi lên đường.'),
    },
    'catalog.combosPage': {
      heroTitle: 'Combo du lịch Cúc Phương',
      heroKicker: 'Chọn hành trình phù hợp',
      heroDescription: paragraphDoc('Thông tin combo sẽ được cập nhật sau khi các dịch vụ và điều kiện được xác nhận.'),
      heroImageMediaId: media.combosHero,
      listTitle: 'Combo du lịch',
      listSubtitle: paragraphDoc('Các lựa chọn sẽ xuất hiện khi được quản trị viên xuất bản.'),
      advisorCtaLabel: 'Liên hệ tư vấn',
      emptyTitle: 'Chưa có combo được xuất bản',
      emptyDescription: paragraphDoc('Bạn có thể liên hệ Đinh Vân để chia sẻ nhu cầu chuyến đi.'),
      emptyCtaLabel: 'Liên hệ Đinh Vân',
    },
    'catalog.bookingPage': {
      heroTitle: 'Đặt phòng Cúc Phương',
      heroKicker: 'Bắt đầu từ nhu cầu của bạn',
      heroDescription: paragraphDoc('Chọn nơi lưu trú đã được xác nhận trên hệ thống hoặc liên hệ Đinh Vân để được hỗ trợ.'),
      heroImageMediaId: media.bookingHero,
      helpTitle: 'Cần hỗ trợ đặt phòng?',
      helpDescription: paragraphDoc('Gọi cho Đinh Vân để trao đổi trực tiếp về nhu cầu lưu trú.'),
    },
    'catalog.staticPages': {
      eyebrow: 'Thông tin hữu ích',
      title: 'Chuyên trang',
      description: paragraphDoc('Thông tin chính sách và hướng dẫn sẽ xuất hiện khi được quản trị viên xuất bản.'),
    },
    'catalog.articlesPage': {
      eyebrow: 'Cẩm nang Cúc Phương',
      title: 'Bài viết',
      description: paragraphDoc('Bài viết và kinh nghiệm khám phá sẽ xuất hiện khi được quản trị viên xuất bản.'),
    },
    'seo.defaults': {
      defaultTitle: 'Đinh Vân Booking — Cúc Phương, Ninh Bình',
      defaultDescription: 'Tư vấn lưu trú và hành trình khám phá Cúc Phương – Ninh Bình cùng Đinh Vân Booking.',
      canonicalBase: null,
      robotsIndex: false,
    },
    'seo.pages': {
      home: { title: 'Đinh Vân Booking — Cúc Phương, Ninh Bình', description: 'Tư vấn lưu trú và hành trình Cúc Phương – Ninh Bình theo nhu cầu của bạn.' },
      stays: { title: 'Phòng nghỉ Cúc Phương', description: 'Xem nơi lưu trú đã được xuất bản hoặc liên hệ Đinh Vân để được tư vấn.' },
      destinations: { title: 'Điểm đến Cúc Phương – Ninh Bình', description: 'Khám phá điểm đến được cập nhật cho hành trình Cúc Phương – Ninh Bình.' },
      combos: { title: 'Combo du lịch Cúc Phương', description: 'Theo dõi các combo du lịch khi thông tin dịch vụ đã được xác nhận và xuất bản.' },
      contact: { title: 'Liên hệ Đinh Vân Booking', description: 'Gọi 0974045828 hoặc gửi yêu cầu để Đinh Vân hỗ trợ chuyến đi Cúc Phương – Ninh Bình.' },
      booking: { title: 'Đặt phòng Cúc Phương', description: 'Tìm nơi lưu trú phù hợp hoặc liên hệ Đinh Vân để được hỗ trợ đặt phòng.' },
      articles: { title: 'Bài viết Cúc Phương – Ninh Bình', description: 'Bài viết và kinh nghiệm khám phá được cập nhật trên Đinh Vân Booking.' },
      staticPages: { title: 'Thông tin Đinh Vân Booking', description: 'Chính sách và hướng dẫn được cập nhật trên Đinh Vân Booking.' },
    },
  };
}
