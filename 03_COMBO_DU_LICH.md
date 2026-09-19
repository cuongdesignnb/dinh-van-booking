# MÀN HÌNH 03 — COMBO DU LỊCH

> **Agent Opus:** lập trình `/combo-du-lich` theo ảnh, đọc `00_QUY_CHUAN_CHUNG.md` trước. Giữ Playfair Display / Roboto Condensed / Dancing Script, SVG và tone xanh–kem. Không chuyển sáu combo thành một carousel khổng lồ hoặc trang blog.

![Màn hình combo du lịch](./references/03-combo-du-lich.png)

## 1. Bố cục desktop cần tái tạo

```text
HEADER — COMBO DU LỊCH ACTIVE
HERO PANORAMA / HEADLINE TRÁI / NGƯỜI DU LỊCH BÊN PHẢI
BREADCRUMB + FILTER CHIPS + LỜI NHẮN VIẾT TAY
HEADING “CÁC COMBO NỔI BẬT”                         SORT
6 COMBO CARD TRÊN MỘT HÀNG
QUOTE NHỎ     4 LỢI ÍCH ĐẶT CÙNG NGƯỜI BẢN ĐỊA     QUOTE NHỎ
QUY TRÌNH 4 BƯỚC NẰM NGANG
3 TESTIMONIAL CARD                                FAQ
FOOTER
```

Ở 1448 px: lề khoảng 36 px, hero khoảng 170–180 px dưới header, filter/breadcrumb khoảng 75–85 px; card có ảnh chiếm phần trên, nội dung gọn bên dưới. Mỗi card rộng khoảng 220 px với gap 12–14 px. Tham số chỉ là khởi tạo, cần đo lại PNG.

```css
.combo-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.combo-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
}
```

Không thêm sidebar hoặc khối lọc bên trái; không đổi sáu cột thành ba cột ở viewport chuẩn. Các CTA đáy card phải thẳng hàng; mô tả có chiều dài có kiểm soát, không fixed height cắt nội dung.

## 2. Hero và category chips

Hero núi đá vôi/thung lũng, ánh sáng ấm; người đội mũ đeo balô ở phải, không đè text. Copy:

```text
Combo du lịch Cúc Phương – Ninh Bình
Nhiều trải nghiệm hơn – Chuyến đi ý nghĩa hơn

Những hành trình được thiết kế bởi người bản địa, kết hợp hài hòa giữa thiên nhiên,
văn hóa, ẩm thực và nghỉ dưỡng. Đi dễ dàng hơn, trọn vẹn hơn cùng Đinh Vân Booking.
```

H1 serif 34–40 px, dòng hai viết tay khoảng 30–35 px. Lời nhắn bên phải “Không chỉ là chuyến đi mà là những câu chuyện đáng nhớ…”. Không biến lời nhắn thành CTA thứ hai.

Filter chips theo thứ tự: **Tất cả combo — 2N1D — 3N2D — Gia đình — Cặp đôi — Nhóm – Team — Trải nghiệm thiên nhiên**. Pill active xanh đậm, các pill khác trắng, icon SVG xanh, shadow nhẹ; vùng nền kem. Breadcrumb nhỏ phía trên chips. Bên phải câu “Chọn hành trình phù hợp với bạn nhé!”.

Prototype sử dụng **một category filter active** trong hàng chip để hành vi rõ ràng; mỗi combo có duration và nhiều audience tags để lọc được. Đây là filter button `aria-pressed`, không lạm dụng tab role khi không có tabpanel riêng. Sort: Phổ biến nhất, Giá tăng dần, Giá giảm dần; reset page khi đổi tiêu chí.

## 3. Sáu combo card

Mỗi card: ảnh khoảng 1.7–1.8:1, badge duration/audience ở góc trái, heart góc phải; tên sans đậm, câu phụ một dòng, ba dòng included có SVG nhỏ, giá đậm `/ người`, CTA xanh full width “Xem chi tiết”. Card trắng, viền nhạt, bo khoảng 9 px.

Fixture và thứ tự giống ảnh:

| ID | Tên | Badge | Giá mẫu/người |
|---|---|---|---:|
| `kham-pha-rung-cuc-phuong` | Khám phá rừng Cúc Phương | 2N1D | 1.350.000đ |
| `trang-an-bai-dinh` | Tràng An – Bái Đính | 2N1D | 1.290.000đ |
| `cuc-phuong-eco-retreat` | Cúc Phương Eco Retreat | 3N2D | 2.350.000đ |
| `ninh-binh-tron-ven` | Ninh Bình trọn vẹn | 3N2D | 2.190.000đ |
| `ky-nghi-gia-dinh-xanh` | Kỳ nghỉ gia đình xanh | Gia đình | 1.890.000đ |
| `team-building-ninh-binh` | Team building Ninh Bình | Nhóm – Team | 1.690.000đ |

Gợi ý ba dòng nội dung mẫu trên từng card:

| Combo | Dòng 1 | Dòng 2 | Dòng 3 |
|---|---|---|---|
| Khám phá rừng | Trekking rừng nguyên sinh | Thăm khu cứu hộ linh trưởng | Ẩm thực bản địa, homestay xanh |
| Tràng An – Bái Đính | Tham quan Tràng An | Vãn cảnh Bái Đính | Ẩm thực Ninh Bình |
| Eco Retreat | Nghỉ dưỡng giữa thiên nhiên | Trekking, quan sát thiên nhiên | BBQ, trải nghiệm buổi tối |
| Ninh Bình trọn vẹn | Tràng An – Hang Múa – Tam Cốc | Khám phá văn hóa bản địa | Đặc sản và nghỉ dưỡng |
| Gia đình xanh | Lịch trình nhẹ nhàng | Trải nghiệm cho gia đình | Homestay gần thiên nhiên |
| Team building | Hoạt động nhóm ngoài trời | Thiên nhiên và văn hóa | Lịch trình theo nhu cầu |

Các lịch trình/quyền tham quan là **copy mẫu**, cần kiểm chứng trước kinh doanh; không hứa hoạt động đặc biệt được phép chỉ vì có trong mockup. Không bịa thêm “đã bán”, giảm giá, số chỗ còn lại hoặc departures có sẵn.

Data gồm `id`, `slug`, `title`, `subtitle`, `durationDays`, `durationNights`, `audienceTags`, `includedHighlights`, `fromPriceVnd`, `priceUnit`, `image`, `itinerary`, `isDemo`. Không suy duration từ badge Gia đình/Team; fixture phải có trường riêng.

## 4. Xem chi tiết combo — trạng thái bổ sung cần hoạt động

Chưa có ảnh riêng cho trang chi tiết combo. **Không tự mở rộng thành một trang thiết kế khác** trong nhiệm vụ này. Mặc định mở `ComboDetailDialog`/drawer, giữ cùng visual system; nếu dự án đã có route tương ứng thì tái sử dụng.

Dialog chứa ảnh, tên, duration, giá tham khảo, itinerary theo ngày bằng accordion, bao gồm/chưa bao gồm, chính sách mẫu có nhãn demo; trường ngày dự kiến/số khách, ghi chú ngắn và CTA “Nhờ Đinh Vân tư vấn combo này”. Nội dung luôn theo combo được click, không sáu nút cùng mở một mẫu.

CTA chuyển `/lien-he?intent=combo&item=<slug>` và truyền ngày/khách không nhạy cảm. Form contact hiển thị chip ngữ cảnh có thể bỏ. Không chuyển combo sang checkout phòng nếu chưa có mô hình giá/room mapping cho combo; không dùng giá/người như giá/phòng.

Heart hoạt động theo `comboId`, namespace khác favorites của stay/destination. Back/Escape đóng dialog, trả focus; mobile drawer cuộn nội dung bên trong đúng cách.

## 5. Lợi ích và quy trình bốn bước

Bên dưới cards là một hàng: quote trái nền kem “Những chuyến đi nhỏ tạo nên những thay đổi lớn”, giữa heading “Vì sao nên đặt combo cùng người bản địa?” và bốn feature; phải quote “Đi cùng người địa phương để cảm nhận Ninh Bình thật khác!”.

Bốn feature: Am hiểu địa phương / Lịch trình tối ưu / Dịch vụ tận tâm / Du lịch có trách nhiệm. Icon tròn kem, text ngắn; không biến thành bốn card cao.

Process band ngang nền xanh rất nhạt: intro “Quy trình đặt combo đơn giản” và bốn số trong hình tròn xanh, nối mũi tên SVG:

```text
1. Tư vấn — Nhận nhu cầu, gợi ý lịch trình.
2. Chốt lịch — Thống nhất ngày, số lượng, yêu cầu.
3. Giữ phòng — Theo phương án đã được xác nhận.
4. Khởi hành — Chuẩn bị và tận hưởng chuyến đi.
```

Copy trong ảnh có đề cập đặt cọc; đưa qua config/policy demo, không mặc định mọi combo đều cọc giống nhau. Steps là mô tả quy trình, không tạo nút giả có vẻ thực hiện giao dịch.

## 6. Testimonials và FAQ

Đáy trái khoảng 2/3 chiều rộng có heading, “Xem tất cả”, ba review card với avatar tròn, quote ngắn, rating, tên và nơi ở mẫu. Không autoplay; xem thêm mở dialog hoặc thay slide có state.

Đáy phải khoảng 1/3 là FAQ bốn accordion: giá gồm gì, tùy chỉnh lịch trình, trẻ em tính giá thế nào, hoàn/hủy. Câu trả lời demo phải ghi rõ chính sách tùy combo/chờ xác nhận, không tự viết điều khoản ràng buộc. Không trả lời “miễn phí hoàn hủy” khi chưa có chính sách.

## 7. Responsive và trạng thái

1280 px giữ sáu cột chỉ khi chữ vẫn đọc được; dưới mức phù hợp chuyển 3 cột, tablet 2–3, mobile một cột hoặc hai khi đủ chiều rộng. Không ép sáu card nhỏ trên điện thoại. Chips cuộn ngang có chỉ báo hoặc wrap, trang không tràn ngang. Process chuyển timeline dọc; lợi ích 2 × 2; reviews/FAQ xếp dọc.

Các states cần đủ: category selected, sort, favorites, detail drawer, loading, no results, error + retry. Empty phải có “Xem tất cả combo” và “Nhận tư vấn riêng”. Sort và filter hoạt động cùng nhau; giá cùng unit mới sort chung. Nếu fixture sau này có giá theo đoàn thì không so trực tiếp với giá/người mà không có quy ước.

Component: `CombosHero`, `ComboCategoryFilters`, `ComboSort`, `ComboCard`, `ComboDetailDialog`, `LocalBookingBenefits`, `BookingProcess`, `Testimonials`, `FaqAccordion`.

## 8. Checklist nghiệm thu riêng

```text
[ ] Đúng hero, filter chips và 6 combo card trên một hàng ở 1448 px.
[ ] Badge/ảnh/tên/giá theo đúng thứ tự fixture, không dùng cùng ảnh cho nhiều card.
[ ] Mọi chip/sort/heart hoạt động, có empty/loading/error.
[ ] 6 nút Xem chi tiết mở đúng nội dung combo, không link 404.
[ ] CTA tư vấn chuyển đúng ngữ cảnh, không làm sai đơn vị giá sang checkout phòng.
[ ] Giữ hàng lợi ích, process 4 bước, reviews + FAQ đúng tỷ lệ.
[ ] Mobile drawer, focus, accordion, scroll và vùng chạm hoạt động.
[ ] Font/icon/ảnh, screenshot desktop/mobile và overlay đã kiểm tra.
```
