# MÀN HÌNH 01 — DANH SÁCH PHÒNG NGHỈ

> **Agent Opus:** lập trình route `/phong-nghi` bám sát ảnh dưới đây. Đọc `00_QUY_CHUAN_CHUNG.md` trước; dùng lại shell, Playfair Display / Roboto Condensed / Dancing Script, token xanh–kem và icon SVG của homepage. Không đổi thành layout listing khác.

![Màn hình danh sách phòng nghỉ](./references/01-phong-nghi.png)

## 1. Mục tiêu và bố cục

Khách tìm chỗ nghỉ theo nhu cầu, xem nhanh thông tin, mở chi tiết hoặc nhờ Đinh Vân tư vấn. Đây là listing curated mang tính cá nhân, không phải bảng quản trị.

```text
HEADER CHUNG — PHÒNG NGHỈ ACTIVE
HERO: BREADCRUMB / TIÊU ĐỀ / CÂU VIẾT TAY / NHÀ GỖ
SEARCH BAR NỔI: NGÀY / KHÁCH / GIÁ / LOẠI / TIỆN ÍCH / SORT / CTA
BỘ LỌC TRÁI     KẾT QUẢ + VIEW TOGGLE                BẢN ĐỒ
                4 THẺ × 2 HÀNG                      TƯ VẤN CÁ NHÂN
TƯ VẤN NHỎ      TESTIMONIALS + PAGINATION             FAQ
FOOTER CHUNG
```

Tại 1448 px, khởi tạo lề nội dung khoảng 36 px, sidebar trái 205–210 px, phải 275–280 px, gap 18–20 px; phần giữa khoảng 840–855 px. Search bar gần full width, nằm chồng nhẹ tại mép dưới hero. Hero khoảng 170–185 px dưới header, không lấy chiều cao hero homepage áp cho màn này. Đo lại PNG khi overlay; không dùng các số ước lượng như tọa độ tuyệt đối.

```css
.stays-layout {
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr) 276px;
  gap: 20px;
  align-items: start;
}
.stays-results-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
```

Không bỏ sidebar phải để nới card. Không đổi bốn card một hàng thành hai card ở viewport chuẩn. Không thêm khoảng trắng lớn giữa các khối.

## 2. Hero và thanh tìm kiếm

Breadcrumb “Trang chủ › Phòng nghỉ”; dấu phân cách bằng SVG. Copy chính:

```text
Phòng nghỉ Cúc Phương
Những nơi dừng chân giữa thiên nhiên trong lành

Từ homestay ấm cúng giữa rừng, đến những lodge mộc mạc bên núi,
Đinh Vân Booking tuyển chọn những nơi lưu trú chất lượng, để hành trình của bạn thêm trọn vẹn.
```

H1 serif trắng, dòng phụ viết tay. Bên phải có nhà gỗ/giường/đèn ấm; câu viết tay nhỏ “Một đêm ở rừng là một cuộc hẹn với bình yên”. Gradient trái đủ tối, không làm tối toàn ảnh. Lá sát mép, không che form.

Search bar nền trắng, bo 20–24 px, shadow mềm; các ô có icon trên nền kem và separator mảnh. Thứ tự:

| Ô | Mặc định | Tương tác |
|---|---|---|
| Ngày nhận phòng / Ngày trả phòng | Chọn ngày | Date range picker chung, trả phòng sau nhận phòng |
| Số khách | 2 khách | Adults/children/rooms, tối thiểu 1 adult và 1 room |
| Khoảng giá | Tất cả | Chọn preset hoặc nhập min/max, đồng bộ sidebar |
| Loại lưu trú | Tất cả | Chọn nhiều loại |
| Tiện ích | Tất cả | Chọn nhiều tiện ích |
| Sắp xếp | Phổ biến nhất | Featured, giá tăng, giá giảm, đánh giá cao |
| Tìm phòng | CTA xanh đậm | Validate, áp dụng, cập nhật URL và kết quả |

Ô giá/loại/tiện ích trên thanh và sidebar phải dùng cùng state. Không có hai bộ filter mâu thuẫn. Draft trong popover chỉ commit khi áp dụng; sidebar có thể cập nhật ngay, nhưng phải có một state kết quả đã áp dụng làm nguồn chuẩn.

## 3. Sidebar bộ lọc

Tiêu đề “Bộ lọc tìm kiếm”, nút “Đặt lại” có icon reset. Các nhóm accordion mở như ảnh: khoảng giá; loại lưu trú; tiện ích nổi bật; đánh giá.

Loại: Homestay, Eco Lodge, Resort, Bungalow, Nhà sàn. Tiện ích: Wi-Fi miễn phí, Bữa sáng, View rừng / núi, Có bếp, Phù hợp gia đình, Chỗ đậu xe, Thân thiện môi trường. Rating: từ 4.5, 4.0, 3.5 trở lên.

Price slider có hai thumb, kèm cách nhập số bằng bàn phím; không chỉ dùng kéo chuột. Khoảng hiển thị mẫu 300.000đ–2.000.000đ+ là cấu hình demo, không hardcode giới hạn thấp hơn giá trong dataset. Checkbox nhỏ nhưng vùng nhấn đủ rộng, nhãn và số lượng căn đều.

Filter nhiều lựa chọn: **OR trong một nhóm**, **AND giữa các nhóm**. Rating là một ngưỡng duy nhất, nên dùng radio được style gần checkbox hoặc cấu hình rõ không tích nhiều ngưỡng vô nghĩa. Facet count có quy ước thống nhất, tính từ dataset sau các nhóm khác; không copy số `(12)`, `(20)` khi chỉ có tám chỗ nghỉ.

Đặt lại xóa bộ lọc và reset sort/page, giữ ngày/khách đã nhập; ghi rõ bằng tooltip/help text nếu cần. Khi filter đổi, quay về trang 1.

Card cuối sidebar: “Không tìm thấy phòng phù hợp?”; CTA “Nhận tư vấn miễn phí” mở `/lien-he?intent=stay` cùng selection không nhạy cảm.

## 4. Thẻ phòng và dữ liệu ban đầu

Mỗi card: ảnh ngang trên cùng khoảng 2.1:1; heart trên ảnh; tên đậm; rating vàng/counter; location; ba tiện ích nhỏ; mô tả 2–3 dòng; giá trái/CTA phải ở đáy. Card gọn, nền trắng, border nhạt và bo 8–10 px. Không dùng variant card quá cao của trang khác.

Dữ liệu mẫu để dựng đúng thứ tự và giá ảnh, không phải bảng giá đã xác minh:

| ID/slug | Tên | Rating / số đánh giá | Giá mẫu/đêm |
|---|---|---|---:|
| `cuc-phuong-forest-homestay` | Cúc Phương Forest Homestay | 4.9 / 128 | 650.000đ |
| `an-nhien-retreat` | An Nhiên Retreat | 4.8 / 96 | 850.000đ |
| `cuc-phuong-eco-lodge` | Cúc Phương Eco Lodge | 4.9 / 112 | 1.200.000đ |
| `moc-son-homestay` | Mộc Sơn Homestay | 4.7 / 85 | 700.000đ |
| `nha-san-cuc-phuong` | Nhà sàn Cúc Phương | 4.6 / 74 | 600.000đ |
| `cuc-phuong-bungalow` | Cúc Phương Bungalow | 4.7 / 62 | 900.000đ |
| `green-valley-homestay` | Green Valley Homestay | 4.5 / 48 | 550.000đ |
| `trang-an-nature-lodge` | Tràng An Nature Lodge | 4.8 / 91 | 1.500.000đ |

Card đầu badge “Bán chạy”. Có tám ảnh phù hợp khác nhau, không lặp ảnh để lấp grid. Property Tràng An không được gán vị trí Cúc Phương một cách máy móc; địa chỉ trong fixture và production phải tách biệt.

Tên và “Xem chi tiết” tới đúng `/phong-nghi/[slug]`, mang theo ngày/khách đã chọn. Heart không kích hoạt điều hướng; không bọc toàn card bằng link rồi nhét button vào. Tên phòng vẫn đọc được đầy đủ; nếu cần giới hạn dòng, có cách xem toàn bộ tên mà không phụ thuộc hover trên mobile.

Toolbar: “Có 8 kết quả phù hợp” tính từ dữ liệu, nút Dạng lưới / Dạng danh sách. Chuyển list dùng cùng dataset/filter/favorite; ảnh trái, thông tin giữa, giá/CTA phải. Không reset search khi đổi view.

Pagination phải thật: nếu tám kết quả và page size tám thì một trang, không làm nút 2/3 giả như mockup. Để test nhiều trang, dùng fixture mở rộng riêng với ID khác và count đúng. Giữ style pagination của ảnh, ghi ngoại lệ này trong báo cáo.

## 5. Sidebar phải và cuối trang

Map card: heading “Xem vị trí trên bản đồ”, preview xanh nhạt, pins và popover property đang chọn. CTA “Xem bản đồ lớn” mở dialog; khi chỉ có illustration thì ghi “Bản đồ minh họa”, không giả chỉ đường thật. Click pin đổi property preview và có link chi tiết. Không yêu cầu geolocation.

Advisor card: chân dung minh họa bên phải, “Cần tư vấn chọn phòng?” bằng script bên trái; giới thiệu ngắn, nút “Chat với Đinh Vân”; ba lợi ích dưới và chữ ký nhỏ. Contact CTA theo config, thiếu config mở tư vấn nội bộ. Không kéo ảnh người méo tỷ lệ.

Cuối giữa: tiêu đề đánh giá, ba review card ngang nhỏ có avatar, quote, tên, sao. Pagination nằm đúng khu vực kết quả; controls review riêng, không dùng chung index với pagination phòng. Bên phải là FAQ năm câu. Xem tất cả FAQ mở dialog đầy đủ, không link 404. Review là demo, không phát review schema.

## 6. Tương tác và trạng thái

| Trạng thái | Kết quả cần có |
|---|---|
| Default | 8 card, grid, 2 khách, không popup, chưa chọn favorite |
| Applied filters | Kết quả/count/URL đồng bộ, có chip xóa filter |
| No results | “Chưa có chỗ nghỉ phù hợp với bộ lọc này”, reset và tư vấn; không đổ lỗi hết phòng |
| Loading | Skeleton cùng footprint card, không nhảy layout lớn |
| Load error | Thông báo + thử lại, giữ selection |
| Invalid dates | Error cạnh date group, focus tới trường lỗi |
| Favorite | Cập nhật ngay, đồng bộ listing/homepage/detail, reload an toàn |
| Back/forward | Khôi phục filter/sort/page hợp lệ từ URL |

Không có API availability thì không ghi “Còn phòng” theo ngày. Sau search có thể giải thích “Đây là gợi ý theo nhu cầu; tình trạng phòng sẽ được xác nhận khi tư vấn.”

## 7. Responsive và cấu trúc component

Từ 1024–1279 px: giữ sidebar trái nếu đủ rộng, kết quả 2–3 cột; sidebar phải xuống dưới. Tablet: filter drawer, card hai cột. Mobile: search thu gọn nhưng chỉnh được đầy đủ, toolbar Lọc / Sắp xếp / Bản đồ, card một cột; drawer có Đặt lại / Áp dụng và số kết quả. Không render filter desktop ẩn nhưng vẫn nhận tab focus.

Component đề xuất: `StaysHero`, `StaySearchBar`, `StayFilterPanel`, `ResultsToolbar`, `StayCard`, `StayListRow`, `StayMapDialog`, `AdvisorCard`, `ReviewsStrip`, `FaqAccordion`, `Pagination`. Tái sử dụng card bằng variant `listing`, không copy logic của homepage.

## 8. Checklist nghiệm thu riêng

```text
[ ] Desktop đúng 3 cột lớn; vùng giữa 4 card × 2 hàng.
[ ] Search bar nằm tại mép hero, không chuyển thành một section khác.
[ ] Sidebar và search bar đồng bộ filter; counts/pagination không giả.
[ ] Grid/list, reset, sort, price inputs, keyboard đều dùng được.
[ ] Cả 8 route chi tiết đúng dữ liệu; heart không mở route.
[ ] Ngày/khách được giữ khi chuyển detail và back.
[ ] Map/FAQ/tư vấn có hành vi thật, không dùng contact giả.
[ ] Có loading, empty, error và fixture test tương ứng.
[ ] Screenshot desktop/mobile/overlay và kiểm tra font/icon hoàn tất.
```
