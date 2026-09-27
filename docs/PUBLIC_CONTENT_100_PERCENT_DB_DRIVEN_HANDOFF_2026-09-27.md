# DVB Public Content — 100% DB-driven acceptance handoff

Ngày xác nhận: 2026-09-27

Phạm vi: audit và nghiệm thu local trên nhánh `main`; không thay đổi Definition of Done, không triển khai production.

## Kết luận

Public runtime lấy nội dung doanh nghiệp từ projection API/DB; với business settings mặc định rỗng và catalog public rỗng, trang không dựng dữ liệu demo. Audit duyệt graph import runtime từ 19 public route entrypoints và hai HTTP controller public/settings, không quét grep toàn repository. Không có import local chưa phân giải.

```text
PUBLIC_FRONTEND_ROUTE_ENTRIES=19
PUBLIC_AND_PUBLIC_API_REACHABLE_MODULES=122
ADMIN_ROUTE_ENTRIES=17
ADMIN_REACHABLE_MODULES=57
UNRESOLVED_PUBLIC_IMPORTS=0
UNRESOLVED_ADMIN_IMPORTS=0
HOMEPAGE_HARDCODE_BUSINESS_CONTENT=0
STATIC_CONTACT_CONTENT=0
STATIC_HERO_CONTENT=0
STATIC_PROMO_CONTENT=0
STATIC_FOOTER_BUSINESS_CONTENT=0
STATIC_HEADER_BUSINESS_CONTENT=0
RUNTIME_FIXTURE_FALLBACK_COUNT=0
PUBLIC_BUSINESS_IMAGE_HARDCODE_COUNT=0
RAW_JSON_EDITOR_COUNT=0
RAW_JSON_TEXTAREA_COUNT=0
IMAGE_URL_MANUAL_INPUT_COUNT=0
LONG_CONTENT_WITH_PLAIN_TEXTAREA_COUNT=0
```

## Browser acceptance

`tests/public-content-acceptance.spec.ts` thao tác qua Admin UI trên Docker local, mở một browser context public riêng trước khi ghi setting và không build/restart giữa thay đổi và lần đọc public. Test xác nhận:

- Hero title/image mới hiện trong public context riêng; Promo, Advisor và trang liên hệ đều chọn lại cùng một media ID từ Media Library.
- Ảnh upload có ALT và kích thước thực; UI hiển thị kích thước khuyến nghị cùng cảnh báo sai tỷ lệ.
- Header motto/CTA, Footer quote/motto và FAQ rich-text được lưu, public render đúng; FAQ sử dụng TipTap `RichTextEditor`.
- Section visibility và order được lưu rồi kiểm tra thứ tự DOM public.
- Xóa media đang được tham chiếu bị từ chối HTTP 409 và hiện cảnh báo “Ảnh đang được dùng”.
- `finally` phục hồi nguyên trạng 8 settings đã snapshot và xóa media E2E vừa tạo; test đọc lại và so khớp cả `value` lẫn `isDefault`.

Test empty-data kiểm tra business settings ở dạng rỗng/mặc định, section trang chủ không có thứ tự bật, public API trả danh sách rỗng cho stay/combo/destination/article/page; homepage và trang lưu trú không render tên hoặc bản sao demo. Các stay draft đã có trong DB local vẫn được giữ nguyên và không xuất hiện trên public API.

```text
PUBLIC_CONTENT_ACCEPTANCE=PASS (2/2)
FULL_PLAYWRIGHT=PASS (40/40; workers=1; restart-persistence enabled)
BASELINE_RESTORED=YES
LOCAL_DOCKER_RESTART_PERSISTENCE=PASS
```

## Kiểm tra bắt buộc

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — Next.js production build |
| `cd backend && npm run build && npm test` | PASS — Nest build, 23/23 backend tests |
| API smoke trong Docker network local | PASS — 69/69; test settings/menu/content/media/catalog được cleanup/restore |
| Playwright đầy đủ, `DVB_ADMIN_RESTART_STACK=1` | PASS — 40/40 |
| `npm run audit:no-hardcode` | PASS — tạo lại báo cáo inventory tại `docs/data-audit/no-hardcode-report.json` |
| `npm run audit:admin-runtime` | PASS — 17 route, 63 module; pending/demo/fallback/browser business state đều 0 |
| `npm run audit:public-content` | PASS — toàn bộ 12 metric ở trên bằng 0 |
| `git diff --check` | PASS |

`audit:no-hardcode` là inventory quét rộng hiện có và báo 42 literal findings; con số đó không được dùng thay cho kết luận public runtime. Kết luận nghiệm thu dựa trên module graph thực thi, audit public riêng, API và browser E2E; báo cáo inventory được giữ nguyên làm dữ liệu đối chiếu.

## Thay đổi trong lượt nghiệm thu

- Thêm `scripts/audit-public-content.mjs` và lệnh `npm run audit:public-content`; TypeScript AST truy vết runtime import từ public/admin routes, kiểm tra import chưa resolve và phát evidence khi metric fail.
- Thêm E2E acceptance public-content, gồm kiểm tra restore baseline ngay cả khi test fail.
- Thêm `data-setting-key`, `data-home-section`, accessible label cho toggle để E2E tương tác qua đúng UI quản trị.
- Sửa dirty-state comparison cài đặt theo cấu trúc JSON thay vì thứ tự key. JSONB không đảm bảo thứ tự object key; sau lần đọc lại, nội dung tương đương không còn bị đánh dấu “chưa lưu”.
- Giữ cập nhật report do hai audit hiện hữu sinh ra; không sửa Definition of Done hoặc schema.

## Git và ranh giới triển khai

```text
BRANCH=main
START_SHA=79cb8db7ffaf9bfed6d31fa357c6829f0006e9dc
COMMIT_AND_PUSH=AUTHORIZED_BY_USER
HEAD_EQUALS_ORIGIN_MAIN=VERIFIED_AFTER_PUSH
PRODUCTION_DEPLOYMENT=NO
PRODUCTION_DATA_OR_SERVICES_TOUCHED=NO
```

Các lệnh Docker, API smoke, browser tests và restart persistence chỉ chạy với stack local `dvb-booking`. Không xóa/recreate PostgreSQL, Redis hoặc media volumes; tài khoản/mật khẩu không được ghi vào báo cáo hay Git.
