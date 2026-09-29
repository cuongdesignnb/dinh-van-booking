# Đinh Vân Booking — ma trận route → API → dữ liệu → bằng chứng

Kiểm tại `main` sau `6bc7bbd`, ngày 2026-09-29. Đây là ma trận hiện hành cho **14 page public + 17 page Admin** trong `src/app`; không dùng trạng thái “DONE” cho một endpoint hoặc ảnh chụp đơn lẻ. `docs/backend/ui-api-matrix.md` và ma trận Admin ngày 27/09 là snapshot lịch sử.

Ký hiệu: **S** = đã đối chiếu source; **B** = browser E2E với API/DB local; **A** = API smoke/unit; **—** = chưa có bằng chứng đủ phạm vi. Trong cột trạng thái, `rỗng/lỗi` chỉ ghi **B** nếu có test tương ứng; loading chỉ ghi **S** nếu mới thấy nhánh UI trong source. Mọi trang public có error boundary không phụ thuộc API (`src/app/error.tsx`, `global-error.tsx`); bài outage opt-in dừng rồi chạy lại API local chứng minh thông báo lỗi và nút tải lại. Điều đó **không** tự chứng minh từng empty/error state hay visual của mọi route.

## Public runtime (đọc chỉ bản xuất bản)

| Route | Dữ liệu/API chủ đạo (`/api/v1`) và bảng nguồn | Hành vi, trạng thái đã chứng minh | Test và khoảng trống |
|---|---|---|---|
| `/` | `/public/site`, `/public/navigation/primary`, `/public/stays`, `/public/combos`, `/public/destinations`, `/public/reviews`; `Setting`, `NavigationItem`, `ContentNode`, `Property`, `Combo`, `Destination`, `Review`, `MediaAsset` | Section order/toggle, hero/media/FAQ lấy DB; DB business rỗng không hiện demo **B**; API lỗi có retry chung **B** | `public-content-acceptance`, `homepage-restoration`, `public-visual-routes`; nhiều card/ảnh thật và keyboard **—** |
| `/phong-nghi` | `/public/stays`, `/public/reviews`, `/public/site`, `/public/seo/urls`; `Property`, `RoomType`, `RoomUnit`, `RatePlan`, `ContentNode`, `Setting` | Draft không lộ **B**; danh sách responsive **B**; toàn route lỗi API hiện retry **B** | `public-data`, `public-visual-routes`, `public-api-outage` opt-in; filter với dữ liệu thật/ảnh lỗi **—** |
| `/phong-nghi/[slug]` | `/public/stays/:slug`, media, settings; `Property`, `RoomType`, `RatePlan`, `ContentMedia`, `PublicRoute` | Gallery tái sử dụng, giá 0 → liên hệ, draft 404 **B**; chi tiết có copy/slug dài, 2 ảnh, geometry 5 breakpoint, keyboard lightbox/focus và ảnh lỗi **B** | `property-album-contact`, `run-to-goal`, `seo`; 0/1/n ảnh và ảnh kinh doanh thật **—** |
| `/combo-du-lich` | `/public/combos`, `/public/reviews`, `/public/site`, SEO URLs; `Combo`, `ComboDay`, `ComboDeparture`, `ContentNode`, `MediaAsset` | Combo xuất bản không giá vẫn có card liên hệ **B**; 5 breakpoint shell **B** | `run-to-goal`, `combo-pricing`, `public-visual-routes`; nhiều combo có giá/hỗn hợp **—** |
| `/combo-du-lich/[slug]` | `/public/combos/:slug`, route history; `Combo`, `ComboDay`, `ContentNode`, `PublicRoute` | Giá `null`/`0` không tạo booking; CTA liên hệ, font, ảnh/geometry trên 5 breakpoint **B** | `run-to-goal`, `seo`; nhiều ngày/lịch trình/ảnh thực tế **—** |
| `/diem-den` | `/public/destinations`, `/public/site`, SEO URLs; `Destination`, `ContentNode`, `MediaAsset` | Draft không lộ **B**; shell responsive **B** | `run-to-goal`, `public-visual-routes`; filter/0-n card và ảnh thực **—** |
| `/diem-den/[slug]` | `/public/destinations/:slug`, media; `Destination`, `ContentMedia`, `PublicRoute` | Album một ảnh/copy dài không tràn tại 5 breakpoint **B** | `run-to-goal`; gallery nhiều ảnh, keyboard/ảnh lỗi **—** |
| `/bai-viet` | `/public/articles`, `/public/site`; `Article`, `ContentNode`, `ContentMedia`, `Setting` | Chỉ bài xuất bản **S/A**, shell responsive **B** | `critical-workflows`, `public-visual-routes`; danh sách nhiều bài và empty copy **—** |
| `/bai-viet/[slug]` | `/public/articles/:slug`; `Article`, `ContentNode`, `PublicRoute`, `MediaAsset` | TipTap → public rich body, revision/publish **B**; 404/redirect theo route **A/B** | `critical-workflows`, `seo`; long-form visual/keyboard **—** |
| `/chuyen-trang` | `/public/pages`, `/public/site`; `Page`, `ContentNode`, `Setting` | Index chỉ trang xuất bản **S/B** | `catalogue`; trang rỗng/nhiều trang và visual thực **—** |
| `/chuyen-trang/[slug]` | `/public/pages/:slug`; `Page`, `ContentNode`, `PublicRoute`, `ContentMedia` | SEO/redirect/canonical từ DB **S/B** | `catalogue`, `seo`; nhiều section và layout mobile **—** |
| `/[slug]` | `/public/pages/:slug`; cùng owner với chuyên trang | Route độc lập/canonical, 404 khi không có bản xuất bản **S/B** | `catalogue`, `seo`; slug xung đột với route hệ thống **—** |
| `/lien-he` | `/public/site`, `POST /inquiries`; `Setting`, `Inquiry`, `Customer` | Gửi inquiry thật, Admin đổi stage sau reload **B**; responsive shell **B** | `critical-workflows`, `public-visual-routes`; mạng đứt giữa lúc submit/retry/idempotency **—** |
| `/dat-phong` | `/public/stays`, `POST /quotes`, `POST /quotes/:id/hold`, guest CSRF; `BookingQuote`, `Booking`, `InventoryReservation`, `RoomType`, `RatePlan`, `Customer` | Giá server-side, hold một trong hai session thắng, booking status/tồn đối chiếu DB; checkout empty responsive **B** | `operations`, `pricing`, `public-visual-routes`; toàn bộ lỗi nhập liệu/coupon/date trên mobile và payment provider thật **—** |

**Quyền public:** đọc projection được xuất bản; mutation inquiry/quote/hold qua guest session + CSRF, hold có idempotency. `PageShell` lấy site/navigation từ API. Nếu API lỗi, không dùng fixture thay thế; UI lỗi toàn trang có retry. Media được phục vụ qua `/media/**` từ media volume. SEO index hiện **OFF**, không suy ra permission để bật production.

## Admin runtime (session + permission + CSRF)

API dưới đây đều có prefix `/api/v1`. Màn Admin cùng dùng `AdminAuthGate`; các thao tác ghi cần permission phía server, CSRF và version ở nơi có `expectedVersion`. Chi tiết action/service/Prisma của 16 màn cũ vẫn ở [ma trận Admin 27/09](./admin/full-completion-matrix.md), nhưng dùng bảng này làm trạng thái hiện hành khi hai tài liệu khác nhau.

| Route | Tác vụ/API và owner DB | Permission chính | Loading/rỗng/lỗi; bằng chứng và gap |
|---|---|---|---|
| `/admin` | KPI/activity `/admin/dashboard/summary|activity`; `Booking`, `Inquiry`, `Customer`, `ContentNode`, `Payment`, `Refund` | `dashboard.read` | Số liệu đối chiếu list API **B**; loading/empty **S**; timeout/retry riêng **—** |
| `/admin/dat-phong` | Quote, hold, list/detail/status/cancel/note `/quotes`, `/admin/bookings`; `BookingQuote`, `Booking`, `BookingLine`, `InventoryReservation`, `Customer` | `booking.read/write/cancel` | Hai session cạnh tranh/status/version **B**; loading/empty/error **S**; keyboard/form dài **—** |
| `/admin/phong-nghi` | Property CRUD/publication `/properties`, `/content/:id/status`; `Property`, `RoomType`, `ContentNode`, `PublicRoute` | `catalog.read/write`, `content.publish` | 11 bản nháp, form route riêng, CRUD/publish **B**; error/retry **S** |
| `/admin/hang-phong` | Hạng phòng/giá/đơn vị/album `/properties`, `/properties/:id/rooms[/:roomId]`, media; `RoomType`, `RoomUnit`, `RatePlan`, `ContentMedia`, `MediaAsset` | `catalog.read/write`, `media.read/write` | 11/5/0 baseline và tạo/sửa/giá 0 **B**; form hiển thị rõ cơ sở cha cùng các hạng đã có, tạo hạng tạm ẩn không cần giá/tồn, không lẫn cơ sở khác và không lộ public **B/A**; từ quỹ phòng mở danh sách, sửa album, quay lại **B**; API lỗi không hiện số 0 giả, retry **B**; lỗi từng mutation/chồng phiên bản **—** |
| `/admin/ton-phong` | Lịch tồn, khoá/mở `/admin/inventory`; `InventoryDay`, `InventoryBlock`, `InventoryReservation`, `RoomUnit` | `inventory.read/write` | Hold/cancel/expiry đối chiếu DB **B**; khi không có hạng phòng vận hành có CTA sang danh mục hạng phòng **B**; loading/error **S** |
| `/admin/combo-du-lich` | Nội dung/lịch/album `/content?kind=combo`, status/revisions; `ContentNode`, `Combo`, `ComboDay`, `PublicRoute` | `content.read/write/publish`, `media.read/write` | CRUD/publish/redirect/không giá ra client **B**; empty/error **S** |
| `/admin/diem-den` | `/content?kind=destination`, status/revisions; `Destination`, `ContentNode`, `PublicRoute` | `content.read/write/publish` | CRUD/publish/album **B**; empty/error **S** |
| `/admin/khach-hang` | `/admin/customers`, interactions/follow-ups; `Customer`, `Interaction`, `FollowUp`, `Booking`, `Inquiry` | `crm.read/write` | Hồ sơ/nhắc việc lưu DB **B**; empty/error **S** |
| `/admin/yeu-cau-tu-van` | `/inquiries`, stage; `Inquiry`, `Customer`, `InquiryStageHistory` | `crm.read/write` | Public submit → stage/version → reload **B**; API lỗi không giả empty **S** |
| `/admin/noi-dung` | `/content?kind=article`, status/revisions, media; `Article`, `ContentNode`, `MediaAsset` | `content.read/write/publish`, `media.read/write` | TipTap/ALT/publish **B**; lỗi list/retry không hiện empty giả **B** |
| `/admin/chuyen-trang` | `/content?kind=page`, status, menu; `Page`, `ContentNode`, `NavigationItem` | `content.read/write/publish` | Tạo/trang public/menu **B**; empty/error **S** |
| `/admin/menu` | `/navigation/primary`; `NavigationMenu`, `NavigationItem`, `PublicRoute` | `content.read/write` | Sắp xếp/bật tắt/public propagation/restore **B/A**; lỗi mạng riêng **—** |
| `/admin/thu-vien-anh` | `/media/upload`, `/media/:id`; `MediaAsset`, bytes WebP trên volume | `media.read/write/delete` | Upload/reuse/ALT/chặn xoá ảnh dùng **B/A**; upload gián đoạn/ảnh lỗi **—** |
| `/admin/khuyen-mai` | `/admin/coupons`, quote áp mã; `Coupon`, `CouponRedemption`, `Booking` | `coupon.read/write` | CRUD/version/hiệu lực/giảm giá **B**; empty/loading/error **S** |
| `/admin/thanh-toan` | `/admin/payments`, `/admin/refunds`; `Payment`, `Refund`, `Booking` | `finance.read/write`, `refund.approve` | Ledger offline/refund và report đối soát **B**; **không** kết nối cổng tiền thật |
| `/admin/bao-cao` | `/admin/reports/summary`, CSV; `Booking`, `Payment`, `Refund`, `InventoryDay`, `Inquiry` | `report.read` | Totals fixture nghiệp vụ đối soát **B**; file CSV đầy đủ/filter sâu **—** |
| `/admin/cai-dat` | `/settings`, `/ai/settings`; `Setting`, `AuditLog` | `settings.read/write` | Form trực quan, save/version/public propagation **B**; secret AI thật/đứt mạng **—** |

## Gate còn mở, ưu tiên tiếp theo

1. Chủ dự án xác minh 11 cơ sở, quyền ảnh, hạng phòng, sức chứa, giá/tồn/chính sách; dữ liệu hiện vẫn draft/contact-only. Không dùng fixture QA làm bằng chứng bán hàng.
2. Visual/accessibility với ảnh có quyền sử dụng, copy ngắn/dài và 0/1/n phần tử ở mọi route chi tiết; keyboard/focus/contrast, image failure và mobile dialog/checkout chưa được chứng minh hết.
3. Contract/error theo từng mutation (mất mạng, 409, 403, retry không ghi đôi); outage toàn trang chỉ chứng minh lớp chung và `/phong-nghi`.
4. Backup **và restore thử** PostgreSQL + media, staging UAT, TLS/cookie/domain/canonical, monitoring và rollback vẫn chưa đủ bằng chứng để release. Payment trực tuyến cần quyết định nhà cung cấp riêng; không đánh dấu hoàn thành bằng ledger offline.

Ma trận này là bản đồ kiểm chứng, **không** phải chứng nhận hoàn tất. Gate 1 chỉ đóng khi từng dòng có owner/test hiện hành và các tài liệu cũ được gắn nhãn lịch sử; các gate 2–6 giữ mở theo [kế hoạch tổng thể](./END_TO_END_COMPLETION_PLAN_2026-09-28.md).
