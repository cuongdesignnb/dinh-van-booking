/**
 * Starting copy for /ve-minh, matching the owner's mockup and written in the
 * voice of someone born and raised in Cúc Phương. It only fills the Admin
 * form; nothing is saved until the owner reviews it and presses Lưu. Facts
 * the owner must confirm (support hours) are deliberately left empty.
 */
const doc = (...paragraphs: string[]) => ({
  type: 'doc',
  content: paragraphs.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});

export const ABOUT_SAMPLE: Record<string, unknown> = {
  title: 'Đinh Vân – Người kể chuyện du lịch Cúc Phương',
  intro: doc('Mình là Đinh Vân, người con sinh ra và lớn lên ở Cúc Phương, người sáng lập Cúc Phương Travel. Mình yêu những cánh rừng xanh của quê mình và mong muốn giúp bạn tìm được nơi lưu trú phù hợp cùng những trải nghiệm đáng nhớ khi về với vùng đất này.'),
  primaryCtaLabel: 'Khám phá phòng nghỉ',
  primaryCtaTarget: '/phong-nghi',
  contactCtaLabel: 'Liên hệ tư vấn',
  heroScript: 'Cúc Phương luôn có những câu chuyện đẹp để kể…',
  heroNote: 'Đi để cảm nhận, ở lại để tìm những điều bình dị mà thật đẹp.',
  highlights: [
    { id: 'highlight-1', enabled: true, icon: 'heart', title: 'Tư vấn tận tâm', text: 'Luôn lắng nghe nhu cầu của bạn' },
    { id: 'highlight-2', enabled: true, icon: 'leaf', title: 'Người bản địa', text: 'Hiểu từng cung đường, bản làng' },
    { id: 'highlight-3', enabled: true, icon: 'zap', title: 'Hỗ trợ nhanh', text: 'Trả lời trực tiếp qua điện thoại, Zalo' },
  ],
  storyEyebrow: 'Về mình',
  storyTitle: 'Câu chuyện của mình',
  story: doc(
    'Mình sinh ra và lớn lên ở vùng đệm Vườn quốc gia Cúc Phương. Tuổi thơ của mình gắn với những cánh rừng xanh, tiếng chim hót mỗi sáng, những con đường mòn rợp bóng cây và sự chân chất, thân thiện của bà con trong bản. Với mình, Cúc Phương không chỉ là một điểm đến, mà là nhà.',
    'Cúc Phương Travel ra đời từ mong muốn giới thiệu quê hương mình đến nhiều người hơn. Mình kết nối bạn với các homestay, khu nghỉ mà mình biết rõ, đồng thời chia sẻ những trải nghiệm địa phương chân thật và ý nghĩa mà người ở đây lâu mới hiểu hết.',
    'Với mình, mỗi vị khách về Cúc Phương như một người bạn ghé thăm nhà. Mình mong bạn được sống chậm lại, cảm nhận thiên nhiên và mang về những kỷ niệm thật đẹp cùng những người thân yêu.',
  ),
  storyPhotos: [
    { id: 'photo-1', enabled: true, imageMediaId: null, caption: 'Một Cúc Phương rất khác, rất gần…' },
    { id: 'photo-2', enabled: true, imageMediaId: null, caption: 'Rừng quê mình – nguồn cảm hứng lớn nhất của mình.' },
  ],
  valuesEyebrow: 'Giá trị cốt lõi',
  valuesTitle: 'Giá trị mình theo đuổi',
  valuesIntro: 'Những giá trị này là kim chỉ nam trong mọi tư vấn và trải nghiệm mình mang đến cho bạn tại Cúc Phương Travel.',
  values: [
    { id: 'value-1', enabled: true, icon: 'leaf', title: 'Chân thật', text: 'Chia sẻ thông tin chính xác, trải nghiệm thực tế, không tô vẽ. Chỉ giới thiệu những gì mình thực sự tin tưởng và đã tận mắt kiểm tra.' },
    { id: 'value-2', enabled: true, icon: 'heart', title: 'Tận tâm', text: 'Luôn lắng nghe, thấu hiểu nhu cầu của bạn để tư vấn nơi lưu trú và lịch trình phù hợp nhất, dù là chuyến đi ngắn ngày hay dài ngày.' },
    { id: 'value-3', enabled: true, icon: 'users', title: 'Trải nghiệm phù hợp', text: 'Mỗi du khách đều có một cách đi riêng. Mình gợi ý những trải nghiệm hợp với sở thích, thời gian và ngân sách của bạn.' },
  ],
  servicesTitle: 'Mình có thể hỗ trợ bạn điều gì?',
  servicesIntro: 'Từ đặt phòng đến trải nghiệm, mình luôn đồng hành để chuyến đi của bạn trở nên dễ dàng và trọn vẹn hơn.',
  services: [
    { id: 'service-1', enabled: true, icon: 'bed', title: 'Tư vấn phòng nghỉ', text: 'Giới thiệu các homestay, nhà nghỉ, khu nghỉ dưỡng chất lượng, phù hợp với nhu cầu và ngân sách của bạn.', linkTarget: '/phong-nghi' },
    { id: 'service-2', enabled: true, icon: 'pin', title: 'Gợi ý lịch trình', text: 'Tư vấn lịch trình tham quan Cúc Phương và các điểm đến lân cận hợp lý, tiết kiệm thời gian.', linkTarget: '/diem-den' },
    { id: 'service-3', enabled: true, icon: 'leaf', title: 'Kết nối trải nghiệm địa phương', text: 'Giới thiệu các hoạt động như đi bộ trong rừng, khám phá hang động và trải nghiệm văn hóa của bà con bản địa.', linkTarget: '/combo-du-lich' },
    { id: 'service-4', enabled: true, icon: 'gear', title: 'Hỗ trợ đặt dịch vụ', text: 'Hỗ trợ đặt phòng và kết nối các dịch vụ khác theo yêu cầu của bạn trong chuyến đi.', linkTarget: '/lien-he' },
  ],
  showFaq: true,
  faqTitle: 'Câu hỏi thường gặp',
  faqIntro: 'Một số thắc mắc phổ biến mà mình thường nhận được.',
  faqs: [
    { id: 'faq-1', enabled: true, question: 'Cúc Phương Travel hỗ trợ những gì?', answer: doc('Mình tư vấn và hỗ trợ đặt phòng nghỉ quanh Cúc Phương, gợi ý lịch trình tham quan và kết nối những trải nghiệm địa phương phù hợp với chuyến đi của bạn.') },
    { id: 'faq-2', enabled: true, question: 'Làm sao để gửi yêu cầu booking?', answer: doc('Bạn có thể nhắn mình qua khung chat trên website, Zalo hoặc gửi yêu cầu tư vấn. Mình kiểm tra phòng trống, xác nhận giá và điều kiện với bạn trước khi hoàn tất đặt chỗ.') },
    { id: 'faq-3', enabled: true, question: 'Có thể tư vấn theo nhóm/gia đình không?', answer: doc('Có. Bạn cho mình biết số người, độ tuổi và sở thích của cả nhóm, mình sẽ gợi ý chỗ nghỉ và lịch trình phù hợp cho gia đình có trẻ nhỏ, người lớn tuổi hay nhóm bạn.') },
    { id: 'faq-4', enabled: true, question: 'Thời gian phản hồi của bạn là bao lâu?', answer: doc('Mình trả lời trực tiếp qua điện thoại, Zalo và khung chat trên website. Tin nhắn ngoài giờ hỗ trợ sẽ được mình phản hồi sớm nhất có thể.') },
  ],
  contactEyebrow: 'Liên hệ với mình',
  contactTitle: 'Rất vui được đồng hành cùng bạn tại Cúc Phương!',
  contactText: 'Nếu bạn có bất kỳ thắc mắc nào hoặc cần tư vấn lịch trình, đừng ngại liên hệ với mình nhé. Mình luôn sẵn sàng hỗ trợ!',
  contactZaloLabel: 'Nhắn Zalo',
  contactNote: null,
  seoTitle: 'Về Đinh Vân – người bản địa Cúc Phương',
  seoDescription: 'Đinh Vân, người con sinh ra và lớn lên ở Cúc Phương, tư vấn đặt phòng, gợi ý lịch trình và trải nghiệm địa phương chân thật cho chuyến đi Cúc Phương Ninh Bình.',
  ogDescription: 'Người bản địa Cúc Phương tư vấn chỗ nghỉ, lịch trình và trải nghiệm địa phương chân thật.',
};
