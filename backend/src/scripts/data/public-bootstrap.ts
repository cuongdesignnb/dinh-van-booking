/** Initial presentation copy. No catalogue, commercial or review rows live here. */
export type BootstrapMediaKey = 'hero' | 'promo' | 'partner' | 'staysHero' | 'destinationsHero' | 'combosHero' | 'bookingHero';

export type BootstrapMediaSource = {
  key: BootstrapMediaKey;
  source: string;
  alt: string;
  caption: string;
};

export const PUBLIC_BOOTSTRAP_MEDIA: readonly BootstrapMediaSource[] = [
  { key: 'hero', source: 'hero-cuc-phuong-balcony.webp', alt: 'Hiên nhà gỗ nhìn ra núi đá vôi và thung lũng trong sương sớm, ảnh minh họa Cúc Phương – Ninh Bình', caption: 'Ảnh minh họa cho trang chủ Cúc Phương Travel' },
  { key: 'promo', source: 'experience-promo.webp', alt: 'Du khách ngắm cảnh thiên nhiên bên dòng nước', caption: 'Ảnh minh họa trải nghiệm thiên nhiên' },
  { key: 'partner', source: 'pages/partner-homestay.webp', alt: 'Tranh màu nước một homestay nhà sàn gỗ giữa vườn cây', caption: 'Ảnh minh họa cho khối mời hợp tác' },
  { key: 'staysHero', source: 'pages/stays-hero.webp', alt: 'Không gian lưu trú giữa núi rừng trong ảnh minh họa', caption: 'Ảnh minh họa cho trang phòng nghỉ' },
  { key: 'destinationsHero', source: 'pages/destinations-hero.webp', alt: 'Du khách ngắm phong cảnh núi rừng Ninh Bình', caption: 'Ảnh minh họa cho trang điểm đến' },
  { key: 'combosHero', source: 'pages/combo-hero.webp', alt: 'Du khách trước phong cảnh núi rừng Cúc Phương – Ninh Bình', caption: 'Ảnh minh họa cho trang combo' },
  { key: 'bookingHero', source: 'pages/checkout-hero.webp', alt: 'Phong cảnh núi rừng và hiên nhà trong ảnh minh họa', caption: 'Ảnh minh họa cho trang đặt phòng và liên hệ' },
];

export const PUBLIC_BOOTSTRAP_MENU = [
  { label: 'Trang chủ', externalUrl: '/' },
  { label: 'Lưu trú', externalUrl: '/phong-nghi' },
  { label: 'Trải nghiệm', externalUrl: '/combo-du-lich' },
  { label: 'Cẩm nang', externalUrl: '/diem-den' },
  { label: 'Về mình', externalUrl: '/ve-minh' },
  { label: 'Dành cho đối tác', externalUrl: '/doi-tac' },
] as const;

export function paragraphDoc(text: string): object {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

export function paragraphsDoc(...texts: string[]): object {
  return { type: 'doc', content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) };
}

export function publicBootstrapSettings(media: Record<BootstrapMediaKey, string | null>): Record<string, Record<string, unknown>> {
  return {
    'brand.identity': {
      name: 'Cúc Phương Travel',
      shortName: 'Cúc Phương Travel',
      tagline: 'Lưu trú bản địa, trải nghiệm thật',
      description: paragraphDoc('Cúc Phương Travel hỗ trợ tư vấn lưu trú và hành trình khám phá Cúc Phương – Ninh Bình theo nhu cầu thực tế của từng chuyến đi.'),
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
      quoteAuthor: 'Cúc Phương Travel',
      motto: 'Du lịch gần hơn những giá trị bản địa',
      copyrightText: '© {year} Cúc Phương Travel.',
    },
    'home.sections': {
      order: ['hero', 'search', 'trust', 'featured', 'why', 'contact', 'stats', 'partner', 'reviews', 'combos', 'destinations', 'promo', 'faq'],
      hidden: ['combos', 'destinations', 'promo', 'faq'],
    },
    'home.hero': {
      enabled: true,
      kicker: 'Khám phá Cúc Phương',
      titleLine1: 'Lưu trú giữa thiên nhiên,',
      titleLine2: 'trải nghiệm những điều thật',
      signature: 'Những chuyến đi đẹp hơn khi có người bản địa đồng hành',
      description: paragraphDoc('Cúc Phương Travel giúp bạn tìm nơi lưu trú phù hợp và lên hành trình khám phá Cúc Phương – Ninh Bình, với sự tư vấn trực tiếp từ người địa phương.'),
      note: 'Cúc Phương đợi bạn...',
      imageMediaId: media.hero,
      mobileImageMediaId: null,
    },
    'home.trust': {
      enabled: true,
      items: [
        { id: 'stay', icon: 'leaf', line1: 'Lưu trú chọn lọc', line2: null, enabled: true },
        { id: 'support', icon: 'heart', line1: 'Hỗ trợ tận tâm', line2: null, enabled: true },
        { id: 'local', icon: 'users', line1: 'Trải nghiệm bản địa', line2: null, enabled: true },
        { id: 'confirm', icon: 'shield', line1: 'Xác nhận rõ ràng', line2: null, enabled: true },
      ],
    },
    'home.why': {
      enabled: true,
      title: 'Vì sao chọn Cúc Phương Travel?',
      intro: paragraphDoc('Một dịch vụ nhỏ, luôn đặt trải nghiệm của bạn lên hàng đầu.'),
      reasons: [
        { id: 'support', icon: 'message', title: 'Tư vấn cá nhân, tận tâm', description: 'Trao đổi trực tiếp để gợi ý chỗ ở phù hợp với nhu cầu và lịch trình của bạn.', enabled: true },
        { id: 'local', icon: 'leaf', title: 'Hiểu rõ địa phương', description: 'Người địa phương gợi ý điểm đến và trải nghiệm quanh Cúc Phương – Ninh Bình.', enabled: true },
        { id: 'confirm', icon: 'bolt', title: 'Xác nhận rõ ràng, minh bạch', description: 'Tình trạng phòng và giá được xác nhận trước khi bạn hoàn tất đặt phòng.', enabled: true },
        { id: 'stay', icon: 'house', title: 'Lưu trú được chọn lọc', description: 'Chỉ hiển thị những nơi lưu trú đã được cập nhật thông tin và xuất bản.', enabled: true },
      ],
    },
    'home.featured': {
      enabled: true, title: 'Lưu trú nổi bật', subtitle: 'Những chỗ ở được chọn lọc tại Cúc Phương – Ninh Bình',
      ctaLabel: 'Xem tất cả', ctaTarget: '/phong-nghi', limit: 4, selectionMode: 'featured',
    },
    'home.combos': {
      enabled: true, title: 'Combo du lịch', subtitle: 'Gợi ý hành trình và dịch vụ được cập nhật trên hệ thống',
      ctaLabel: 'Xem combo', ctaTarget: '/combo-du-lich', limit: 3,
    },
    'home.destinations': {
      enabled: true, title: 'Khám phá Cúc Phương – Ninh Bình', subtitle: 'Những điểm đến được cập nhật và xuất bản trên hệ thống',
      ctaLabel: 'Xem tất cả', ctaTarget: '/diem-den', limit: 6, selectionMode: 'featured',
    },
    'home.testimonials': { enabled: true, title: 'Khách hàng nói về chúng mình', ctaLabel: 'Xem thêm', limit: 2 },
    'home.partner': {
      enabled: true,
      title: 'Cùng nhau phát triển du lịch địa phương',
      description: paragraphDoc('Bạn là chủ homestay, bungalow hoặc nhà nghỉ tại Cúc Phương – Ninh Bình? Đăng ký cổng đối tác để giới thiệu nơi lưu trú của bạn và cập nhật thông tin phòng cùng Cúc Phương Travel.'),
      quote: 'Lưu giữ những giá trị địa phương, cùng nhau',
      primaryLabel: 'Đăng ký hợp tác',
      primaryTarget: '/doi-tac?mode=register',
      secondaryLabel: 'Tìm hiểu thêm',
      secondaryTarget: '/lien-he',
      imageMediaId: media.partner,
    },
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
      note: 'Xin chào! Mình là người địa phương, cùng bạn khám phá Cúc Phương!',
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
    // Only known facts: a small independent local service run by Đinh Vân, who checks
    // stays/itineraries herself and supports guests by phone/Zalo. No years, awards,
    // guest counts, testimonials or portrait. Personal details are left for the owner.
    'about.page': {
      enabled: true,
      heroEyebrow: 'Về mình',
      title: 'Xin chào, mình là Đinh Vân',
      intro: paragraphDoc('Người tư vấn địa phương của Cúc Phương Travel – một dịch vụ nhỏ, độc lập, giúp bạn chọn chỗ nghỉ và lên lịch trình cho chuyến đi Cúc Phương – Ninh Bình.'),
      heroImageMediaId: media.hero,
      phoneCtaLabel: 'Gọi cho Đinh Vân',
      zaloCtaLabel: 'Nhắn Zalo',
      contactCtaLabel: 'Gửi yêu cầu tư vấn',
      storyTitle: 'Câu chuyện của mình',
      greeting: 'Rất vui được làm quen với bạn!',
      story: paragraphsDoc(
        'Cúc Phương Travel là một dịch vụ nhỏ và độc lập, do mình – Đinh Vân – trực tiếp phụ trách. Mình tư vấn, hỗ trợ đặt chỗ nghỉ và gợi ý lịch trình cho những ai muốn đến Cúc Phương và các điểm quanh Ninh Bình.',
        'Trước khi giới thiệu một chỗ nghỉ hay một lịch trình, mình tự kiểm tra thông tin và chỉ gợi ý những gì phù hợp với nhu cầu của bạn. Điều gì chưa chắc chắn, mình sẽ nói rõ để bạn cân nhắc.',
        'Từ lúc bạn bắt đầu tìm hiểu cho đến khi đã tới nơi, bạn có thể gọi điện hoặc nhắn Zalo để mình hỗ trợ.',
      ),
      portraitMediaId: null,
      signatureNote: 'Hẹn gặp bạn ở Cúc Phương!',
      quote: 'Mình chỉ gợi ý những chỗ nghỉ và lịch trình mà mình đã tự kiểm tra.',
      valuesTitle: 'Điều mình luôn giữ',
      valuesIntro: 'Những nguyên tắc nhỏ để chuyến đi của bạn rõ ràng và yên tâm hơn.',
      values: [
        { id: 'checked', enabled: true, icon: 'check', title: 'Tự kiểm tra trước khi gợi ý', text: 'Mình xem kỹ thông tin chỗ nghỉ và lịch trình trước khi giới thiệu cho bạn.' },
        { id: 'personal', enabled: true, icon: 'message', title: 'Tư vấn theo nhu cầu thật', text: 'Gợi ý dựa trên thời gian, số người và mong muốn của chính bạn.' },
        { id: 'clear', enabled: true, icon: 'shield', title: 'Rõ ràng, minh bạch', text: 'Tình trạng phòng, giá và điều kiện đặt được xác nhận với bạn trước khi hoàn tất.' },
        { id: 'reachable', enabled: true, icon: 'phone', title: 'Luôn giữ liên lạc', text: 'Bạn có thể gọi điện hoặc nhắn Zalo cho mình trong suốt chuyến đi.' },
      ],
      stepsTitle: 'Cách mình đồng hành',
      stepsIntro: 'Bốn bước đơn giản, từ lúc bạn liên hệ đến khi lên đường.',
      steps: [
        { id: 'share', enabled: true, title: 'Bạn chia sẻ nhu cầu', text: 'Gọi, nhắn Zalo hoặc gửi yêu cầu: thời gian dự kiến, số người và kiểu chỗ nghỉ bạn thích.' },
        { id: 'suggest', enabled: true, title: 'Mình kiểm tra và gợi ý', text: 'Mình kiểm tra chỗ nghỉ, lịch trình phù hợp rồi gửi bạn vài lựa chọn kèm lưu ý.' },
        { id: 'confirm', enabled: true, title: 'Xác nhận rõ ràng', text: 'Tình trạng phòng, giá và điều kiện đặt được xác nhận trước khi bạn quyết định.' },
        { id: 'support', enabled: true, title: 'Hỗ trợ khi bạn tới nơi', text: 'Cần hỏi đường hay đổi kế hoạch giữa chuyến, bạn cứ gọi hoặc nhắn cho mình.' },
      ],
      areasTitle: 'Khu vực mình hỗ trợ',
      areasIntro: 'Cúc Phương và những điểm quanh Ninh Bình – nơi mình giúp bạn chọn chỗ nghỉ và lên lịch trình.',
      areas: [
        { id: 'national-park', enabled: true, icon: 'trees', title: 'Vườn quốc gia Cúc Phương', text: 'Rừng nguyên sinh, đường mòn và các điểm tham quan trong vườn quốc gia.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
        { id: 'stays', enabled: true, icon: 'house', title: 'Chỗ nghỉ quanh Cúc Phương', text: 'Homestay, nhà nghỉ, bungalow gần rừng – chọn theo nhu cầu và ngân sách của bạn.', linkLabel: 'Xem chỗ nghỉ', linkTarget: '/phong-nghi', imageMediaId: null },
        { id: 'ninh-binh', enabled: true, icon: 'mountain', title: 'Các điểm quanh Ninh Bình', text: 'Gợi ý kết hợp Cúc Phương với những điểm tham quan khác trong tỉnh Ninh Bình.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
      ],
      showFaq: true,
      faqTitle: 'Bạn có thể đang thắc mắc',
      faqs: [
        { id: 'who', enabled: true, question: 'Cúc Phương Travel là công ty du lịch lớn phải không?', answer: paragraphDoc('Không. Cúc Phương Travel là một dịch vụ nhỏ, độc lập, do Đinh Vân trực tiếp tư vấn và hỗ trợ khách.') },
        { id: 'checked', enabled: true, question: 'Chỗ nghỉ có được kiểm tra trước khi gợi ý không?', answer: paragraphDoc('Có. Đinh Vân tự kiểm tra thông tin chỗ nghỉ và lịch trình trước khi gợi ý; tình trạng phòng và giá được xác nhận với bạn trước khi đặt.') },
        { id: 'contact', enabled: true, question: 'Làm sao để liên hệ với Đinh Vân?', answer: paragraphDoc('Bạn có thể gọi theo số điện thoại trên trang này, nhắn Zalo hoặc gửi yêu cầu ở trang Liên hệ.') },
      ],
      ctaTitle: 'Bắt đầu chuyến đi Cúc Phương của bạn',
      ctaText: paragraphDoc('Kể cho mình nghe bạn định đi khi nào, đi mấy người – mình sẽ gợi ý chỗ nghỉ và lịch trình phù hợp.'),
      ctaStaysLabel: 'Xem chỗ nghỉ',
      areaServed: 'Cúc Phương, Ninh Bình',
      seoTitle: 'Về mình – Đinh Vân',
      seoDescription: 'Đinh Vân – người tư vấn địa phương của Cúc Phương Travel, tự kiểm tra và gợi ý chỗ nghỉ, lịch trình Cúc Phương – Ninh Bình, hỗ trợ bạn qua điện thoại, Zalo.',
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
      emptyResultTitle: 'Chỗ nghỉ đang được cập nhật',
      emptyResultDescription: paragraphDoc('Nội dung đang được cập nhật. Bạn có thể liên hệ Đinh Vân để được hỗ trợ.'),
      emptyResultCtaLabel: 'Liên hệ tư vấn',
    },
    'catalog.destinationsPage': {
      heroKicker: 'Khám phá theo cách của bạn',
      heroTitle: 'Điểm đến Cúc Phương – Ninh Bình',
      heroDescription: paragraphDoc('Gợi ý những điểm đến được cập nhật trên hệ thống cho hành trình gần thiên nhiên.'),
      heroImageMediaId: media.destinationsHero,
      listTitle: 'Khám phá điểm đến',
      listSubtitle: paragraphDoc('Tìm cảm hứng cho chuyến đi theo cách của riêng bạn.'),
      advisorCtaLabel: 'Liên hệ tư vấn',
      emptyTitle: 'Điểm đến đang được cập nhật',
      emptyDescription: paragraphDoc('Đinh Vân đang cập nhật nội dung. Bạn có thể gọi để được gợi ý trước khi lên đường.'),
    },
    'catalog.combosPage': {
      heroTitle: 'Combo du lịch Cúc Phương',
      heroKicker: 'Chọn hành trình phù hợp',
      heroDescription: paragraphDoc('Thông tin combo sẽ được cập nhật sau khi các dịch vụ và điều kiện được xác nhận.'),
      heroImageMediaId: media.combosHero,
      listTitle: 'Combo du lịch',
      listSubtitle: paragraphDoc('Chọn nhịp điệu phù hợp cho chuyến đi của bạn.'),
      advisorCtaLabel: 'Liên hệ tư vấn',
      emptyTitle: 'Combo du lịch đang được chuẩn bị',
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
      description: paragraphDoc('Những thông tin hữu ích để chuẩn bị chuyến đi thuận tiện hơn.'),
    },
    'catalog.articlesPage': {
      eyebrow: 'Cẩm nang Cúc Phương',
      title: 'Bài viết',
      description: paragraphDoc('Góc đọc dành cho những ai yêu hành trình khám phá Cúc Phương – Ninh Bình.'),
    },
    'seo.defaults': {
      defaultTitle: 'Cúc Phương Travel — Cúc Phương, Ninh Bình',
      defaultDescription: 'Tư vấn lưu trú và hành trình khám phá Cúc Phương – Ninh Bình cùng Cúc Phương Travel.',
      canonicalBase: null,
      robotsIndex: false,
    },
    'seo.pages': {
      home: { title: 'Cúc Phương Travel — Cúc Phương, Ninh Bình', description: 'Tư vấn lưu trú và hành trình Cúc Phương – Ninh Bình theo nhu cầu của bạn.' },
      stays: { title: 'Phòng nghỉ Cúc Phương', description: 'Xem nơi lưu trú đã được xuất bản hoặc liên hệ Đinh Vân để được tư vấn.' },
      destinations: { title: 'Điểm đến Cúc Phương – Ninh Bình', description: 'Khám phá điểm đến được cập nhật cho hành trình Cúc Phương – Ninh Bình.' },
      combos: { title: 'Combo du lịch Cúc Phương', description: 'Theo dõi các combo du lịch khi thông tin dịch vụ đã được xác nhận và xuất bản.' },
      contact: { title: 'Liên hệ Cúc Phương Travel', description: 'Gọi 0974045828 hoặc gửi yêu cầu để Đinh Vân hỗ trợ chuyến đi Cúc Phương – Ninh Bình.' },
      booking: { title: 'Đặt phòng Cúc Phương', description: 'Tìm nơi lưu trú phù hợp hoặc liên hệ Đinh Vân để được hỗ trợ đặt phòng.' },
      articles: { title: 'Bài viết Cúc Phương – Ninh Bình', description: 'Bài viết và kinh nghiệm khám phá được cập nhật trên Cúc Phương Travel.' },
      staticPages: { title: 'Thông tin Cúc Phương Travel', description: 'Chính sách và hướng dẫn được cập nhật trên Cúc Phương Travel.' },
    },
  };
}
