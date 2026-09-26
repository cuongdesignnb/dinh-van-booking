# Verification

Snapshot kiểm thử lịch sử: 2026-09-21. Bổ sung Technical SEO được kiểm tra riêng ngày
2026-09-23 trong `artifacts/seo/2026-09-23/`; xem handoff hiện hành để biết lệnh đã chạy
trong đợt đồng bộ Git ngày 2026-09-26.

## Đã chạy

| Lệnh / kiểm tra | Kết quả |
|---|---|
| root TypeScript noEmit | PASS |
| backend TypeScript noEmit | PASS |
| npm run lint | PASS |
| npm run build | PASS |
| docker compose up -d --build | PASS local; migrations complete, services healthy |
| GET /api/v1/health qua gateway | PASS; database up |
| GET /api/v1/public/site | PASS; neutral DB-backed response, no demo flag |
| GET /api/v1/public/stays | PASS; empty result khi DB empty |
| GET /api/v1/settings không session | PASS negative; 401 |
| POST /api/v1/inquiries | PASS local; row thật đọc lại từ PostgreSQL |
| cleanup marker inquiry | PASS; exact IDs removed, count về 0 |
| Compose rebuild cuối | PASS; api/postgres/redis healthy, web/worker/gateway running |
| public smoke cuối | PASS; health ok/up, usesDemoData=false, robotsIndex=false, stayCount=0, root/admin 200, unauth settings 401 |
| inquiry smoke cuối | PASS; POST trả received, PostgreSQL stage=new + audit=1, cleanup exact marker về 0 |
| public route smoke | PASS; root, stays, combos, destinations, contact, checkout and scoped admin routes returned 200 |
| missing stay | PASS negative; /api/v1/public/stays/does-not-exist returned 404 |
| local owner login + properties read | PASS; owner test account login 200, authenticated `/api/v1/properties` 200 with empty items |
| admin catalog create surface | PASS build; `/admin/phong-nghi` 200 and real create form backed by `/api/v1/properties` |
| CMS editor surface | PASS build/browser; `/admin/combo-du-lich` 200 shows “Tạo mới”, typed combo form and TipTap editor; same component powers destination/article |
| content relation smoke | PASS local API; created and deleted draft destination, combo with itinerary, and article with typed details; GET returned persisted relation fields |
| CRM pagination query | PASS local API/browser; `/api/v1/inquiries?page=1&pageSize=100` returns 200 and the admin inbox renders without validation error |
| raw HTML fixture check | PASS local; homepage did not contain legacy admin storage key, demo review marker or old fixture stay name |
| git diff --check | PASS; chỉ có warning line ending/config ignore |
| npm run audit:no-hardcode | Chạy sau khi tạo bộ hồ sơ này; report là no-hardcode-report.json |

## Playwright legacy suite

Đã chạy npm test với 98 test cũ. Nhiều test fail/timeout vì kỳ vọng dataset fixture và hành vi demo trước đây: baseline pricing/add-on/coupon, static property/combos/destinations, legacy admin dashboard/booking/customer/editor. Một số route public empty-state/responsive vẫn PASS. Production server đồng thời ghi DYNAMIC_SERVER_USAGE vì route/layout hiện đọc dữ liệu động; đây là log cần theo dõi, không phải bằng chứng đã đạt integration.

Suite này không phải acceptance suite cho API mới: không dùng kết quả của nó để tuyên bố PASS catalog/booking. Không sửa lại runtime để làm xanh các test đòi fixture.

Docker web dependency install cũng báo 3 npm audit findings (2 high, 1 critical); chưa chạy npm audit fix --force hoặc tự nâng major trong task dữ liệu này.

## Coverage chưa chạy được

- Browser admin đăng nhập bằng owner account thật và settings save qua UI: NOT_RUN in this verification pass; local owner test account now exists, but no credentials are stored in audit files.
- Browser public độc lập sau settings/catalog mutation: NOT_RUN end-to-end; local DB empty, chỉ đã smoke API/HTML.
- Catalog publish, giá/tồn, booking concurrency, payment, coupon, report: NOT_RUN.
- Restart persistence có marker nghiệp vụ: NOT_RUN sau cleanup; Compose restart/read-only services đã được dựng nhưng chưa có dữ liệu cần giữ.
- Production/CDN/read replica/multi-instance: NOT_RUN.
