# MÀN HÌNH 02 — CHI TIẾT PHÒNG NGHỈ

> **Agent Opus:** lập trình `/phong-nghi/[slug]`, ảnh chuẩn là property `cuc-phuong-forest-homestay`. Đọc `00_QUY_CHUAN_CHUNG.md`; giữ ba font, tone xanh–kem, logo/SVG và phong cách tư vấn cá nhân. Dùng chung data với listing, không tạo một property khác cùng tên.

![Màn hình chi tiết phòng](./references/02-chi-tiet-phong.png)

## 1. Cấu trúc desktop

Trang này **không có hero panorama như listing**. Sau header là breadcrumb mảnh rồi gallery và thông tin property.

```text
HEADER — PHÒNG NGHỈ ACTIVE
BREADCRUMB                                      SHARE / SAVE
GALLERY: ẢNH LỚN + 3 THUMB    TÊN / RATING / VỊ TRÍ / HIGHLIGHTS
GALLERY TIẾP                HOST CARD            BOOKING CARD
GIỚI THIỆU + TIỆN NGHI                           BOOKING CARD TIẾP
3 ROOM TYPE CARD             NHẬN/TRẢ PHÒNG       GHI CHÚ VIẾT TAY
                            ĐỊA ĐIỂM XUNG QUANH
3 REVIEW CARD                NỘI QUY              HỖ TRỢ CÁ NHÂN
FOOTER
```

Ở viewport 1448 px: nội dung rộng khoảng 1360–1376 px; gallery khoảng 725–735 px; vùng giữa khoảng 330–345 px; booking khoảng 265–275 px; gap 16–22 px. Gallery cao khoảng 315–325 px. Số liệu là khởi tạo, cần đo ảnh.

Dùng CSS Grid với named areas hoặc grid-row span để gallery, title, host và booking ăn khớp; **không** làm một “top row” cao bằng booking rồi để khoảng trống lớn dưới gallery. Booking có thể span hai hàng; intro/amenities nằm ngay dưới gallery như ảnh.

Gợi ý tổ chức: root grid ba cột `gallery/content – host/info – booking`; title span cột 2–3; gallery span hai hàng đầu; intro+amenities span cột 1–2; các khối dưới dùng nested grid. Không absolute-position cả trang để xử lý các phần so le.

## 2. Breadcrumb, gallery và ảnh

Breadcrumb: Trang chủ → Phòng nghỉ → tên chỗ nghỉ; có thể giữ cấp Cúc Phương bằng filter location thật nếu có, không thêm link rỗng. Share/Save góc phải.

Gallery trái gồm một ảnh lớn khoảng 73% chiều rộng và cột ba thumbnail khoảng 27%, gap 6–8 px. Ảnh lớn phòng gỗ/cửa kính/view núi; ba ảnh phụ nhà gỗ, ban công, sân tối có đèn. Các mép bo 8–10 px.

Ảnh lớn có lời viết tay trắng ở dưới trái và nút đen mờ “Xem tất cả … ảnh” dưới phải. Thumbnail cuối overlay `+N`. **Số lượng lấy từ gallery thật**; không hiển thị 28 ảnh nếu chỉ có bốn asset. Không nhân bản cùng ảnh 28 lần.

Click ảnh/nút mở `GalleryDialog`: ảnh lớn, counter, thumbnails, prev/next, Escape, phím trái/phải; có caption/alt. Focus trap, trả focus đúng nút, mobile swipe nếu thực hiện được ổn định. Không autoplay. Chỉ preload ảnh liền kề; xử lý ảnh lỗi bằng fallback có nhãn, không vỡ dialog.

## 3. Thông tin property và chủ nhà

Copy đầu trang:

```text
Bán chạy
Cúc Phương Forest Homestay

Một homestay giữa rừng xanh, nơi bạn được sống chậm,
hít thở thiên nhiên và cảm nhận sự bình yên thật sự.
```

Tên H1 serif đậm 28–34 px, rating mẫu 4.9 / 128, location có pin; không biến title thành heading hero 48 px. Bốn highlights nhỏ: View núi rừng, Không gian xanh, Bữa sáng bản địa, Thân thiện môi trường.

Host card nền kem nhạt: avatar tròn, “Chủ nhà: Anh Nam”, dòng phụ, quote và “Xem hồ sơ chủ nhà”. Link mở dialog nội bộ về host fixture, không đi 404. Đây là nhân vật/nội dung minh họa. Model `property.host` độc lập với `site.advisor`; không tự coi Anh Nam và Đinh Vân là cùng người chỉ vì ảnh minh họa tương tự.

Share: dùng khả năng chia sẻ trình duyệt nếu có, fallback copy link; thông báo copy chỉ sau khi thực sự thành công, thất bại có cách chọn/sao chép thủ công. Save dùng chung favorite theo `stayId`.

## 4. Booking card bên phải

Nền trắng, shadow rất nhẹ, giá ở đầu “Từ 650.000đ / đêm”, badge nhỏ, ngày nhận/trả hai ô cạnh nhau, selector khách, CTA full width xanh “Đặt phòng ngay”, dòng giải thích dưới.

Giá `Từ` là giá thấp nhất phù hợp của room type chưa chọn; khi đã chọn phòng thì hiện giá đúng phòng đó. Không giữ 650.000đ sau khi chọn phòng 1.200.000đ. Không tự xác nhận giá cho ngày cụ thể khi chưa có pricing API.

Flow CTA:

- Chưa chọn room type: cuộn/focus “Các loại phòng & gói dịch vụ”, làm rõ cần chọn loại phòng; không bí mật chọn room đắt nhất.
- Đã chọn room nhưng thiếu ngày/khách: focus trường cần nhập và validate.
- Lựa chọn hợp lệ: điều hướng `/dat-phong` với IDs và selection; không đưa price/PII vào URL.

Nếu booking card sticky trên desktop, dùng offset phù hợp header và không vượt footer; trạng thái đầu trang vẫn đúng ảnh. Mobile dùng thanh giá/CTA dưới có safe-area, bấm mở booking sheet dùng cùng state, không thêm một form tách biệt.

Copy “Không cần thanh toán ngay” và “Xác nhận nhanh trong 5 phút” của mẫu là thông tin cần chủ website xác nhận. Ở prototype chưa có API: giải thích tình trạng phòng/phương thức xác nhận đang là mô phỏng, không hiển thị booking đã thành công.

## 5. Giới thiệu, tiện nghi và room types

Giới thiệu khoảng một đoạn ngắn 4–5 dòng ở desktop, mô tả kiến trúc gỗ, không gian thiên nhiên và nhu cầu phù hợp; không bổ sung bài SEO dài làm đổi chiều cao. Quote nhỏ nền kem bên dưới, chữ ký Đinh Vân Booking ở phải.

Tiện nghi cạnh giới thiệu: grid chip viền nhạt với SVG. Wi-Fi miễn phí, Điều hòa 2 chiều, Phòng tắm riêng, Đồ vệ sinh cá nhân, Ban công view núi, Khu vực làm việc, Bữa sáng bản địa, Không hút thuốc. “Xem tất cả” mở dialog nhóm tiện nghi; không mở một popup trống.

Ba room type card cùng hàng bên dưới gallery:

| ID | Tên hiển thị mẫu | Sức chứa mẫu | Diện tích mẫu | Giá/đêm |
|---|---|---:|---:|---:|
| `standard-garden` | Phòng Standard Garden | 2 người | 20 m² | 650.000đ |
| `deluxe-mountain-view` | Phòng Deluxe Mountain View | 3 người | 28 m² | 850.000đ |
| `bungalow-family` | Bungalow Family | 4 người | 40 m² | 1.200.000đ |

Ảnh ngang, tên đậm, icon sức chứa/diện tích/view, mô tả 2–3 dòng, giá và nút “Chọn phòng”. Card giữa badge “Phổ biến”. Tất cả là fixture để test, không công bố thành thông số đã xác minh.

Chọn phòng cập nhật `selectedRoomTypeId`, highlight viền, label “Đã chọn”, giá booking và occupancy. Khi số khách vượt sức chứa, giải thích và đề nghị chọn loại/số phòng phù hợp. Quy ước prototype: tổng guests tính adults + children cho kiểm tra capacity; không tự bịa chính sách miễn phí trẻ em hoặc gộp nhiều loại phòng. Số phòng nhân vào capacity và room subtotal khi được phép chọn nhiều phòng cùng loại.

Không ghi “còn 1 phòng” khi không có tồn kho. “Không phù hợp số khách” khác “hết phòng”; phân biệt rõ trong state và thông báo.

## 6. Khối thông tin bên phải và đáy trang

“Lịch nhận phòng & thông tin cần biết”: 14:00 nhận, 12:00 trả; gửi hành lý/nhận sớm tùy tình trạng; bữa sáng 06:30–09:00; hỗ trợ tour/xe. Các giờ là fixture, đưa vào data không hardcode JSX.

“Một vài lưu ý nhỏ…”: note kem, script xanh, checklist mang giấy tờ, giữ vệ sinh, không gây ồn, tôn trọng văn hóa và giữ rừng. Đây là checklist thông tin; checkbox trang trí dùng SVG không giả input nhận thao tác, hoặc implement checklist có state thật nếu muốn đánh dấu.

“Địa điểm xung quanh”: bốn ảnh nhỏ rừng Cúc Phương, hồ Yên Quang, Động Người Xưa, khu cứu hộ; tên, khoảng cách/thời gian từ fixture có cờ demo. Không tính khoảng cách từ pins minh họa. Click mở destination dialog dùng chung màn 04 hoặc route sẵn có.

“Nội quy nhà nghỉ”: list SVG nhỏ, không làm bảng dài. Review: ba card ngang như ảnh, avatar, tên, sao/ngày, quote, ảnh khách; dùng dataset demo, “Xem tất cả” mở review dialog có sort cơ bản. Counter tổng demo có thể lớn hơn ba review preview, nhưng dialog phải nói rõ chỉ có nội dung mẫu, không giả tải đủ 128 reviews.

Support card nhỏ phía dưới phải với advisor minh họa, câu viết tay và CTA Zalo/gọi/nhắn tin. Không gán contact của host cho advisor hoặc ngược lại.

## 7. Responsive, route data và trạng thái

Tablet: gallery trên, title/booking dưới theo hai cột; room types 2 cột khi cần; không giữ ba cột lớn quá chật. Mobile: title → gallery → giá/booking summary → highlights/host → giới thiệu → tiện nghi → room types → check-in/nearby/rules/reviews/support; nhóm đảo thứ tự phải có luồng đọc DOM hợp lý. Có thể xếp gallery thành ảnh chính + thumbnail strip.

Mọi slug trong listing dùng chung template với đúng dữ liệu riêng; không luôn render Forest Homestay. Slug không tồn tại có not-found thân thiện, CTA về danh sách. Loading giữ khung gallery; thiếu ảnh/room types có state rõ; lỗi adapter có thử lại.

Component: `PropertyGallery`, `PropertyHeading`, `HostCard`, `StayBookingCard`, `AmenitiesGrid`, `RoomTypeCard`, `CheckInFacts`, `HouseRules`, `NearbyDestinations`, `ReviewCards`, `AdvisorMiniCard`.

## 8. Checklist nghiệm thu riêng

```text
[ ] Không thêm panorama hero; giữ đúng gallery lớn + 3 thumbnails.
[ ] Heading/host/booking/intro đúng vị trí so le, không khoảng trống giả.
[ ] Gallery count đúng asset; dialog dùng chuột/bàn phím/mobile được.
[ ] Chọn từng room type đổi đúng giá, sức chứa, selected state.
[ ] CTA checkout truyền đúng room ID/ngày/khách và không truyền giá.
[ ] Favorites đồng bộ listing/home; share có fallback và error state.
[ ] Amenities, host, reviews, nearby đều có điểm đến/dialog thật.
[ ] Không lẫn chủ nhà Anh Nam với advisor Đinh Vân.
[ ] Not-found/loading/empty/error có đủ; mobile sticky không che form.
[ ] Có screenshot desktop/mobile/overlay, glyph tiếng Việt và icon đã kiểm tra.
```
