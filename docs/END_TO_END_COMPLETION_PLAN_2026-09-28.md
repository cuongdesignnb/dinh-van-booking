# Đinh Vân Booking — kế hoạch hoàn thiện end-to-end

Ngày lập: 2026-09-28. Baseline đã kiểm tra: `main` tại `25678d22e1ca003122d06e9a693fa74cb8c3c6a0`. Kế hoạch này dùng source/runtime hiện tại làm chuẩn; các tài liệu `docs/implementation-status.md` và `docs/backend/ui-api-matrix.md` là snapshot lịch sử, không phải tình trạng hiện hành.

## Đích cuối

Quản trị viên nhập và duyệt dữ liệu qua Admin → PostgreSQL/Media Library lưu bền vững → API public chỉ phát bản đã xuất bản → client đẹp, dễ dùng ở mobile/desktop, hiển thị đúng dữ liệu và cập nhật không cần build lại. Tìm kiếm, tư vấn, báo giá, giữ phòng và vận hành sau đặt phòng phải đi qua API thật; lỗi phải có trạng thái rõ ràng, không giả dữ liệu hoặc nhận đặt miễn phí do giá 0. Chỉ triển khai production sau khi từng gate dưới đây có bằng chứng.

## Bằng chứng hiện tại, chưa phải chứng nhận hoàn tất

- Runtime local `http://127.0.0.1:18473`: Next, API, worker, PostgreSQL, Redis và gateway. Lượt kiểm ngày 2026-09-28: Playwright tuần tự 89 pass/3 opt-in skipped; backend 39/39; API smoke 69/69; lint, typecheck, Docker build và audit public/admin runtime pass. `audit:no-hardcode` còn 42 phát hiện ở mã legacy không reachable trên graph hoạt động. Lượt Playwright chạy song song trước đó thất bại vì tiến trình con không có quyền Docker và các bài ghi cùng DB; đã dọn exact fixture bị sót, chạy lại tuần tự với quyền phù hợp và đạt.
- `getPublicSite`, stays, combos, destinations và content lấy từ API nội bộ; browser mutations dùng API cùng origin với session/CSRF. API báo giá và hold đã có luồng E2E; form liên hệ tạo inquiry thật. Client không dùng fixture fallback trên public runtime graph.
- Lượt quét mới: 8 route client cấp cao × 390/768/1024/1440/1920 = 40 trường hợp không lỗi JavaScript/HTTP 5xx/tràn ngang ở trạng thái dữ liệu local hiện tại. Lượt quét phát hiện `/phong-nghi` có animation làm tràn ngang 11px tại 1440; đã sửa và đo lại 40/40. Mô tả RichText trên ảnh hero đã được sửa tương phản, có assert màu kế thừa. Ảnh kiểm tra: [phòng nghỉ mobile](../artifacts/public-visual-stays-390.png), [phòng nghỉ desktop](../artifacts/public-visual-stays-1440.png), [liên hệ mobile](../artifacts/public-visual-contact-390.png), [liên hệ desktop](../artifacts/public-visual-contact-1440.png). Test này chưa chứng minh các trang chi tiết nhiều dữ liệu hay mọi trạng thái lỗi.
- Bài restart persistence opt-in đã chạy lại ngày 2026-09-28: 1/1 pass; nội dung, media, settings, inquiry, property và menu tồn tại sau khi recreate API/web/worker rồi được dọn/khôi phục.
- PostgreSQL local có 11 nơi lưu trú Cúc Phương dạng nháp/chờ xác minh, 5 hạng phòng của Mineral Retreat đều tạm ẩn và 0 đơn vị phòng; không phải nguồn hàng đã sẵn sàng bán. Admin có route riêng `/admin/hang-phong`, lọc theo nơi lưu trú, thêm/sửa, album, giá và bổ sung số phòng; giảm số phòng bị chặn để tránh ảnh hưởng dữ liệu đặt phòng. Kiểm thử tạo/sửa hạng phòng, tăng 1→2, từ chối giảm, album dùng chung và giá 0→liên hệ đã đạt rồi dọn fixture. Ảnh kiểm tra: [hạng phòng mobile](../artifacts/admin-room-catalog-390.png), [hạng phòng desktop](../artifacts/admin-room-catalog-1440.png). Không tự xuất bản, tạo giá/tồn/ảnh chưa được xác minh. SEO indexing vẫn đóng. Chưa kiểm tra hay thay đổi production trong kế hoạch này.

## Thứ tự thực hiện và gate nghiệm thu

| Đợt | Công việc | Bằng chứng bắt buộc để đóng gate |
|---|---|---|
| 1. Ma trận hiện trạng | Lập ma trận cho từng route Admin/public, thao tác, API, bảng DB, quyền, trạng thái rỗng/lỗi/loading và test; thay thế tài liệu cũ gây hiểu nhầm. Đánh dấu rõ phần chỉ được chứng minh bởi source, bởi API, hay bởi browser. | Mỗi route có owner dữ liệu và bài kiểm thử tương ứng; không ghi `DONE` cho nơi chỉ có endpoint hoặc hình chụp. |
| 2. Dữ liệu và nội dung | Chủ dự án xác minh từng cơ sở, quyền ảnh, ALT, hạng phòng, giá/tồn, chính sách, liên hệ và nội dung SEO. Tạo/publish qua Admin; kiểm tra không ghi đè chỉnh sửa; kiểm tra bản nháp không rò public. | Checklist per property; media có quyền sử dụng; public API và trang client khớp đúng bản ghi đã duyệt, cập nhật giữa hai session không cần restart. Dữ liệu thiếu giữ draft/contact-only. |
| 3. Client visual & accessibility | QA trang chủ, danh sách và chi tiết stay/combo/destination, bài viết/chuyên trang, liên hệ, checkout với dữ liệu ngắn/dài, 0/1/n ảnh, 0/1/n card, giá 0/hỗn hợp, empty/loading/API lỗi. Kiểm tra 390/768/1024/1440/1920, keyboard, focus, ảnh lỗi, sticky/overlay, menu và footer. | Ảnh before/after theo route/breakpoint; không chữ chồng, không cuộn ngang cả trong animation, CTA dùng được, 1 H1 hợp lệ, ALT, focus/contrast cơ bản; Playwright geometry + tương tác đạt. |
| 4. API contract & failure | Đối soát DTO/response ↔ mapper client ↔ DB; kiểm tra version conflict, quyền, CSRF, cache/freshness, media WebP/ALT/deletion-in-use, canonical/redirect và lỗi API. Không biến lỗi 5xx thành empty state giả. | Contract test cho payload hợp lệ/không hợp lệ, E2E mất API và retry, không bản nháp/demo ngoài public, server/browser console sạch, bản ghi Admin xuất hiện public đúng điều kiện. |
| 5. Đặt phòng & vận hành | Chạy journey thực: tìm phòng → hạng phòng → ngày/khách → quote → hold/idempotency → admin xác nhận/hủy/hết hạn → tồn phòng/CRM/báo cáo. Giá 0 luôn sang liên hệ; không nói đã thu tiền khi chưa có tích hợp. | Browser E2E với 2 session cạnh tranh và kiểm DB; một hold thắng, không overbooking; đơn/trạng thái/tồn/báo cáo nhất quán; dọn fixture QA chính xác. Nếu cần thanh toán trực tuyến thật, chọn nhà cung cấp và thiết kế gate riêng trước khi bật. |
| 6. Vận hành/release | Chạy full lint/typecheck/build/backend/smoke/Playwright/audits/dependency audit; backup và thử restore PostgreSQL + media; kiểm restart, migration, secret, cookie/TLS, domain/canonical, log/alert; staging smoke rồi mới xin duyệt production. | CI xanh trên SHA đích; backup phục hồi thử thành công; staging UAT ký duyệt; SEO index vẫn OFF đến khi có phê duyệt riêng; rollback có diễn tập. Không tự động deploy từ kết quả local. |

## Những chỗ chưa đủ bằng chứng ở baseline

1. Lượt visual 40/40 mới chứng minh shell ở dữ liệu local hiện tại; chưa bao phủ mọi trang chi tiết/album và copy dài ở toàn bộ breakpoint. Phải dùng fixture có kiểm soát rồi khôi phục baseline.
2. Ba test opt-in (bootstrap, mutation QA, restart persistence) không nằm trong lượt Playwright mặc định. Restart persistence đã chạy riêng và đạt; hai bài bootstrap còn cần môi trường chuẩn bị riêng. Không lặng lẽ tính skipped thành pass.
3. 11 property seed chưa xác minh/đăng công khai; 5 hạng phòng Mineral Retreat chưa có giá, tồn, ảnh hoặc sức chứa đã xác minh (giá trị sức chứa seed là placeholder kỹ thuật). Không thể chứng nhận catalogue bán hàng thật chỉ từ ảnh QA và API fixture.
4. Tài liệu cũ còn mô tả fixture/demo và endpoint chưa có; cần gắn nhãn lịch sử, thay bằng ma trận hiện hành ở đợt 1.
5. Chưa có bằng chứng production về backup/restore, CDN/cache, TLS/cookie, domain/canonical và monitoring. `SAFE_TO_DEPLOY` local không đồng nghĩa đã triển khai hay được phép bật index.

## Quy tắc thực hiện

- Mỗi lỗi được tái hiện trên runtime/fixture xác định, sửa ở nguồn, thêm regression test, kiểm tra ở nhiều viewport rồi mới commit.
- Không dùng nội dung hardcode để che thiếu DB; không rút ngắn copy hợp lệ chỉ để vừa CSS. Không đẩy bản nháp, ảnh không rõ quyền, giá/tồn giả hay review giả ra public.
- Test có ghi DB phải dùng mã QA riêng, đối chiếu trước khi xoá, khôi phục settings/menu và xác minh số bản ghi sau test. Không xóa volume hay dữ liệu thật để làm sạch môi trường.
- Production, SEO indexing và payment thật là gate cần phê duyệt; kế hoạch này không cấp quyền tự triển khai.

## Definition of Done cuối cùng

Chỉ đánh dấu hoàn tất khi 6 gate trên đều có bằng chứng hiện hành và không còn mục “chưa đủ bằng chứng”; toàn bộ route client/Admin dùng API thật với empty/error states trung thực; UAT dữ liệu đã duyệt, visual responsive và journey đặt phòng đạt; full test/audit/restore/staging đạt trên cùng SHA; runbook rollback và người duyệt release được ghi rõ. Nếu thiếu dữ liệu kinh doanh hay quyết định payment/domain, giữ gate mở thay vì suy diễn đã hoàn tất.
