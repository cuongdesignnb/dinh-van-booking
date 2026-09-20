# Kiểm chứng giao diện admin — 2026-09-20

Môi trường: Windows 11, Next.js production build (`next build && next start -p 3100`), Playwright
Chromium headless, locale `vi-VN`, timezone `Asia/Ho_Chi_Minh`, zoom 100%, deviceScaleFactor 1,
`prefers-reduced-motion: reduce`, dữ liệu mẫu ở trạng thái gốc (đồng hồ demo 15/11/2024).

## Kết quả kiểm tra kỹ thuật

| Bài kiểm tra | Lệnh | Kết quả |
|---|---|---|
| Lint | `npm run lint` | Pass, 0 cảnh báo |
| Typecheck | `npm run typecheck` | Pass |
| Production build | `npm run build` | Pass (các route `/admin/*` là dynamic do đọc `searchParams`) |
| Test tự động | `npx playwright test` | **77/77 pass**, trong đó 40 test riêng cho admin |
| Console / pageerror | script chụp ảnh + test shell | Không có lỗi trên cả 8 route admin |
| Tràn ngang | `node scripts/docoverflow.mjs` | 0 px ở 1448 / 1280 / 1024 / 768 / 390 trên mọi màn |
| Tiếng Việt | test shell | Không có mojibake (`Ä‘`, `Æ°`, `áº`, `á»`), không có `U+FFFD`, không có “Đinh Văn” |
| Icon | test shell | Mọi nút chỉ có icon đều có `aria-label`; không dùng emoji hay icon font |

## Bộ test admin (40 ca)

- **Shell:** 8 route đúng tiêu đề/menu active, 4 module ngoài phạm vi hiển thị panel giải thích,
  command palette (Ctrl+K) mở đúng record và trả focus khi Escape, chuông + date range, vai trò
  “Chỉ xem” bị chặn ghi dữ liệu, responsive 4 kích thước, drawer sidebar trên mobile.
- **Màn A:** KPI ↔ donut ↔ bảng doanh thu khớp số (legend cộng đúng tổng, tổng doanh thu = tổng 3 dòng),
  tooltip biểu đồ, bật/tắt legend, chọn ngày trong lịch, quick action, xác nhận đơn.
- **Màn B:** lọc theo trạng thái/kênh, xóa lọc, page size, phân trang, giữ state khi reload,
  checkbox indeterminate theo trang, 4 tab chi tiết, ghi chú nội bộ, xác nhận, hủy có lý do bắt buộc,
  payment status không đổi khi hủy, composer tin nhắn chỉ xem trước, xuất CSV, tạo đơn có kiểm tra
  sức chứa và tồn phòng.
- **Màn C:** lọc + grid/list, editor có validation, tạm ẩn/hiện lại, sửa loại phòng (giá > 0),
  thêm mùa cao điểm có preview giá theo ngày, mở ô tồn phòng và khóa phòng có lý do.
- **Màn D:** lọc thời lượng, 5 tab, số ảnh đúng dữ liệu, cảnh báo lệch ngày/lịch trình, nhân bản tạo
  bản nháp, mở danh sách booking theo `comboId`.
- **Màn E:** slug không tự đổi sau khi sửa tay, thêm thẻ, toolbar soạn thảo, lưu, xem trước bản nháp,
  tab SEO liệt kê đúng trường thiếu, thư viện ảnh chặn xóa ảnh đang dùng, `/admin/noi-dung` mở tab Bài viết.
- **Màn F:** bảng 256 khách, 3 tab hồ sơ, ghi chú nội bộ, hẹn follow-up, nút liên hệ chỉ xem trước,
  quy tắc “Đã chốt” cần booking, “Đánh dấu đã xử lý” khác “Đã chốt”, cảnh báo trùng số điện thoại,
  `/admin/yeu-cau-tu-van` mở tab yêu cầu.

## Ảnh chụp

`artifacts/admin/<A–F>/`: `desktop.png` (1448 × 1086), `desktop-full.png`, `w1280.png`, `w1024.png`,
`w768.png`, `mobile.png`, `mobile-full.png`, `overlay.png` (chồng 50% với ảnh mẫu), `diff.png`.

`artifacts/admin/states/`: `B-selected-booking`, `B-confirm-dialog`, `B-cancel-validation`,
`B-create-drawer`, `C-property-editor`, `C-season-modal`, `C-inventory-dialog`, `D-combo-editor`,
`E-media-library`, `E-seo-tab`, `F-customer-history`, `F-contact-preview`.

Sai khác trung bình theo độ sáng so với ảnh mẫu (không phải chỉ số “giống nhau”; bị chi phối bởi font
thay thế, ảnh tái dựng và các khác biệt dữ liệu đã ghi trong `reference-deviations.md`):
A = 31.3, B = 25.8, C = 47.8, D = 37.4, E = 33.3, F = 26.9 (/255).

## Đối chiếu theo vùng

```text
A / Sidebar:      hình học đã khớp; ảnh trang trí là bản thay thế (ảnh mẫu nhúng chữ viết tay).
A / KPI + chart:  đúng 6 KPI, hai trục, tooltip; thêm cột “Dự kiến” cho phần chưa hoàn tất.
A / Donut + lịch: khớp bố cục; số liệu tính lại nên khác ảnh (xem deviations).
B / Bảng booking: bố cục 12 cột đã đối chiếu; thêm nhãn thanh toán phụ dưới badge trạng thái.
B / Cột phải:     6 ô tổng quan, lịch công suất, panel chi tiết 4 tab — đúng thứ tự ảnh.
C / KPI + lọc:    khớp; danh sách hiển thị 8 nơi lưu trú (ảnh chỉ vẽ 4) nên phần dưới lùi xuống.
C / 3 panel dưới: đúng thứ tự loại phòng → mùa giá → tồn phòng 7 ngày.
D / List-detail:  tỷ lệ 47/53 như ảnh; ảnh bìa, badge và chữ viết tay là lớp DOM.
E / Bảng + editor: 4 tab, preview SEO Desktop/Mobile và checklist đúng bố cục ảnh.
F / CRM:          bảng + pipeline 4 cột + hồ sơ bên phải đúng ảnh; avatar dùng chữ cái đầu.
```

## Phần chưa kiểm chứng

- Chưa kiểm thử trên trình duyệt thật ngoài Chromium (Firefox/Safari/thiết bị iOS–Android thật).
- Chưa chạy kiểm thử với công cụ đọc màn hình; mới kiểm tra bằng thuộc tính ARIA và bàn phím.
- Bản in (`In phiếu đặt phòng`) mới kiểm tra bằng CSS `@media print`, chưa in ra giấy/PDF thật.
- Kéo–thả pipeline được kiểm thử qua menu “Chuyển trạng thái”; thao tác kéo chuột thật chưa có test tự động.
- Zoom 200% mới xem thủ công ở màn A và B, chưa kiểm tra hết 6 màn.
