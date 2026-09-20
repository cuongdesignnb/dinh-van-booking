# Sai khác có chủ ý so với ảnh mẫu admin

Ảnh mẫu là bản thiết kế phẳng, có một số chỗ mâu thuẫn số học hoặc nghiệp vụ. Phần dưới ghi lại
những chỗ bản lập trình **cố ý làm khác**, kèm lý do. Các sai khác do font/ảnh/anti-alias nằm trong
`ui-verification.md`.

## Thương hiệu và chữ

| Ảnh mẫu | Bản lập trình | Lý do |
|---|---|---|
| “Đinh Văn Booking” ở một số chỗ | “Đinh Vân Booking” ở mọi nơi | Tên thương hiệu đúng; test tự động chặn chuỗi “Đinh Văn” |
| Mã nơi lưu trú `#DP2401…` trên thẻ phòng nghỉ (màn C) | `PN-01…` | `#DP…` là mã đặt phòng; tài liệu yêu cầu tách ID hai thực thể |

## Số liệu không tự khớp trong ảnh

| Ảnh mẫu | Bản lập trình | Lý do |
|---|---|---|
| Tổng quan: donut “18 phòng”, bảng tồn phòng màn C cộng ra 26 | Toàn hệ thống **28 đơn vị phòng**, mọi nơi cùng đếm theo `RoomUnit` | Một định nghĩa duy nhất cho “số phòng”; donut, KPI và bảng tồn phòng lấy chung selector |
| Donut ghi “Bảo trì 0 phòng” trong khi màn C ghi “Đang bảo trì 2” | Bảo trì lấy theo `InventoryOverride` của ngày đang xem (hiện là 2 phòng) | Bảo trì là điều kiện theo ngày, không phải nhãn tĩnh |
| Doanh thu tháng `128.450.000đ` nhưng ba dòng cộng lại `127.950.000đ` | Cả KPI lẫn bảng “Tổng quan doanh thu” lấy từ một selector; tổng luôn bằng tổng các dòng | Không sao chép lỗi cộng |
| Tỷ lệ lấp đầy 78% cố định | Tính `phòng đang có khách / tổng phòng` theo ngày dữ liệu mẫu | Số phải đổi khi dữ liệu đổi |
| Màn B: 5 ô trạng thái + “Tổng cộng 245” (cộng 5 ô ≠ 245) | Vẫn giữ 6 ô nhưng ghi rõ “Đã thanh toán” là chỉ số thanh toán, có thể trùng trạng thái đặt phòng | Booking status và payment status là hai nhóm khác nhau |
| Màn B: dòng “Hoàn tất” cho kỳ lưu trú còn ở tương lai | Trạng thái suy ra từ ngày so với đồng hồ demo (15/11/2024): tương lai chỉ có thể “Chờ xác nhận”/“Đã xác nhận” | Không hoàn tất một kỳ lưu trú chưa diễn ra |
| Màn D: “Xem thêm ảnh (12)” | Hiện đúng số ảnh đang có trong dữ liệu (1) | Không ghi số ảnh không tồn tại |
| Màn E: “Tệp media 245” | Hiện số tệp thật trong thư viện demo (25) | Số phải lấy từ dữ liệu |
| Màn F: “Khách hàng mới 86”, “Khách quay lại 124” | Tính từ dữ liệu: khách tạo trong kỳ và khách có ≥ 2 booking | Cùng lý do |

## Bố cục

| Ảnh mẫu | Bản lập trình | Lý do |
|---|---|---|
| Màn C chỉ có 4 thẻ nơi lưu trú | Hiện đủ **8 nơi lưu trú** của website (2 hàng), page size 12 | Admin và website công khai dùng chung danh mục; ẩn bớt sẽ là dữ liệu giả |
| Màn C: bảng loại phòng có 5 dòng chung chung | Bảng gắn với **một nơi lưu trú đang chọn** (Forest Homestay có 3 loại phòng) + selector phạm vi | Loại phòng thuộc về một cơ sở; trộn nhiều cơ sở mà không có cột nhận diện là sai |
| Sidebar rộng khác nhau giữa các ảnh (200 px ở A, ~170 px ở C/D) | Một shell duy nhất, sidebar 200 px | Menu không được nhảy vị trí khi chuyển route |
| Chữ viết tay nằm trong ảnh nền sidebar | Ảnh nền là ảnh rừng sạch của website, chữ viết tay là DOM | Không nhúng chữ vào ảnh; giữ khả năng dịch/đọc |
| Nút “Xuất Excel” (màn B) | “Xuất CSV”, có ghi chú chưa có bản `.xlsx` | Repo chưa có thư viện tạo xlsx; không đổi đuôi CSV thành .xlsx |

## Nghiệp vụ được làm rõ thêm

- Trái tim trên thẻ phòng nghỉ = **ghim nội bộ trong trang quản trị**, có nhãn và trạng thái riêng,
  không phải “yêu thích của khách” cũng không phải “nổi bật trên trang chủ” (cờ riêng trong editor).
- “Tạm ẩn” chỉ đổi trạng thái hiển thị; “Bảo trì” là điều kiện tồn phòng theo ngày.
- “Đã chốt” là trạng thái của yêu cầu tư vấn, chỉ đặt được khi khách đã có booking hợp lệ;
  “Đánh dấu đã xử lý” là hành vi khác (đọc + chuyển sang Đang tư vấn).
- Hủy đơn không tự hoàn tiền; trạng thái thanh toán giữ nguyên và ghi rõ trong hộp thoại.
- Số điện thoại/email trong ảnh mẫu không được tái sử dụng. Dữ liệu demo dùng số dạng
  `0900 xxx xxx` và email `@example.com`, nút “Gọi lại”/“Chat Zalo” chỉ mở bản xem trước.
- Ảnh chân dung khách hàng trong ảnh mẫu là hình minh họa nên **không** được gán cho hồ sơ khách;
  giao diện dùng chữ cái đầu tên. Ảnh đại diện quản trị viên giữ lại từ ảnh mẫu (nhân vật minh họa).
