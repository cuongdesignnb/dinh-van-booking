# Admin run-to-goal matrix — 2026-09-27

Đây là trạng thái đọc từ route/component hiện hành và backend local, không dựa trên thiết kế fixture cũ.
Stack local được build và kiểm tra tại `http://127.0.0.1:18473`; không có thao tác production.

| Route | Trạng thái | Nguồn dữ liệu / thao tác thật | Giới hạn còn lại |
|---|---|---|---|
| `/admin` | `PENDING` | Chưa có dashboard/report API; trang nói rõ không có KPI mẫu. | Chưa có tổng quan vận hành. |
| `/admin/dat-phong` | `PENDING` | Chưa có admin booking workflow. | Checkout hiện là yêu cầu tư vấn; chưa xác nhận booking/giữ tồn/thu tiền. |
| `/admin/phong-nghi` | `REAL_API` | `/properties`: đọc/tạo/sửa/xoá hồ sơ nơi lưu trú; dữ liệu nối `ContentNode`/`Property`, hạng phòng, đơn vị và rate plan. Có thể tạo draft và chủ động publish khi checklist đạt. | Màn hiện không sửa hạng phòng/đơn vị/tồn/giá đã có; không giả lập availability. Các 11 cơ sở Cúc Phương hiện đều là draft chờ xác minh. |
| `/admin/combo-du-lich` | `REAL_API` | `AdminContentList(kind="combo")`; `/content` tạo/sửa/xoá, revision và trạng thái xuất bản; projection combo trong PostgreSQL. | Booking/departure và payment workflow chưa đủ để coi đây là hệ thống bán tour hoàn chỉnh. |
| `/admin/diem-den` | `REAL_API` | `AdminContentList(kind="destination")`; nội dung, media, revision, SEO và publish qua API. | Chưa có bản ghi public ở database local. |
| `/admin/khach-hang` | `PENDING` | Không render CRM fixture. | Quản lý hồ sơ khách hàng chưa được nối API. |
| `/admin/yeu-cau-tu-van` | `REAL_API` | `/inquiries`: inbox phân trang, xem dữ liệu PostgreSQL và cập nhật stage có optimistic version/audit log. Form public tạo inquiry. | Local DB hiện không có inquiry nào để thao tác; chưa có gửi SMS/Zalo/email. |
| `/admin/noi-dung` | `REAL_API` | `AdminContentList(kind="article")`; editor TipTap, Media Library, AI assistant, SEO, revisions, draft/publish/unpublish/delete. | Chỉ nội dung đã publish và đủ điều kiện mới public/indexable. |
| `/admin/chuyen-trang` | `REAL_API` | `AdminContentList(kind="page")`; trang tĩnh route riêng, rich content, SEO, ảnh, trạng thái publish. | Trang mới chưa public cho tới khi chủ động xuất bản. |
| `/admin/menu` | `REAL_API` | `/navigation/primary`: sắp xếp, bật/tắt, thêm chuyên trang đã publish; `PUT` lưu và ghi audit. `DELETE` khôi phục menu mặc định, cũng audit. | Chỉ chuyên trang đã publish được thêm; menu không thay thế quản lý quyền truy cập. |
| `/admin/thu-vien-anh` | `REAL_API` | `/media`: upload/list/filter/edit alt-caption/delete. Upload chuyển sang WebP, dùng chung trong picker; media URL được kiểm quyền. | Chưa có asset media được giữ lại từ kiểm thử cuối. Chỉ tải file có quyền sử dụng. |
| `/admin/khuyen-mai` | `PENDING` | Trạng thái chờ được ghi rõ, không có form lưu giả. | Chưa có promotion API. |
| `/admin/thanh-toan` | `PENDING` | Trạng thái chờ được ghi rõ, không có thao tác thanh toán giả. | Chưa tích hợp cổng thanh toán/đối soát. |
| `/admin/bao-cao` | `PENDING` | Chưa có reporting API hoặc số liệu mẫu. | Chưa có báo cáo. |
| `/admin/cai-dat` | `REAL_API` | `/settings` biểu mẫu trực quan; setting version được lưu vào PostgreSQL. AI provider keys qua `/ai/settings` được mã hoá phía server. | Chưa cấu hình provider API key ở môi trường này; không hiển thị hoặc commit key. |

## Nền và bằng chứng

- `/admin` được bọc bởi `AdminAuthGate`: tài khoản, role và logout lấy từ phiên API; route admin không dùng local demo role làm bảo mật.
- Topbar không còn ô tìm kiếm, chuông, date range hoặc tài khoản tĩnh giả; sidebar không còn badge unread từ store fixture. Pending modules không có button “lưu thành công”.
- Hình ảnh qua picker chọn từ cùng Media Library. API media lưu storage key theo `YYYY/MM/...`; hook đã cho phép path segment hợp lệ, đồng thời từ chối `..`, segment rỗng/`.` và backslash.
- CMS article luôn tạo typed `Article` projection row, kể cả khi API caller bỏ qua metadata article tuỳ chọn; điều này tránh trạng thái publish thành công nhưng public article API trả 404.
- Ma trận được xác minh bởi backend smoke (54/54), backend unit tests (11/11), frontend typecheck/lint và Playwright (26/26), xem handoff production để biết giới hạn môi trường.
