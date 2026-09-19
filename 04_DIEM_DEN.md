# MÀN HÌNH 04 — ĐIỂM ĐẾN / KHÁM PHÁ CÚC PHƯƠNG – NINH BÌNH

> **Agent Opus:** lập trình `/diem-den` theo ảnh. Đọc `00_QUY_CHUAN_CHUNG.md`, giữ font serif / sans gọn / script, xanh–kem, icon SVG và giọng nói của người tư vấn bản địa. Không đổi thành magazine hoặc trang bài viết dài.

![Màn hình điểm đến](./references/04-diem-den.png)

## 1. Bố cục tổng thể

```text
HEADER — ĐIỂM ĐẾN ACTIVE
HERO: BREADCRUMB / HEADLINE / LANDSCAPE / TRAVELER
CATEGORY CHIPS + THÔNG ĐIỆP BẢN ĐỊA
HEADING + 6 DESTINATION CARD MỘT HÀNG
LỊCH TRÌNH TIMELINE     4 THẺ THEO MÙA     BẢN ĐỒ
LỊCH TRÌNH TIẾP        4 THẺ THEO MÙA     LỜI NHẮN ĐINH VÂN
FOOTER
```

Lề khoảng 36 px, hero 220–235 px dưới header, chips strip khoảng 50–60 px. Bên dưới sáu card ngang. Lower section là ba cột, cột giữa hẹp hơn; khởi tạo tỷ lệ `1.2fr .95fr 1.3fr`, gap 16–20 px. Đo lại reference để chỉnh, không biến lower section thành ba section full-width.

```css
.destinations-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.discovery-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, .95fr) minmax(0, 1.3fr);
  gap: 18px;
}
```

## 2. Hero và category filters

Copy:

```text
Khám phá thiên nhiên kỳ diệu
Cúc Phương - Ninh Bình

Nơi rừng xanh, núi đá, văn hóa và những trải nghiệm chân thật
cùng tạo nên hành trình đáng nhớ.

Không chỉ là một điểm đến, mà là hành trình trở về với thiên nhiên,
văn hóa và chính mình...
```

Dòng đầu script trắng; H1 serif lớn; nội dung sans. Phải là nhân vật du lịch nhìn cảnh núi/thung lũng. Lời nhắn nhỏ theo phong cách viết tay, không che mặt/hình nhân vật hoặc headline.

Category chips: **Tất cả — Thiên nhiên — Văn hóa — Check-in — Ẩm thực — Gia đình**. Icon SVG lần lượt danh mục/lá hoặc cây/di tích/camera/dao nĩa/nhóm người. Một chip active; filter dựa trên tags, không dựa tên hiển thị. Dòng thông điệp bên phải “Những điểm đến không chỉ để ngắm, mà để cảm nhận”.

Không làm “Gia đình” rỗng vô lý do fixture không được gắn tags; một điểm có thể thuộc nhiều nhóm. Mỗi category dùng button `aria-pressed`.

## 3. Sáu card điểm đến

Ảnh ngang phía trên, heart góc phải, category badge dưới trái ảnh. Bên dưới là tiêu đề serif gọn, mô tả 2–3 dòng, ba tip icon và CTA xanh “Xem chi tiết”. Giữ card/CTA cao tương đối đều, không chèn giá vào màn này.

| ID | Tiêu đề | Nhóm hiển thị | Hướng hình ảnh |
|---|---|---|---|
| `vuon-quoc-gia-cuc-phuong` | Vườn quốc gia Cúc Phương | Thiên nhiên | Rừng già, lối đi/cây lớn |
| `ho-yen-quang` | Hồ Yên Quang | Thiên nhiên | Mặt hồ và núi xanh |
| `dong-nguoi-xua` | Động Người Xưa | Văn hóa | Hang/nhũ đá hoặc lối vào động |
| `trang-an` | Tràng An | Thiên nhiên | Thuyền, nước, núi đá vôi |
| `hang-mua` | Hang Múa | Check-in | Đỉnh núi/đường bậc đá |
| `am-thuc-ninh-binh` | Ẩm thực Ninh Bình | Ẩm thực | Mâm món địa phương |

Nội dung demo bám chiều dài ảnh: giới thiệu điểm, hoạt động gợi ý, trải nghiệm chụp ảnh/thiên nhiên/ẩm thực. Không tự khẳng định giá vé, giờ mở cửa, an toàn tuyệt đối, quyền vào khu bảo tồn hoặc hoạt động đang được cho phép. Thông tin mùa, lịch trình, khoảng cách và các tuyên bố du lịch trong mockup phải có cờ chưa xác minh.

“Xem tất cả điểm đến” ở heading mở drawer danh sách đầy đủ/ô tìm kiếm; nếu dataset chỉ có sáu thì hiển thị đúng sáu, không giả có thêm. Favorite theo `destinationId`, đồng bộ với nearby card trên màn chi tiết phòng nếu có cùng ID.

## 4. Destination detail dialog

Chưa có ảnh trang chi tiết riêng, nên dùng một `DestinationDetailDialog` có cùng visual system; không tự thiết kế thêm route lớn trừ khi đã có trong dự án.

Nội dung: ảnh, tên, nhóm, mô tả ngắn, hoạt động gợi ý, lưu ý tham quan, gallery nhỏ nếu có, CTA “Nhờ Đinh Vân gợi ý lịch trình”. Chỉ hiển thị vé/giờ/địa chỉ chính xác khi đã có dữ liệu xác minh; nếu thiếu thì “Liên hệ để được tư vấn thông tin phù hợp thời điểm đi”. Không render chuỗi “undefined”.

CTA tới `/lien-he?intent=destination&item=<slug>`; có thể thêm link “Tìm phòng nghỉ” tới listing với location tag đã khai báo, không lọc bằng khoảng cách bịa. Share/favorite có state thật. Close/Escape/back trả focus.

## 5. Gợi ý lịch trình — cột trái

Heading “Gợi ý lịch trình khám phá”, subtitle ngắn, Xem thêm. Ba tabs cùng hàng: **1 ngày / 2 ngày 1 đêm / 3 ngày 2 đêm**, dòng phụ bên dưới; tab đầu active xanh đậm.

Bên trong: timeline dọc với chấm và đường xanh, giờ ở trái, SVG và nội dung bên phải. Một ảnh dọc nhỏ cùng lời viết tay “Một ngày đủ để yêu thêm thiên nhiên Việt Nam” ở cạnh; không để ảnh che timeline.

Mẫu 1 ngày để dựng UI:

| Giờ demo | Hoạt động demo |
|---|---|
| 08:00 | Khởi hành |
| 10:00 | Tham quan Cúc Phương |
| 12:00 | Ăn trưa, nghỉ ngơi |
| 14:00 | Khám phá điểm tham quan trong lịch trình |
| 16:00 | Ngắm cảnh, chụp ảnh |
| 17:30 | Kết thúc hành trình |

Giờ này chỉ để trình diễn, không phải tư vấn thời gian di chuyển đã kiểm chứng. Agent chuẩn bị dữ liệu mẫu riêng cho cả ba tabs; 2N1D/3N2D có group theo ngày, không chỉ thay active màu rồi giữ nội dung cũ. Không tự chèn một tuyến đường bất khả thi để đủ các mốc.

Tabs có `role=tablist/tab/tabpanel`, Arrow/Home/End phù hợp, tabpanel liên kết đúng. Xem thêm mở itinerary dialog đầy đủ; ở trang giữ độ gọn gần ảnh. Mobile timeline không bị cắt chân chữ/đè giờ.

## 6. Du lịch theo mùa — cột giữa

Heading, một câu dẫn và grid 2 × 2: ảnh nhỏ, tên mùa, khoảng tháng, mô tả ngắn. Ảnh xuân/hè/thu/đông cùng tone thiên nhiên. Reference gợi ý xuân 2–4, hè 5–8, thu 9–11, đông 12–1; đưa qua fixture, **không coi đây là dự báo thời tiết hoặc thời điểm du lịch bảo đảm**.

Card mùa nếu được thiết kế clickable thì phải mở `SeasonTipsDialog` với nội dung riêng và CTA tư vấn; nếu chỉ là thông tin thì không dùng cursor pointer hoặc hover giống nút. Không mở trang 404. Khuyến nghị cho chuyến đi thật cần chủ website kiểm tra theo thời điểm.

## 7. Bản đồ và lời nhắn — cột phải

Map panel ở trên: heading “Bản đồ khám phá địa phương”, helper text, link xem bản đồ lớn. Có nhãn/pin Cúc Phương, hồ Yên Quang, Động Người Xưa, Tràng An, Hang Múa theo illustration.

Trong prototype, hiển thị ảnh/SVG minh họa nền, labels bằng DOM/SVG rõ nét và nhãn “Bản đồ minh họa”. Không dùng tọa độ phần trăm của ảnh làm kinh độ/vĩ độ thực tế. Click marker mở preview destination đúng ID; map dialog có danh sách tương đương để người dùng bàn phím tiếp cận. Chỉ bật chỉ đường khi có URL/tọa độ đã xác nhận.

Advisor note phía dưới: “Lời nhắn từ Đinh Vân”, quote ngắn về kết nối thiên nhiên/bản địa, tên ký, script bên phải và portrait minh họa. Không biến thành card bán hàng có nhiều nút; giữ cảm giác lời nhắn cá nhân như ảnh.

## 8. Responsive và trạng thái

Desktop 6 card ngang; 1024–1279 px có thể 3 cột; tablet 2–3; mobile một cột hoặc hai nếu vẫn đọc được. Lower section tablet 2 cột rồi advisor/map xuống dưới; mobile itinerary → mùa → map → lời nhắn. Hero giữ người/cảnh bên phải khi có thể; trang trí dư có thể ẩn nhưng không mất nội dung chính.

States: lọc theo category, favorite, destination dialog, itinerary tabs, season dialog, map dialog, loading/empty/error. Empty có reset; lỗi không phá header/footer. Không yêu cầu đăng nhập để xem hoặc lưu local.

Component: `DestinationsHero`, `DestinationCategoryFilters`, `DestinationCard`, `DestinationDetailDialog`, `ItineraryTabs`, `ItineraryTimeline`, `SeasonCard`, `LocalMapPreview`, `LocalMapDialog`, `AdvisorNote`.

## 9. Checklist nghiệm thu riêng

```text
[ ] Hero/chips/6 card và lower grid ba cột bám đúng reference.
[ ] Category filters làm thay đổi dataset thật, favorite không mở card.
[ ] Mỗi card mở đúng detail; Xem tất cả không là link rỗng.
[ ] Cả 3 itinerary tabs có dữ liệu và accessibility đúng.
[ ] Mùa/map là thông tin demo, không giả dữ liệu thời gian thực/vị trí thật.
[ ] Markers/dialog có điều khiển bàn phím và fallback danh sách.
[ ] CTA tư vấn mang đúng ngữ cảnh điểm đến.
[ ] Responsive không mất các khối, font/icon và overlay đã kiểm tra.
```
