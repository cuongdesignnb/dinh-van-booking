# Trạng thái triển khai admin

**DONE** = có bố cục theo ảnh, thao tác thật trên dữ liệu mẫu, responsive và đã chụp ảnh đối chiếu.
**PARTIAL** = dùng được nhưng còn giới hạn ghi bên dưới. Không có module nào chỉ là giao diện tĩnh.

| Màn | Route | Trạng thái |
|---|---|---|
| A — Tổng quan | `/admin` | DONE |
| B — Đặt phòng | `/admin/dat-phong` | DONE |
| C — Phòng nghỉ | `/admin/phong-nghi` | DONE |
| D — Combo du lịch | `/admin/combo-du-lich` | PARTIAL (chưa có editor lịch khởi hành cố định) |
| E — Điểm đến & nội dung | `/admin/diem-den`, `/admin/noi-dung` | PARTIAL (editor nội dung là văn bản có đánh dấu, chưa phải rich-text WYSIWYG) |
| F — Khách hàng & tư vấn | `/admin/khach-hang`, `/admin/yeu-cau-tu-van` | DONE |
| Khuyến mãi / Thanh toán / Báo cáo / Cài đặt | `/admin/khuyen-mai`, … | Ngoài phạm vi — có route và panel giải thích, không giả lập dữ liệu |

## Nền dùng chung

- `AdminShell`: sidebar 12 mục (active đúng route, badge tư vấn lấy từ số yêu cầu chưa đọc), topbar
  (tiêu đề theo route, command palette Ctrl/⌘ + K, chuông, hồ sơ + vai trò thử nghiệm, date range),
  footer kem, hệ thống toast. Sidebar thành drawer dưới 1100 px.
- Dữ liệu: `src/data/admin/*` sinh theo seed cố định (`mulberry32`) với đồng hồ demo
  `2024-11-15T12:00+07:00`. 8 nơi lưu trú, 24 loại phòng, 28 đơn vị phòng, **245 đơn đặt phòng**,
  256 khách hàng, 32 yêu cầu tư vấn, 6 combo, 7 điểm đến, 6 bài viết, 25 tệp media.
- Selector chung (`src/lib/admin/selectors.ts`) cho mọi con số: tồn phòng theo ngày, công suất theo kỳ,
  doanh thu, đếm booking, thống kê CRM, checklist SEO, quy tắc giá.
- Repository demo: `commit(label, updater, toast)` trong `AdminStore` — có độ trễ giả, validation,
  rollback khi lỗi, toast riêng cho lỗi/thành công, lưu vào `localStorage` (có nút khôi phục mẫu gốc).
- Vai trò thử nghiệm owner/editor/viewer: viewer bị chặn mọi mutation (ghi rõ đây không phải
  lớp bảo mật thật).

## Chi tiết từng màn

### A — Tổng quan
6 KPI (có tooltip định nghĩa, click sang màn liên quan), biểu đồ doanh thu (cột thực tế + cột dự kiến +
đường số đơn, hai trục, tooltip bàn phím, bảng dữ liệu cho screen reader, bật/tắt legend), donut tình
trạng phòng + legend cộng khớp tổng, lịch tháng (đổi tháng, chọn ngày lọc danh sách), “Đặt phòng sắp
tới”, “Phòng cần xác nhận” (dialog xác nhận, cập nhật đồng bộ), “Yêu cầu tư vấn gần đây”, top 5 nơi lưu
trú, 4 thao tác nhanh, bảng tổng quan doanh thu khớp KPI.

### B — Đặt phòng
Bộ lọc: từ khóa (không dấu), khoảng thời gian có chọn *theo ngày nhận phòng / ngày tạo đơn*, trạng thái
(gồm 2 mục theo thanh toán), kênh, loại dịch vụ, số khách, sắp xếp, xóa lọc, xuất CSV. Bảng 12 cột,
chọn theo trang với trạng thái indeterminate, hành động hàng loạt báo riêng số thành công/bỏ qua,
page size 15/30/50, phân trang, toàn bộ state nằm trên URL. Cột phải: 6 ô tổng quan (bấm để lọc), lịch
công suất theo tồn kho, panel chi tiết 4 tab (Thông tin chung/Khách hàng/Thanh toán/Ghi chú) với
xác nhận, hủy (bắt buộc lý do, không tự hoàn tiền), soạn tin nhắn (chỉ xem trước + copy), in phiếu
(CSS `@media print`, ghi “Bản demo”), sửa thông tin. Drawer tạo/sửa đơn kiểm tra sức chứa, tồn phòng
theo từng đêm và tính tiền theo quy tắc giá. 3 widget cuối: check-in, check-out, đơn mới.

### C — Phòng nghỉ
5 KPI (ghi rõ đơn vị “đơn vị phòng”), bộ lọc 5 trường + “Thêm phòng nghỉ”, danh sách grid/list với
sort và page size; thẻ có badge hoạt động, mã `PN-xx`, rating mẫu, giá, tiện ích, số phòng còn theo ngày
và 3 nút thao tác + ghim nội bộ. Editor 5 tab (Thông tin chung/Loại phòng/Ảnh & tiện ích/Chính sách/SEO)
với slug tự sinh nhưng không ghi đè khi sửa tay, kiểm tra trùng slug, cảnh báo thay đổi chưa lưu.
3 panel dưới: bảng loại phòng theo cơ sở đang chọn (modal thêm/sửa, kiểm tra số phòng so với đơn đang
giữ), quy tắc giá (2 toggle, danh sách mùa, modal có preview giá 5 ngày, cảnh báo xung đột cùng mức ưu
tiên), bảng tồn phòng 7 ngày (click ô mở chi tiết tổng/đã đặt/bảo trì/tạm khóa/còn lại và khóa phòng
có lý do, chặn khóa khi hết phòng).

### D — Combo du lịch
5 KPI, bộ lọc 4 trường + tìm kiếm + “Tạo combo mới”, danh sách card ngang có badge/giá/lượt đặt/menu
(sửa, nhân bản thành bản nháp, tạm dừng, xem booking liên quan) và phân trang. Chi tiết: ảnh bìa + chữ
viết tay DOM, số liệu tóm tắt, ưu đãi (ghi rõ khi hết hạn), 5 tab (Lịch trình có timeline + bao gồm/không
bao gồm, Thông tin chung, Hình ảnh, Giá & lịch khởi hành, Đánh giá). Editor: thông tin, ảnh bìa qua media
picker, itinerary thêm/xóa/di chuyển bằng nút, cảnh báo lệch số ngày, bao gồm/không bao gồm.
**Giới hạn:** chưa có bảng lịch khởi hành cố định (ngày, tổng chỗ, đã bán) — tab hiện ghi rõ điều này.

### E — Điểm đến & nội dung
4 tab: Điểm đến, Bài viết, SEO & nội dung, Thư viện ảnh. KPI 5 ô lấy từ dữ liệu thật. Bảng điểm đến 9
cột (checkbox, thumbnail, danh mục, trạng thái, cập nhật, cột SEO tính từ checklist), sửa/nhân bản/menu
(xem trước, ẩn/xuất bản, xóa có kiểm tra liên kết combo). Editor bên phải 4 tab, mô tả ngắn có đếm ký
tự, thẻ nội dung thêm/xóa, toolbar định dạng thao tác thật (đậm/nghiêng/danh sách/liên kết có kiểm tra
URL), preview SEO Desktop/Mobile dùng domain `.example`, checklist xuất bản computed. Thư viện ảnh:
lọc, upload có validate loại/kích thước (nói rõ chỉ xem trước trong phiên), chi tiết ảnh + alt, xóa có
kiểm tra “đang dùng ở đâu”. **Giới hạn:** trình soạn thảo là textarea có đánh dấu đơn giản, chưa phải
rich-text WYSIWYG.

### F — Khách hàng & yêu cầu tư vấn
2 tab (Khách hàng / Yêu cầu tư vấn), 5 KPI, bộ lọc 4 trường + thêm khách (cảnh báo trùng số điện thoại).
Bảng CRM 10 cột với số booking/giá trị/lần đặt gần nhất tính từ `customerId`. Pipeline 4 cột: kéo–thả
đổi giai đoạn **và** menu “Chuyển trạng thái” cho bàn phím/cảm ứng, “Xem thêm N yêu cầu”. Panel phải:
hồ sơ, 3 tab (Thông tin với thẻ nhu cầu, Lịch sử trao đổi phân biệt tin nhắn với ghi chú nội bộ,
Lịch sử đặt phòng liên kết sang màn B), hẹn follow-up (tạo/hoàn tất, cảnh báo quá hạn), 4 nút cuối
(Gọi lại / Chat Zalo chỉ xem trước, Tạo booking mở drawer màn B, Đánh dấu đã xử lý).

## Luồng xuyên màn đã kiểm thử

A → B (đơn sắp tới, quick action), A → F (yêu cầu tư vấn), B ↔ C (tồn phòng, catalogue), D → B (theo
`comboId`), F → B (tạo booking từ hồ sơ khách), E → C/D (chọn ảnh từ cùng thư viện), F pipeline ↔ badge
sidebar ↔ KPI.

## Không làm (và không giả lập)

Gửi Zalo/SMS/email thật, thu tiền, đồng bộ Booking.com/Agoda, xuất bản lên website production, tạo
redirect thật khi đổi slug, upload ảnh lên máy chủ, đăng nhập/phân quyền thật, module Khuyến mãi /
Thanh toán / Báo cáo / Cài đặt.
