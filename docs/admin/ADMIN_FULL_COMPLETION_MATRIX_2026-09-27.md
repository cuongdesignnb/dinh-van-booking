# Đinh Vân Booking — ma trận hoàn tất admin

Snapshot xác minh local ngày 27/09/2026; **không còn là ma trận hiện hành** vì route `/admin/hang-phong` và các kiểm thử sau đó đã được bổ sung. Dùng [ma trận route/API/bằng chứng 29/09](../END_TO_END_ROUTE_API_EVIDENCE_MATRIX_2026-09-29.md) cho trạng thái hiện nay. Module chưa có dịch vụ ngoài (ví dụ cổng thanh toán) vẫn không được coi là đã tích hợp.

Ma trận chi tiết bắt buộc theo screen → action → API → service → Prisma → permission → browser test ở [full-completion-matrix.md](./full-completion-matrix.md).

| Khu vực | Route | Màn hình và thao tác đã nối API | Bằng chứng chính |
|---|---|---|---|
| Tổng quan | `/admin` | KPI và hoạt động lấy từ PostgreSQL; không dùng KPI demo | `tests/admin/full-completion.spec.ts`; `tests/admin/operations.spec.ts`; runtime audit |
| Đặt phòng | `/admin/dat-phong` | Tìm/lọc, xem chi tiết, tạo booking qua quote + hold, trạng thái, ghi chú, huỷ theo quyền | `tests/admin/operations.spec.ts`; API smoke; concurrency test |
| Phòng nghỉ | `/admin/phong-nghi` | Tạo/sửa/xoá bản nháp, nội dung/SEO/media, hạng phòng/đơn vị/rate; publish chỉ khi checklist đầy đủ | `tests/admin/run-to-goal.spec.ts`; `tests/admin/shell.spec.ts` |
| Quỹ phòng | `/admin/ton-phong` | Xem ngày/hạng phòng, đặt sức chứa, khoá phòng/ngừng bán; kiểm tra sức chứa ở service và PostgreSQL | `tests/admin/operations.spec.ts`; `backend/src/common/permissions.guard.spec.ts` |
| Combo du lịch | `/admin/combo-du-lich` | CMS CRUD, rich editor/media, revision, draft/publish/archive, route/redirect public | `tests/admin/run-to-goal.spec.ts`; `tests/admin/critical-workflows.spec.ts` |
| Điểm đến | `/admin/diem-den` | CMS CRUD, rich editor/media, revision, draft/publish/archive và kiểm tra hiển thị public | `tests/admin/run-to-goal.spec.ts` |
| Khách hàng | `/admin/khach-hang` | CRM tìm kiếm/cập nhật, interaction, follow-up và liên kết booking/inquiry | `tests/admin/operations.spec.ts` |
| Yêu cầu tư vấn | `/admin/yeu-cau-tu-van` | Inbox lấy từ API, cập nhật stage có version/audit; form public tạo inquiry thật | `tests/admin/critical-workflows.spec.ts`; operations test |
| Nội dung website | `/admin/noi-dung` | Bài viết, TipTap, preview, ảnh/ALT, revision, SEO, publish/archive/delete | `tests/admin/critical-workflows.spec.ts` |
| Chuyên trang | `/admin/chuyen-trang` | Trang chính sách/FAQ có route riêng, editor, media, SEO, publish và gắn menu | `tests/admin/catalogue.spec.ts` |
| Quản lý menu | `/admin/menu` | Sắp xếp/bật tắt, gắn trang đã publish, lưu/khôi phục qua navigation API | `tests/admin/catalogue.spec.ts`; API smoke |
| Thư viện ảnh | `/admin/thu-vien-anh` | Tải ảnh, tạo WebP/renditions, ALT/caption, tái sử dụng, chặn xoá ảnh đang dùng | `tests/admin/critical-workflows.spec.ts`; API smoke |
| Khuyến mãi | `/admin/khuyen-mai` | Tạo/sửa/bật tắt coupon, giới hạn lượt dùng và xem redemptions | `tests/admin/operations.spec.ts`; backend permission/unit tests |
| Thanh toán | `/admin/thanh-toan` | Ghi nhận payment thủ công, xem ledger và tạo/duyệt/từ chối refund có phân quyền | `tests/admin/operations.spec.ts` |
| Báo cáo | `/admin/bao-cao` | Tổng hợp booking, dòng tiền đã ghi nhận/refund, CRM, tồn và xuất CSV từ dữ liệu thật | `tests/admin/operations.spec.ts` |
| Cài đặt | `/admin/cai-dat` | Form trực quan theo nhóm (không JSON), version conflict, SEO index gate và cấu hình AI | `tests/admin/critical-workflows.spec.ts`; `tests/admin/seo.spec.ts` |

## Nền dùng chung

- Đăng nhập dùng session API; mọi mutation được kiểm tra permission/CSRF ở backend. Các màn sửa dữ liệu dùng optimistic version và xử lý `409` thay vì ghi đè âm thầm.
- Admin layout không nạp `AdminStore`; runtime import-graph audit báo 17 route entry, 62 module tới được, 0 route/module pending, 0 demo component/fallback/KPI/local-storage business mutation, 0 import nội bộ chưa giải quyết.
- TipTap được dùng ở các trường rich content; mọi điểm chọn ảnh mở Media Library dùng chung. Upload lưu WebP cùng các rendition, ALT gắn ở asset/usage.
- Form tạo/sửa nơi lưu trú và nội dung mở ở route/form riêng, có điều hướng trở lại danh sách. Các trạng thái tải/lỗi có retry, không giả API lỗi là danh sách rỗng.
- Responsive admin đã kiểm trên 1440, 1024, 768 và 390 px.

## Kết quả kiểm chứng

- `npm run typecheck`: đạt; `npm run lint`: đạt; `npm run audit:admin-runtime`: đạt; `git diff --check`: đạt.
- Backend unit: 23/23 (bao gồm regression test settings null → TipTap); API smoke qua gateway: 69/69; Playwright full có restart opt-in: 38/38. `tests/admin/full-completion.spec.ts` kiểm route crawler, dashboard reconciliation và CSRF; booking/status, inquiries, customer, publication, payment/refund được đối chiếu với endpoint list; report totals đối chiếu với fixture nghiệp vụ. PostgreSQL/media volumes được giữ nguyên qua restart.
- Dependency audit: root/backend, full/prod đều 0 vulnerability.
- Local URL `http://127.0.0.1:18473`; homepage, API health, `robots.txt` trả 200.
- SEO gate đang đóng: `indexingAllowed=false`; trang trả `X-Robots-Tag: noindex, follow` và meta robots noindex; canonical/sitemap URL indexable đang vắng; public API không trả draft.

## Giới hạn có chủ ý

- Payment là ledger/manual operations, chưa kết nối cổng thanh toán; không thu tiền thật. Hoàn tiền trong màn admin là workflow ghi nhận/duyệt, không gọi ngân hàng.
- Không gửi email/SMS/Zalo tự động, không đồng bộ OTA, không bật structured data thương mại (offers/reviews/VacationRental) khi chưa có dữ liệu và điều kiện xác minh.
- Toàn bộ 11 cơ sở Cúc Phương vẫn draft/noindex/chờ xác minh; không tự public. Không triển khai production trong lần audit này.
