# Asset audit — admin

Admin dùng lại toàn bộ ảnh của website công khai (`public/images/dinh-van-booking/**`) thay vì cắt
ảnh mới từ mockup, nên thumbnail của một nơi lưu trú, combo hay điểm đến luôn trùng với trang khách.
Phần ảnh cắt thêm riêng cho admin nằm dưới đây.

| Asset | Nguồn | Dùng ở | Hạn chế còn lại |
|---|---|---|---|
| `people/admin-avatar.webp` | Cắt từ `references/a.png` (48 × 48) | Avatar trên topbar | Nhân vật minh họa trong mockup, không phải ảnh người thật; độ phân giải 1×, nhòe trên màn retina |
| Ảnh nền sidebar | Dùng lại `hero-cuc-phuong.webp` của website | Trang trí cuối sidebar | Ảnh sidebar trong mockup có chữ viết tay nhúng sẵn nên không dùng được; bản thay thế khác bố cục ảnh mẫu |
| Lá trang trí góc sidebar | SVG `LeafSprig`, `SmallLeaf` (có sẵn trong dự án) | Góc trên sidebar | Hình dạng lá khác mockup; đổi lại là SVG nên sắc nét mọi kích thước |
| Logo núi | SVG `DinhVanMark` | Sidebar, footer | Không crop từ ảnh |
| Ảnh chân dung khách hàng | Không trích xuất | — | Ảnh trong mockup là hình minh họa; giao diện dùng chữ cái đầu tên nên không cần ảnh |
| Ảnh nơi lưu trú / combo / điểm đến | `public/images/dinh-van-booking/**` (đã audit ở `docs/asset-audit.md`) | Thẻ phòng nghỉ, combo, bảng điểm đến, thư viện ảnh | Vẫn là ảnh tái dựng 1× từ mockup website; xem audit gốc |

Script trích ảnh: `python scripts/extract-admin.py` (chạy trong thư mục `scripts/`).

## Thiếu / cần chủ website cung cấp

1. Ảnh gốc độ phân giải cao cho tất cả nơi lưu trú, combo, điểm đến (dùng chung với website).
2. Ảnh đại diện thật của quản trị viên/nhân viên, nếu muốn thay hình minh họa.
3. Bộ ảnh riêng cho từng combo (hiện mỗi combo chỉ có 1 ảnh bìa nên “Xem thêm ảnh (1)”).
4. Logo Zalo chính thức nếu muốn hiển thị biểu tượng; hiện dùng nút chữ “Chat Zalo”.
5. Dữ liệu kinh doanh thật: giá, tồn phòng, đánh giá, doanh thu, lượt truy cập, danh sách khách hàng,
   yêu cầu tư vấn. Toàn bộ số liệu hiện tại là dữ liệu mẫu sinh theo seed cố định.
6. Số điện thoại, Zalo, email, địa chỉ thật (hiện `null` trong `src/config/site.ts`; admin dùng số mẫu
   `0900 xxx xxx`).
