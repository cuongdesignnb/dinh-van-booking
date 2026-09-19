# MÀN HÌNH 05 — LIÊN HỆ / TƯ VẤN RIÊNG

> **Agent Opus:** lập trình `/lien-he` theo ảnh; đọc `00_QUY_CHUAN_CHUNG.md` trước. Trọng tâm là người tư vấn cá nhân, không phải trung tâm hỗ trợ của một tập đoàn. Giữ ba font, logo núi và icon SVG, xanh–kem, chân dung minh họa cùng tone.

![Màn hình liên hệ](./references/05-lien-he.png)

## 1. Cấu trúc desktop

```text
HEADER — LIÊN HỆ ACTIVE
HERO: XIN CHÀO / HEADLINE / 3 CAM KẾT       PORTRAIT / HIÊN GỖ
FORM TƯ VẤN         LIÊN HỆ NHANH         4 CAM KẾT
FORM TIẾP           PROFILE CÁ NHÂN       MAP / VỊ TRÍ
FAQ                 SOCIAL + LỜI NHẮN     SCENIC CTA
FOOTER
```

Hero khoảng 245–260 px sau header, nội dung chính ba cột. Khởi tạo `1.35fr .95fr 1.25fr`, gap 14–18 px, lề 36 px. Cột form khoảng 510 px, profile khoảng 355 px, map khoảng 480 px tại viewport chuẩn. Đo lại PNG để chỉnh. Bố cục này khác trang checkout hai cột, không dùng chung nguyên layout.

Card nền trắng ngà/kem rất nhẹ; tiêu đề serif rõ; form có khoảng cách đủ thao tác nhưng không đẩy cả trang thành landing page dài. Lower row tiếp nối ba cột chính.

## 2. Hero cá nhân

Copy:

```text
Xin chào!
Rất vui được lắng nghe
kế hoạch của bạn!

Hãy chia sẻ mong muốn của bạn, Đinh Vân sẽ tư vấn tận tình
để giúp bạn có một chuyến đi Cúc Phương – Ninh Bình thật trọn vẹn.
```

“Xin chào!” script, H1 hai dòng serif trắng. Ba feature dưới: Tư vấn chân thành / Gợi ý phù hợp nhu cầu và ngân sách / Đồng hành trước – trong – sau chuyến đi. Icon trong vòng tròn kem, text trắng gọn.

Bên phải là portrait minh họa đội mũ/đồ outdoor, hiên gỗ, núi phía sau; giữ tỷ lệ người và không để đầu chạm header. Lời nhắn script “Những chuyến đi đẹp bắt đầu từ những cuộc trò chuyện chân thành.” và chữ ký. Không tự thay bằng ảnh người thật trên mạng gán tên Đinh Vân.

## 3. Form tư vấn — cột trái

Heading “Gửi yêu cầu tư vấn riêng”, subtitle “Chia sẻ với Đinh Vân kế hoạch của bạn, mình sẽ phản hồi sớm nhất!”. Form không có email bắt buộc vì ảnh không có; không tự thêm nhiều trường.

| Trường | Quy định UI |
|---|---|
| Họ và tên | Bắt buộc, text, `autocomplete=name`, trim nhưng không phá dấu/khoảng cách trong tên |
| Số điện thoại | Bắt buộc, `type=tel`, inputMode phù hợp, cho phép định dạng có khoảng trắng/+ |
| Ngày nhận phòng dự kiến | Không bắt buộc; date picker, không nhận ngày đã qua theo clock ứng dụng |
| Số khách dự kiến | Không bắt buộc; guest picker chung, không số âm/NaN |
| Nhu cầu hoặc lời nhắn | Textarea, tối đa 500 ký tự hiển thị, counter góc dưới; không log nội dung |

Hai trường mỗi hàng đầu, textarea full width. Field trắng, viền xám nhạt, bo 7–8 px, icon xanh bên trái, label ngoài input. Mẫu placeholder tên “Ví dụ: Nguyễn Văn A”; số điện thoại dùng “Ví dụ: 09xx xxx xxx” để không vô tình quảng bá số thật chưa xác nhận.

Validate khi blur/submit, không báo đỏ mọi ô ngay khi mở trang. Tên cho phép dấu, nhiều từ, tên quốc tế, không dùng regex chỉ A–Z. Phone normalize ký tự phân cách, kiểm tra hình thức hợp lý; không khẳng định chủ sở hữu/số hoạt động, không hardcode danh sách đầu số chưa được duyệt. Nếu không phân loại được, cho thông báo dễ hiểu thay vì từ chối tùy tiện.

Thông báo mẫu: “Vui lòng nhập họ và tên”, “Vui lòng kiểm tra số điện thoại”, “Ngày dự kiến không hợp lệ”, “Lời nhắn tối đa 500 ký tự”. Error liên kết bằng `aria-describedby`, input `aria-invalid`; summary khi submit lỗi đưa focus tới trường đầu. Counter không cần đọc lại với screen reader mỗi phím nếu gây ồn.

CTA full width xanh, icon send, text **“Gửi yêu cầu tư vấn ngay”**; đang xử lý dùng text rõ nghĩa và ngăn double submit. Dòng riêng tư dưới nút lấy từ config/copy đã duyệt; không tự thêm lời bảo đảm pháp lý hoặc bảo mật tuyệt đối.

## 4. Ngữ cảnh từ các màn khác

Đọc `intent` và `item` hợp lệ từ query: stay/combo/destination. Dùng ID tra fixture; không render trực tiếp HTML từ query. Hiện chip nhỏ trên form như “Tư vấn: Khám phá rừng Cúc Phương” có nút bỏ, hoặc nhãn context trong vùng lời nhắn; không thêm banner cao làm lệch layout.

Ngày/khách nhận từ selection nếu có; không ghi đè nội dung khách đang gõ khi re-render. Context không hợp lệ thì bỏ và vẫn cho nhập form. Không đưa tên, phone, ghi chú vào URL để giữ context.

## 5. Hành vi gửi khi chưa có backend

Trong nhiệm vụ này, form phải validate và phản hồi thật ở frontend, **nhưng không được giả gửi thành công**.

```text
idle → editing → validating
invalid → errors (giữ dữ liệu)
valid + demo adapter → preview (chưa gửi)
```

Bản preview/dialog sau khi thông tin hợp lệ hiển thị:

```text
Thông tin tư vấn của bạn đã được kiểm tra tại giao diện.
Đây là bản xem trước; yêu cầu chưa được gửi đến Đinh Vân.
```

Có tóm tắt có thể sửa, nút quay lại, sao chép nội dung sau hành động người dùng, và liên hệ thật chỉ khi config hợp lệ. Không toast “Đã gửi thành công”, không fake mã yêu cầu, không tự clear form khiến người dùng tưởng đã gửi.

Tách adapter để sau này nối API; trạng thái loading/error có thể kiểm thử bằng adapter fixture xác định, không random. Chỉ khi có API được giao riêng, phản hồi thành công đã xác nhận mới được chuyển sang `submitted`. Không tự tạo endpoint gửi email hoặc dùng dịch vụ form ngoài.

PII chỉ ở memory trong flow, không localStorage/sessionStorage, analytics, console hoặc query string. Không tạo file tải về chứa PII tự động. Copy clipboard phải qua click chủ động và báo trạng thái thực tế.

## 6. Liên hệ nhanh và profile — cột giữa

Khối đầu: heading “Liên hệ nhanh với Đinh Vân”, hai card CTA cạnh nhau. Gọi ngay nền xanh, icon phone trắng; Zalo nền trắng, logo thương hiệu hợp lệ màu xanh. Nếu số/URL chưa có, giữ nhãn “Thông tin đang cập nhật” và mở fallback dialog khi bấm; không tạo liên kết tới số 0901/0912 trong ảnh.

Profile card bên dưới: ảnh vuông bên trái đoạn giới thiệu, tên **Đinh Vân** serif, dòng phụ “Người tư vấn & bạn đồng hành”, quote ngắn, bốn dòng icon về địa phương, tư vấn, đồng hành, trải nghiệm. Chữ ký script ở đáy, nền silhouette nhạt.

Không mặc định advisor là chủ sở hữu các homestay. Copy “Chủ nhà”/“Hơn 1.000+ du khách” trong ảnh phải được chủ website xác nhận; dùng mô tả trung tính hoặc giữ trong fixture có cờ chưa duyệt, không công bố thành tích giả. Portrait chỉ là minh họa, không phải nhận diện thật.

## 7. Cam kết và map — cột phải

Cam kết card: bốn icon lớn trong vòng tròn kem, nhãn 2–3 dòng, heading “Cam kết từ Đinh Vân Booking”. Các ý: Phản hồi nhanh / Tư vấn phù hợp / Chi phí rõ ràng / Đồng hành chuyến đi. Mốc “30 phút”, “không phát sinh chi phí ẩn” trong ảnh không tự thành SLA vận hành.

Map card: heading “Chúng tôi ở đây”, location label chung “Cúc Phương – Ninh Bình”, link chỉ đường, map xanh nhạt, pin tên thương hiệu, note script. Địa chỉ cụ thể/đơn vị hành chính trong ảnh chưa phải địa chỉ xác minh hiện tại; để config quản lý, không tự chốt từ mockup.

Nếu chỉ có map illustration: label nhỏ “Bản đồ minh họa”, nút mở bản lớn nội bộ; không chèn tọa độ đoán vào map provider. Khi có location URL đã duyệt, chỉ đường mở tab mới an toàn. Không xin vị trí của khách.

## 8. FAQ, social và scenic CTA

Dưới form: ba accordion FAQ về giờ nhận/trả, hỗ trợ tour, gia đình có trẻ nhỏ; Xem tất cả mở thêm câu trong dialog hoặc mở rộng vùng thật. Câu trả lời định hướng tư vấn, không áp chính sách một chỗ nghỉ cho tất cả.

Dưới profile: “Kết nối cùng Đinh Vân Booking”, social SVG Facebook/Instagram/YouTube/TikTok/website, câu viết tay bên dưới. Mỗi link chỉ hoạt động với URL config đã xác minh; không tự trỏ về homepage của mạng xã hội như thể đó là tài khoản thương hiệu.

Dưới map: ảnh scenic thấp, script trắng trên gradient đủ tối, CTA “Tư vấn riêng ngay” cuộn/focus form. Dùng `scroll-margin-top` nếu header sticky; không reload trang làm mất dữ liệu đang nhập.

## 9. Responsive, component và kiểm thử

Tablet: form rộng một cột trái, contact/profile phải; map/FAQ/social xuống dưới theo nhóm. Mobile: hero → quick contact → form → profile → cam kết → map → FAQ/social/scenic CTA. H1 không đè portrait; có thể crop portrait về bên phải hoặc giảm trang trí. Form input cao tối thiểu 44 px theo tiêu chí dự án, textarea đủ cao để nhập, bàn phím không che submit.

Component: `ContactHero`, `ConsultationForm`, `ConsultationPreviewDialog`, `QuickContactCards`, `AdvisorProfile`, `ServicePromises`, `ContactMap`, `ContactFaq`, `SocialLinks`, `ScenicContactCta`.

Test tối thiểu: form trống; tên có dấu; phone có khoảng trắng/+; ngày quá khứ; 500/501 ký tự; valid form chỉ mở preview; double submit; sửa lại từ preview; query context combo/destination; contact config null; lỗi adapter fixture; không PII trong URL/storage/log.

## 10. Checklist nghiệm thu riêng

```text
[ ] Giữ hero cá nhân và ba cột form/profile/map như ảnh.
[ ] Form đủ field, label, icon, error, counter và focus đúng.
[ ] Context stay/combo/destination được điền đúng, bỏ context được.
[ ] Valid form chưa có API không báo gửi thành công, không tạo mã giả.
[ ] Phone/Zalo/social/map không sử dụng thông tin thật suy đoán.
[ ] Không gán chân dung minh họa thành ảnh thật hoặc bịa thành tích/SLA.
[ ] FAQ/scenic CTA/dialog hoạt động, dữ liệu form không bị mất vô lý.
[ ] Mobile dễ nhập, không lộ PII qua persistence/URL/log.
[ ] Có screenshot desktop/mobile/overlay và font/icon đã kiểm tra.
```
