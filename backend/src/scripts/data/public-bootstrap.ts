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
    // Only known facts about Đinh Vân and the business: a local advisor running a small,
    // independent booking/consulting service who checks stays herself, gives itinerary
    // advice and supports guests by phone/Zalo; a booking is an inquiry that gets
    // confirmed. No years, counts, awards, education, testimonials or portrait.
    // Area facts are well-established public facts only, numbers kept approximate.
    'about.page': {
      enabled: true,
      heroEyebrow: 'Về mình · Người bản địa Cúc Phương',
      title: 'Đặt phòng Cúc Phương cùng Đinh Vân',
      intro: paragraphDoc('Mình là Đinh Vân, người bản địa Cúc Phương và là người trực tiếp tư vấn tại Cúc Phương Travel – một dịch vụ nhỏ, độc lập chuyên hỗ trợ đặt phòng Cúc Phương và lên lịch trình quanh Ninh Bình. Mình tự kiểm tra chỗ nghỉ trước khi gợi ý, giúp bạn chọn homestay Cúc Phương hợp với nhu cầu và hỗ trợ bạn qua điện thoại hoặc Zalo, từ lúc còn đang tìm hiểu cho đến khi đã tới nơi.'),
      heroImageMediaId: media.hero,
      phoneCtaLabel: 'Gọi cho Đinh Vân',
      zaloCtaLabel: 'Nhắn Zalo',
      contactCtaLabel: 'Gửi yêu cầu tư vấn',
      storyTitle: 'Vì sao mình làm tư vấn du lịch Cúc Phương',
      greeting: 'Rất vui được làm quen với bạn!',
      story: paragraphsDoc(
        'Với mình, Cúc Phương không chỉ là một cái tên trên bản đồ du lịch. Đây là vùng đất mình gắn bó, nơi có khu rừng nguyên sinh được bảo vệ từ năm 1962, có những con đường, bản làng và mùa mưa nắng mà người ở xa khó hình dung hết khi chỉ xem ảnh trên mạng. Mỗi lần có người hỏi nên ở đâu, đi thế nào, mình đều mong họ có một chuyến đi nhẹ nhàng và đúng như mong đợi.',
        'Cúc Phương Travel là một dịch vụ nhỏ và độc lập do chính mình phụ trách, không phải một công ty lữ hành lớn. Người nghe điện thoại, đọc tin nhắn Zalo và trả lời từng câu hỏi của bạn cũng là mình. Nhờ vậy, mình có thể tư vấn đặt phòng Cúc Phương sát với nhu cầu thật của từng chuyến đi: gia đình có trẻ nhỏ, nhóm bạn thích khám phá hay người chỉ muốn tìm một homestay yên tĩnh giữa núi rừng.',
        'Trước khi giới thiệu một chỗ nghỉ, mình tự kiểm tra thông tin: phòng ra sao, đường vào thế nào, có hợp với người lớn tuổi hay trẻ nhỏ không. Với lịch trình cũng vậy, mình gợi ý dựa trên thời gian, sức khỏe và sở thích của bạn chứ không theo một khuôn có sẵn. Điều gì chưa chắc chắn, mình nói rõ để bạn cân nhắc. Đặt phòng qua mình bắt đầu bằng một yêu cầu tư vấn: mình kiểm tra phòng trống, xác nhận giá và điều kiện, bạn đồng ý rồi mới hoàn tất.',
        'Mình mong mỗi người rời Cúc Phương với cảm giác như vừa ghé nhà một người bạn bản địa: được dặn dò kỹ, được hỏi han khi cần và có thêm lý do để quay lại. Nếu bạn đang chuẩn bị cho chuyến lưu trú Cúc Phương Ninh Bình, cứ gọi hoặc nhắn Zalo cho mình, mình sẵn lòng cùng bạn lên kế hoạch.',
      ),
      portraitMediaId: null,
      signatureNote: 'Hẹn gặp bạn ở Cúc Phương!',
      quote: 'Mình chỉ gợi ý những gì chính mình đã kiểm tra, để bạn yên tâm lên đường.',
      valuesTitle: 'Điều mình luôn giữ',
      valuesIntro: 'Bốn nguyên tắc để việc đặt phòng Cúc Phương của bạn rõ ràng và yên tâm.',
      values: [
        { id: 'checked', enabled: true, icon: 'check', title: 'Tự kiểm tra trước khi gợi ý', text: 'Mình chỉ giới thiệu chỗ nghỉ và lịch trình sau khi đã tự kiểm tra thông tin. Điều gì chưa chắc chắn, mình nói rõ ngay từ đầu để bạn có đủ dữ kiện cân nhắc.' },
        { id: 'personal', enabled: true, icon: 'message', title: 'Tư vấn theo nhu cầu thật', text: 'Mỗi chuyến đi một khác: đi cùng trẻ nhỏ, người lớn tuổi hay nhóm bạn. Mình hỏi kỹ thời gian, số người và mong muốn của bạn rồi mới gợi ý homestay Cúc Phương phù hợp.' },
        { id: 'clear', enabled: true, icon: 'shield', title: 'Rõ ràng trước khi thanh toán', text: 'Đặt phòng qua mình là một yêu cầu tư vấn. Tình trạng phòng, giá và điều kiện đặt đều được xác nhận với bạn trước, bạn đồng ý rồi mới tiến hành thanh toán.' },
        { id: 'reachable', enabled: true, icon: 'phone', title: 'Giữ liên lạc suốt chuyến đi', text: 'Từ lúc bạn còn phân vân đến khi đã tới Cúc Phương, bạn có thể gọi điện hoặc nhắn Zalo cho mình để hỏi đường, đổi kế hoạch hay cần thêm gợi ý.' },
      ],
      stepsTitle: 'Cách mình đồng hành',
      stepsIntro: 'Bốn bước đơn giản, từ lúc bạn nhắn tin cho mình đến khi đã tới nơi.',
      steps: [
        { id: 'share', enabled: true, title: 'Bạn chia sẻ nhu cầu', text: 'Gọi điện, nhắn Zalo hoặc gửi yêu cầu tư vấn: thời gian dự kiến, số người, ngân sách và kiểu chỗ nghỉ bạn thích.' },
        { id: 'suggest', enabled: true, title: 'Mình kiểm tra và gợi ý', text: 'Mình kiểm tra phòng trống, chọn vài chỗ nghỉ và lịch trình phù hợp rồi gửi bạn kèm những lưu ý cần biết.' },
        { id: 'confirm', enabled: true, title: 'Xác nhận trước khi thanh toán', text: 'Giá, tình trạng phòng và điều kiện đặt được xác nhận rõ với bạn. Bạn đồng ý rồi mới thanh toán và hoàn tất.' },
        { id: 'support', enabled: true, title: 'Đồng hành khi bạn tới nơi', text: 'Cần hỏi đường, đổi kế hoạch hay muốn gợi ý thêm điểm tham quan giữa chuyến, bạn cứ gọi hoặc nhắn Zalo cho mình.' },
      ],
      areasTitle: 'Hiểu Cúc Phương như người nhà',
      areasIntro: 'Vài điều mình hay kể cho khách trước chuyến đi, để bạn hiểu nơi mình sắp đến và chọn chỗ lưu trú Cúc Phương Ninh Bình cho hợp.',
      areas: [
        { id: 'national-park', enabled: true, icon: 'trees', title: 'Vườn quốc gia đầu tiên của Việt Nam', text: 'Cúc Phương được thành lập năm 1962, là vườn quốc gia đầu tiên của Việt Nam. Khu rừng rộng khoảng 22.000 ha, trải trên ba tỉnh Ninh Bình, Hòa Bình và Thanh Hóa (theo địa giới cũ).', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
        { id: 'primary-forest', enabled: true, icon: 'mountain', title: 'Rừng nguyên sinh và cây chò ngàn năm', text: 'Những đường mòn dưới tán rừng nguyên sinh dẫn tới cây chò ngàn năm, một hình ảnh quen thuộc của Cúc Phương. Mình sẽ nhắc bạn chuẩn bị giày, nước uống và chọn giờ đi phù hợp.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
        { id: 'cave-primates', enabled: true, icon: 'map', title: 'Động Người Xưa và Trung tâm cứu hộ linh trưởng', text: 'Động Người Xưa lưu giữ dấu tích của người tiền sử. Trong vườn còn có Trung tâm Cứu hộ Linh trưởng Nguy cấp, nơi cứu hộ và chăm sóc các loài voọc, vượn quý hiếm.', linkLabel: 'Xem điểm đến', linkTarget: '/diem-den', imageMediaId: null },
        { id: 'stays', enabled: true, icon: 'house', title: 'Homestay và chỗ nghỉ quanh rừng', text: 'Từ homestay, nhà nghỉ đến bungalow gần rừng, mình giúp bạn chọn chỗ lưu trú Cúc Phương hợp với lịch trình, số người và ngân sách.', linkLabel: 'Xem chỗ nghỉ', linkTarget: '/phong-nghi', imageMediaId: null },
      ],
      showFaq: true,
      faqTitle: 'Câu hỏi khách hay hỏi mình',
      faqs: [
        { id: 'season', enabled: true, question: 'Đi Cúc Phương mùa nào đẹp nhất?', answer: paragraphDoc('Mỗi mùa Cúc Phương có nét riêng. Khoảng tháng 4–5 là mùa bướm, rừng rất sinh động. Mùa khô, từ cuối thu sang xuân, đường mòn khô ráo và dễ đi bộ hơn. Mùa mưa giữa năm cây cối xanh tốt nhưng đường trơn, có thể có vắt, nên bạn cần chuẩn bị kỹ. Bạn cho mình biết thời gian dự kiến, mình sẽ tư vấn cụ thể hơn.') },
        { id: 'from-hanoi', enabled: true, question: 'Từ Hà Nội đi Cúc Phương bằng cách nào?', answer: paragraphDoc('Bạn có thể tự lái xe, thuê xe riêng hoặc đi xe khách về Ninh Bình rồi nối chuyến vào Cúc Phương. Mình không ghi giờ xe cố định ở đây vì lịch có thể thay đổi; khi bạn liên hệ, mình sẽ gợi ý cách đi hợp với số người và lịch trình của bạn.') },
        { id: 'packing', enabled: true, question: 'Nên mang theo gì khi đến Cúc Phương?', answer: paragraphDoc('Giày đi bộ bám đường, quần áo dài tay, áo mưa mỏng, kem chống côn trùng, nước uống và đèn pin nếu bạn muốn vào hang động. Mùa đông nên mang thêm áo ấm vì sáng sớm và buổi tối trong rừng khá lạnh. Mình sẽ dặn thêm theo lịch trình cụ thể của bạn.') },
        { id: 'inquiry', enabled: true, question: 'Gửi yêu cầu đặt phòng xong thì điều gì xảy ra?', answer: paragraphDoc('Yêu cầu của bạn là một lời nhờ tư vấn, chưa phải đơn đặt chắc chắn. Mình kiểm tra phòng trống, chọn lựa chọn phù hợp rồi liên hệ lại qua điện thoại hoặc Zalo. Khi bạn đồng ý với thông tin đã được xác nhận, việc đặt chỗ mới hoàn tất.') },
        { id: 'confirmed', enabled: true, question: 'Giá và tình trạng phòng có được xác nhận trước khi thanh toán không?', answer: paragraphDoc('Có. Trước khi bạn thanh toán, mình xác nhận rõ tình trạng phòng, giá và điều kiện đặt như quy định nhận, trả hay hủy phòng. Bạn chỉ thanh toán khi đã đồng ý với các thông tin đó.') },
        { id: 'itinerary', enabled: true, question: 'Có thể nhờ tư vấn lịch trình tham quan không?', answer: paragraphDoc('Có. Dựa trên số ngày, số người và sở thích của bạn, mình gợi ý lịch trình kết hợp Cúc Phương với các điểm khác quanh Ninh Bình, kèm lưu ý về đường đi và thời điểm tham quan phù hợp.') },
      ],
      ctaTitle: 'Sẵn sàng cho chuyến đi Cúc Phương?',
      ctaText: paragraphDoc('Kể cho mình nghe bạn định đi khi nào, đi mấy người và thích kiểu chỗ nghỉ nào. Mình sẽ kiểm tra và gợi ý homestay, lịch trình Cúc Phương phù hợp với bạn.'),
      ctaStaysLabel: 'Xem chỗ nghỉ',
      areaServed: 'Cúc Phương, Ninh Bình',
      seoTitle: 'Đặt phòng Cúc Phương cùng Đinh Vân',
      seoDescription: 'Đinh Vân, người bản địa tư vấn đặt phòng Cúc Phương: tự kiểm tra homestay, gợi ý lịch trình lưu trú Cúc Phương Ninh Bình, xác nhận giá trước khi thanh toán.',
      ogDescription: 'Người bản địa tự kiểm tra chỗ nghỉ, gợi ý lịch trình và hỗ trợ bạn đặt phòng Cúc Phương qua điện thoại, Zalo.',
      ogImageMediaId: null,
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
