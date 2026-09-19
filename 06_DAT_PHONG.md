# MÀN HÌNH 06 — ĐẶT PHÒNG / THÔNG TIN KHÁCH / XEM LẠI

> **Agent Opus:** lập trình `/dat-phong` theo ảnh; đọc `00_QUY_CHUAN_CHUNG.md` trước. Phạm vi là UI flow và phép tính frontend với fixture, **không thực hiện thanh toán hoặc giữ tồn phòng thật**. Giữ font, SVG, xanh–kem và phong cách cá nhân.

![Màn hình đặt phòng](./references/06-dat-phong.png)

## 1. Mục tiêu và cấu trúc desktop

```text
HEADER CHUNG
HERO THẤP: ĐẶT PHÒNG CÙNG ĐINH VÂN BOOKING
BREADCRUMB / DẢI THÔNG ĐIỆP NHỎ
STEP INDICATOR 1 → 2 → 3                SUMMARY ẢNH / PHÒNG / NGÀY
1. THÔNG TIN KHÁCH                      SUMMARY CHI TIẾT TIỀN
2. DỊCH VỤ BỔ SUNG                      TỔNG / TRẢ TRƯỚC / CÒN LẠI
3. MÃ GIẢM GIÁ & GHI CHÚ                CTA GIỮ CHỖ / REVIEW
4. PHƯƠNG ÁN THANH TOÁN                 HỖ TRỢ
DẢI 4 LỢI ÍCH
FOOTER BIẾN THỂ CÓ LIÊN KẾT CHÍNH SÁCH
```

Ở 1448 px: container chính khoảng 1260–1280 px với lề rộng hơn listing; cột trái khoảng 800–815 px, cột phải 415–430 px, gap 28–32 px. Hero thấp khoảng 135–145 px dưới header. Không dùng hero lớn như contact; không mở sidebar bộ lọc trên checkout.

```css
.checkout-shell {
  width: min(1276px, calc(100% - 96px));
  margin-inline: auto;
}
.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(0, 1fr);
  gap: 30px;
  align-items: start;
}
```

Mọi kích thước là điểm khởi tạo, chỉnh theo overlay. Các form card nền trắng, bo 8–10 px, shadow nhẹ; tiêu đề section có số trong vòng tròn xanh. Summary viền/shadow mảnh; khoản tiền quan trọng xanh đậm.

## 2. Điều kiện vào trang và step flow

Trang cần `stayId/slug`, `roomTypeId`, ngày nhận/trả, adults/children/rooms hợp lệ. Resolve từ IDs, không tin price trong query. Direct `/dat-phong` thiếu selection hiển thị empty state có CTA “Chọn phòng nghỉ”, không tự chọn ngẫu nhiên một phòng để người dùng tưởng đã đặt.

Ảnh chuẩn là trạng thái **bước 2: Thông tin khách**. Để chụp đúng, mở route với selection fixture hợp lệ từ màn 02.

| Bước | Nội dung | Điều kiện |
|---|---|---|
| 1. Chọn phòng | Listing/detail hoặc edit-selection sheet | Room type/ngày/khách hợp lệ |
| 2. Thông tin khách | Form/add-on/coupon/payment plan như ảnh | Validate thông tin cần thiết |
| 3. Xác nhận | Xem lại bản nháp và lựa chọn | Không tự tạo booking/payment thành công |

Steps dùng semantic ordered list, `aria-current=step`; không cho bấm bước sau để bỏ validation. Quay lại sửa giữ draft trong memory, không đưa PII vào URL. Step 1 sửa selection bằng sheet hoặc route có provider giữ memory; không dùng link mù làm mất toàn bộ draft.

Copy hero:

```text
Đặt phòng cùng Đinh Vân Booking
Chỉ vài bước đơn giản để bắt đầu hành trình đáng nhớ của bạn
Thiên nhiên thật gần, trải nghiệm thật ý nghĩa
```

Giữ cảnh núi và hiên gỗ bên phải, script nhỏ, breadcrumb dưới hero. Không active “Trang chủ” nhầm trên header.

## 3. Thông tin khách — khối 1

Hai hàng, ba trường mỗi hàng ở desktop:

| Field | Bắt buộc | Quy tắc |
|---|---|---|
| Họ và tên | Có | Unicode, trim đầu/cuối, không regex ASCII-only |
| Số điện thoại | Có | `type=tel`, normalize phân cách, validate hình thức hợp lý |
| Email | Có trong flow demo này | `type=email`, autocomplete; không tự gửi mail |
| Quốc tịch | Không | Default Việt Nam, select có labels tiếng Việt |
| Số lượng khách | Có | Guest picker chung; chỉnh làm cập nhật summary và giá liên quan |
| Yêu cầu đặc biệt | Không | Ngắn, ví dụ giờ đến/ăn chay; giới hạn có hướng dẫn |

Label có dấu * rõ nhưng không chỉ dùng màu để biểu thị. Placeholder không là value. Giữ input thấp gọn trên desktop, mobile tối thiểu 44 px vùng thao tác. Validation cạnh field, focus đầu lỗi khi submit. Không thu giấy tờ định danh/thông tin thẻ thanh toán trong nhiệm vụ này.

`specialRequest` và `bookingNote` ở khối 3 là hai field riêng có mục đích rõ; không ghi đè nhau. Giới hạn mẫu 300 và 500 ký tự, không mất dấu tiếng Việt.

## 4. Dịch vụ bổ sung — khối 2

Bốn card cùng hàng: ảnh trên, checkbox góc trái, tên/giá/description dưới. Toàn card là label hợp lệ cho một checkbox, không lồng button; chọn ảnh hoặc nhãn đều cập nhật cùng state.

| Add-on ID | Tên mẫu | Đơn giá fixture | Cách tính rõ ràng |
|---|---|---:|---|
| `breakfast` | Ăn sáng đặc sản địa phương | 150.000đ | Theo khách tính phí × số ngày ăn sáng |
| `airport-transfer` | Xe đón tiễn sân bay | 300.000đ | Theo số lượt, không nhân số khách/đêm |
| `forest-tour` | Tour khám phá Cúc Phương | 450.000đ | Theo số người tham gia, một lần trong kỳ nghỉ |
| `bike-rental` | Thuê xe đạp | 50.000đ | Theo số xe × số ngày thuê |

Đây là mức giá giả lập để tái tạo UI, **không phải báo giá dịch vụ thật**. Mỗi add-on có `unit`, `quantity`, `selected`, constraints; không chỉ lưu boolean rồi tự nhân tất cả cùng một công thức.

Khi chọn dịch vụ cần số lượng, mở controls gọn trong card hoặc sheet: lượt xe, người tour, số xe/ngày thuê. Summary phải cho thấy số lượng. Bỏ chọn thì xóa khoản tiền và không để quantity cũ âm/NaN.

Nếu room fixture đã gồm bữa sáng thì không thu thêm cùng loại bữa sáng: disable/label “Đã bao gồm” hoặc lựa chọn nâng cấp riêng. Default fixture dùng tính tiền bên dưới phải đánh dấu **chưa gồm bữa sáng**.

## 5. Mã giảm giá và ghi chú — khối 3

Hai cột: coupon input + nút “Áp dụng” bên trái, ghi chú bên phải. Coupon trim/uppercase; fixture hợp lệ `DVAN10` giảm 10% trên subtotal đủ điều kiện của demo. Có pending, applied, invalid, remove. Reapply cùng mã không cộng dồn. Đổi selection/add-on tính lại discount; tổng không âm.

Mã không hợp lệ không được vẫn render dòng giảm tiền như thể thành công. “Xóa mã” khôi phục giá. Không tự kết nối hệ thống coupon thật hoặc cho rằng mã minh họa dùng được khi public.

## 6. Phương án và phương thức thanh toán — khối 4

Ảnh đặt ba ô ngang nhưng đang trộn **số tiền trả trước** với **phương thức trả tiền**. Code phải tách state, vẫn giữ hình học gần mẫu:

- Hai ô đầu thuộc radio group `paymentPlan`: **Đặt cọc 30%** / **Thanh toán toàn bộ**.
- Ô thứ ba “Chuyển khoản ngân hàng” là nhóm/phần phương thức hoặc trigger xem hướng dẫn, **không phải radio thứ ba cạnh tranh với 30%/100%**. Có thể chọn cọc và chuyển khoản cùng lúc.

`paymentPlan` và `paymentMethod` là hai trường độc lập. Chỉ hiển thị phương thức đang được cấu hình. Chưa có thông tin ngân hàng thật thì mở panel “Phương thức thanh toán đang được cập nhật — đây là giao diện mô phỏng”, không dựng QR nhận tiền, số tài khoản hoặc tên người nhận giả.

Không thêm Stripe/Square/PayPal/VNPAY chỉ vì đã dùng ở dự án khác. Không thu thông tin thẻ, không tạo payment intent hay webhook trong task UI này. Copy “SSL 256-bit”, “bảo mật tuyệt đối”, “xác nhận SMS” trong ảnh không tự coi là năng lực đã triển khai.

## 7. Summary bên phải và công thức tính

Summary gồm heading; ảnh chỗ nghỉ có tên; ngày nhận/trả có giờ/đêm; room type/khách; “Thay đổi lựa chọn phòng”; bảng tiền; tổng lớn; khoản trả trước và còn lại; CTA chính; thông tin chính sách và support.

Ngày/thứ tính từ ngày đang chọn bằng locale `vi-VN`, không hardcode “Thứ 6” cho ngày khác. Không dùng ngày 2024 như lựa chọn mặc định hiện tại. Môi trường test dùng clock cố định và ngày tương lai hợp lệ.

Model tính tiền dùng số nguyên VND, formatter chung. Cấu trúc tối thiểu:

```ts
type PaymentPlan = 'deposit' | 'full';
type PaymentMethod = 'bank-transfer' | null;

type PriceSummary = {
  roomSubtotalVnd: number;
  addOnSubtotalVnd: number;
  subtotalVnd: number;
  discountVnd: number;
  totalVnd: number;
  dueNowVnd: number;
  remainingVnd: number;
};
```

Công thức demo:

```text
nights           = số ngày lịch giữa checkOut và checkIn, phải > 0
roomSubtotal     = nightlyRate × nights × roomCount
breakfast        = 150000 × breakfastGuests × breakfastDays, nếu chọn
transfer         = 300000 × transferTrips, nếu chọn
tour             = 450000 × tourParticipants, nếu chọn
bike             = 50000 × bikeCount × rentalDays, nếu chọn
subtotal         = roomSubtotal + các khoản add-on đã chọn
discount         = min(subtotal, round(subtotal × 0.10)), nếu DVAN10 hợp lệ
total            = max(0, subtotal - discount)
dueNow           = paymentPlan=deposit ? round(total × 0.30) : total
remaining        = total - dueNow
```

Trong fixture baseline: số ngày ăn sáng bằng số đêm, người tính phí bằng adults + children để mô phỏng; đây không phải chính sách giá trẻ em thật. Số người tour do người dùng chọn, tối đa số khách. Số ngày thuê xe là trường riêng, mặc định bằng số đêm nhưng không tự tính thêm ngày checkout; hiển thị rõ cách tính. Bữa sáng/tour không nhân thêm roomCount. Giới hạn số lượt/xe hợp lý trong config, validate trước khi tính.

Demo không thêm thuế/phí chưa có dữ liệu. Không ghi “đã bao gồm toàn bộ thuế/phí” chỉ vì fixture chưa tính. Sau này backend phải là nguồn giá cuối; frontend không có quyền quyết định tổng tiền giao dịch.

### Fixture đối chiếu nhất quán

Ảnh gốc chưa tích Tour nhưng lại tính 900.000đ; room type Bungalow trong summary cũng không khớp giá thấp nhất. **Sửa hai lỗi này trong preview:** chọn `standard-garden` giá 650.000đ và tích cả breakfast + forest-tour; ghi ngoại lệ trong report. Giữ tổng tiền như mẫu:

| Khoản | Phép tính | VND |
|---|---|---:|
| Phòng Standard Garden | 650.000 × 2 đêm × 1 phòng | 1.300.000 |
| Ăn sáng | 150.000 × 2 người × 2 ngày | 600.000 |
| Tour rừng | 450.000 × 2 người | 900.000 |
| Tạm tính | Tổng ba khoản | 2.800.000 |
| DVAN10 | Giảm 10% | -280.000 |
| Tổng | Sau giảm | 2.520.000 |
| Trả trước 30% | 2.520.000 × 30% | 756.000 |
| Còn lại | Tổng – trả trước | 1.764.000 |

Đây là **fixture chụp ảnh/test được cấu hình rõ**. Khách tương tác bình thường không bị tự thêm dịch vụ/coupon mà chưa chọn. Bản preview có thể nạp fixture này bằng scenario dữ liệu, không dùng CSS/hotspot riêng cho screenshot và không bỏ validation.

## 8. CTA, bước xem lại và trạng thái kết quả

Giữ style CTA “Giữ chỗ ngay” trong ảnh ở bước 2; click thực hiện validation rồi sang bước 3 xem lại. Ngay trong bước review phải nói rõ đây là mô phỏng, không có phòng bị giữ và chưa có thanh toán.

Bước 3 không có ảnh riêng, dựng cùng components: heading “Kiểm tra thông tin đặt phòng”, summary lựa chọn, thông tin khách, dịch vụ, tổng và plan; nút sửa từng phần, checkbox xác nhận thông tin đã kiểm tra. CTA demo dùng **“Lưu bản nháp trên giao diện”** hoặc **“Xem trước yêu cầu”**, không “Đã đặt thành công”. Bản nháp chỉ ở memory và có thông báo chưa gửi.

Không sinh mã booking nhìn như mã thật, không gắn trạng thái `confirmed/paid` dựa vào click. Không hiển thị QR/thành công chuyển khoản sau một timeout. Khi chưa có API, trạng thái kết thúc chỉ `draft/review/demo-preview`.

State machine tối thiểu:

```text
missing-selection → chọn phòng
valid-selection → editing
editing + invalid form/selection → validation-errors
editing + valid data → review
review → edit (giữ memory draft)
review + demo action → demo-preview (chưa gửi/chưa thanh toán)
```

Các state integration tương lai như `submitting/payment-pending/confirmed` có thể định nghĩa interface/test harness nhưng không kích hoạt giả ở runtime demo. Không làm integration thật nếu chưa có yêu cầu riêng.

Link “Điều khoản dịch vụ”, “Chính sách hủy phòng”, “Chính sách thanh toán” mở dialog nội dung đã được chủ website duyệt. Chưa có thì ghi đang cập nhật; không tự viết cam kết pháp lý. Support dùng contact config thật hoặc fallback, không lấy số trong ảnh.

## 9. Responsive và accessibility

Tablet giữ hai cột nếu đọc được; dưới khoảng 1024 px đưa summary thành khối theo luồng. Mobile thứ tự: hero ngắn → steps → summary thu gọn chỉnh được → thông tin khách → add-ons → coupon/note → plan/method → tổng chi tiết → CTA/support. Add-ons hai cột hoặc một cột, không bốn card quá hẹp.

Có thể dùng sticky bottom tổng tiền + tiếp tục, nhưng phải đọc cùng state/validation và có padding/safe-area; không hai nút submit tạo hai lần xử lý. Error không bị bar che; đưa focus đúng field. Summary accordion có accessible state; `aria-live=polite` chỉ thông báo tổng thay đổi gọn, không đọc lại cả trang mỗi phím.

Dropdown/date picker/phone/email hoạt động trên mobile; khi bàn phím mở không che trường đang sửa. Không disable submit vô thời hạn mà không giải thích còn thiếu gì. Prevent double click trong transition bằng state thật.

## 10. Kiểm thử phép tính và hành vi bắt buộc

Tách hàm thuần để unit test, UI chỉ đọc một `PriceSummary`; không tính lại bằng công thức khác ở sticky/mobile/summary.

| Test | Kết quả với fixture baseline |
|---|---|
| Baseline: 2 đêm, breakfast + tour, DVAN10, cọc | Tổng 2.520.000; trả trước 756.000; còn lại 1.764.000 |
| Bỏ tour, giữ breakfast + DVAN10 | Subtotal 1.900.000; tổng 1.710.000; cọc 513.000; còn 1.197.000 |
| Bỏ tất cả add-on và coupon | Tổng 1.300.000; cọc 390.000; còn 910.000 |
| Baseline, chuyển trả toàn bộ | Trả trước 2.520.000; còn 0 |
| Baseline, xóa coupon | Tổng 2.800.000; cọc 840.000; còn 1.960.000 |
| Baseline, thêm 1 lượt transfer | Subtotal 3.100.000; tổng 2.790.000; cọc 837.000 |
| Reapply DVAN10 nhiều lần | Vẫn chỉ giảm một lần |
| Đổi Standard thành Family, giữ các lựa chọn baseline | Subtotal 3.900.000; tổng 3.510.000; cọc 1.053.000 |
| Same-day/checkout trước check-in/NaN/ID sai | Chặn, thông báo tiếng Việt, không tạo tổng NaN/âm |

Test thêm: roomCount=2 không nhân đôi tour/breakfast tự động; occupancy quá mức; child count; người tour vượt guests; rentalDays=0 khi chọn xe; query có price giả bị bỏ qua; sửa rồi review giữ dữ liệu; thiếu contact config; không PII vào URL/storage/log; không network payment/email ngoài ý muốn.

Component: `CheckoutHero`, `BookingSteps`, `GuestInformationForm`, `AddOnCard`, `CouponForm`, `PaymentPlanSelector`, `PaymentMethodPanel`, `BookingSummary`, `BookingReview`, `DraftPreview`, `SupportCard`.

## 11. Checklist nghiệm thu riêng

```text
[ ] Đúng hai cột form/summary, hero thấp, steps và bốn khối đánh số.
[ ] Direct route thiếu selection có empty state, không chọn phòng ngầm.
[ ] Form có đủ label/validation, số khách đồng bộ pricing/occupancy.
[ ] Add-on checkbox/quantity và dòng tiền hoàn toàn khớp.
[ ] Room type Standard/Deluxe/Family không lẫn giá.
[ ] Payment plan khác payment method, cọc + chuyển khoản chọn được cùng lúc.
[ ] Test số tiền trong bảng đã chạy, một nguồn tính cho mọi summary.
[ ] Step 3 xem lại/sửa được, không giả giữ chỗ/booking/paid thành công.
[ ] Không có QR/tài khoản/cổng thanh toán hoặc contact tự bịa.
[ ] Responsive/keyboard/safe-area/error focus đúng, không che submit.
[ ] Có screenshot desktop/mobile/overlay và báo rõ hiệu chỉnh lỗi trong ảnh.
```
