# Đinh Vân Booking — Admin run-to-goal handoff

**Cập nhật:** 2026-09-27 · Local Windows + Docker Compose. Đây là audit/handoff để review, không phải phê duyệt deploy. Không truy cập hoặc thay đổi production.

## Kết quả tóm tắt

Chuỗi đã được kiểm chứng trên stack local: đăng nhập Owner thật → API/session thật → PostgreSQL/media volume → reload và force-recreate app containers → public projection phản ánh nội dung đã publish. Draft không xuất hiện public; search indexing gate vẫn đóng. Không reset database hay xóa volume.

<pre>
REPO=https://github.com/cuongdesignnb/dinh-van-booking
BRANCH=main
START_SHA=30ca32dade747b6592f427ec45d559cb1d8ffbad
FINAL_SHA=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369 (implementation commit)
REMOTE_MAIN_AFTER_IMPLEMENTATION_PUSH=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369
LATEST_TEST_COMMIT=c1f14205f309706183c65c6ba96c1bc65f367683 (media upload boundary/path traversal smoke coverage only)
DOCS_ONLY_FOLLOWUP=separate docs/report commit; final origin/main SHA is reported in the task result
WORKTREE_FINAL=CLEAN after docs-only commit and push; final state verified in task result
LOCAL_HEAD_BEFORE=30ca32dade747b6592f427ec45d559cb1d8ffbad
REMOTE_MAIN_BEFORE=30ca32dade747b6592f427ec45d559cb1d8ffbad
LOCAL_AHEAD_BEFORE=0
LOCAL_DIRTY_BEFORE=YES (liên quan admin run-to-goal từ lượt làm việc trước; giữ nguyên và audit, không reset)
COMMIT_CREATED=YES (implementation c8fe7a9, media smoke-test commit c1f1420, plus separate docs-only follow-ups)
LATEST_SOURCE_TEST_SHA=c1f14205f309706183c65c6ba96c1bc65f367683
REMOTE_MAIN_AFTER_LATEST_SOURCE_PUSH=c1f14205f309706183c65c6ba96c1bc65f367683
PUSHED_TO_MAIN=YES (implementation and latest smoke-test coverage pushed; handoff-only push/final tip verified in task result)
</pre>

Local app: [http://127.0.0.1:18474](http://127.0.0.1:18474), homepage, API `/api/v1/health` và robots đều HTTP 200 sau khi force-recreate API. Tài khoản Owner là `halabcreative@gmail.com`; mật khẩu chỉ nằm trong `.secrets/owner_password`, không đưa vào tài liệu/commit.

## Module matrix

Ma trận đủ 15 route, component hiện hành, API, bảng dữ liệu, mutation và browser evidence nằm ở [`docs/admin/admin-run-to-goal-matrix.md`](admin/admin-run-to-goal-matrix.md). Status dùng đúng `REAL_API`, `READ_ONLY_REAL`, `PENDING`, `BLOCKED`.

<pre>
ADMIN_AUTH=PASS
MEDIA_LIBRARY=PASS
RICH_TEXT_EDITOR=PASS
CONTENT_CMS=PASS
DESTINATIONS=PASS
COMBOS=PASS
PROPERTIES=PASS
INQUIRIES=PASS
NAVIGATION=PASS
SETTINGS=PASS
STATIC_PAGES=PASS

BOOKING=PENDING
CUSTOMERS=PENDING
PAYMENTS=PENDING
COUPONS=PENDING
REPORTING=PENDING
INVENTORY=PENDING
</pre>

### Evidence and scope

- **Admin auth:** form/API login thật bằng Owner; password sai bị từ chối; reload vẫn giữ session; logout làm session hết hiệu lực; API riêng tư chưa login trả 401; mutation thiếu CSRF trả 403; 21 quyền do backend trả về. Backend guard unit test xác nhận viewer bị chặn, editor chỉ có đúng quyền và owner qua permission decorator. Không còn role switcher reachable.
- **Rich text/CMS:** bài viết được soạn bằng TipTap, lưu/load lại từ API, sửa format/heading, cover và ảnh inline lấy từ Media Library, preview, publish ra public route; version cũ bị từ chối, archive/unpublish/delete theo workflow. Lỗi tải danh sách có error/retry state riêng, không giả thành empty state.
- **Destination/combo/property:** tạo và sửa dữ liệu PostgreSQL, SEO/cover/body, public propagation, stale-version conflict, đổi slug/redirect, archive/unpublish và cleanup. Property test tạo room type, unit và rate; đó không đồng nghĩa đã có UI sửa inventory/rate hiện hữu.
- **Media:** upload API lưu WebP thật vào volume và PostgreSQL; kiểm metadata/ALT/caption, rendition, đọc bytes, chọn cover/inline; xoá ảnh chưa dùng thành công và chặn ảnh đang tham chiếu. Persistence test xác nhận metadata và file WebP còn sau khi recreate app containers.
- **Inquiry:** form public tạo inquiry; inbox API đọc lại, đổi stage và xử lý conflict sau reload. Test dọn đúng record/customer giả lập theo UUID, số điện thoại, tên và marker, đồng thời chặn cleanup nếu có bản ghi nghiệp vụ phụ thuộc.
- **Settings/navigation/static pages:** form Settings ghi expectedVersion, public brand thay đổi đúng, version stale có conflict; menu persist và public navigation khớp; static page có editor/media/SEO, publish ra route riêng và được liên kết menu.
- **Pending:** overview/booking/customer/coupon/payment/report và quản lý inventory hiện hữu báo chưa hoàn thiện; không có KPI, giao dịch, số tồn hoặc danh sách khách giả.
- **Gateway fix:** gateway trước đây dùng hostname upstream tĩnh khi Nginx start, gây 502 sau khi container bị recreate/đổi IP. `infra/gateway/default.conf` nay dùng Docker resolver `127.0.0.11` với cache ngắn cho API/web; xác minh `nginx -t` và HTTP 200 sau force-recreate API mà không restart gateway.

## Runtime fixture / legacy audit

<pre>
RUNTIME_FIXTURE_FALLBACK_COUNT=0
REACHABLE_DEMO_COMPONENT_COUNT=0
LOCALSTORAGE_BUSINESS_DATA_COUNT=0
ADMINSTORE_BUSINESS_MUTATION_COUNT=0
</pre>

Con số scanner `43` là findings theo rule, không phải 43 đường runtime: 21 import type-only (bị erase khi build), 6 guest favorite preference trong `src/lib/favorites.ts`, 16 legacy admin fixture/demo matches nằm ngoài import graph của route hiện hành. Legacy details và reachability theo file/dòng ở [`docs/admin/admin-legacy-findings.md`](admin/admin-legacy-findings.md). `AdminStore` còn trong source cho consumer legacy, nhưng `AdminAuthGate` + `AdminShell` không mount provider; route hiện tại không lấy quyền hoặc dữ liệu nghiệp vụ từ đó.

## Persistence và dữ liệu local

| Bằng chứng | Kết quả |
|---|---|
| Media upload → WebP/DB/file volume → API phục vụ file → app-container recreate → GET metadata/file/bytes | PASS |
| Content article save/version/public route → API/DB → app-container recreate → public route | PASS |
| Brand settings save/public view → app-container recreate → giá trị còn → restore baseline | PASS |
| Property + room/unit/rate và menu/navigation qua container recreate | PASS |
| Public inquiry qua container recreate, admin đọc lại | PASS |
| Destination/combo/property/article/page/menu/settings public propagation | PASS |
| PostgreSQL/Redis/media volumes | Giữ nguyên; không reset/down -v |

Sau cleanup, PostgreSQL local có 11 content nodes / 11 properties; cả 11 lưu trú vẫn là draft và `pending_verification`; 5 room types; 0 room units, 0 rate plans; 0 media assets, 0 inquiries, 0 customers, 0 settings; 1 navigation menu/5 items; 2 users, 5 roles, 21 permissions. Migration history ghi 5 migration áp dụng thành công và 1 attempt đã rollback. Không có bản ghi `ATG-*` test còn lại. Public catalogue không nhận draft; SEO indexing vẫn đóng.

## Test results

| Test | Kết quả | Count/Notes |
|---|---|---|
| Frontend lint | PASS | `npm run lint -- --no-warn-ignored` |
| Frontend typecheck | PASS | `npm run typecheck` |
| Frontend build | PASS | `npm run build`; Docker web production image build cũng PASS |
| Backend build | PASS | Source build trong Node 24 Docker runner và Compose API build |
| Backend unit | PASS | `scripts/backend.sh test`: 14/14 |
| API smoke | PASS | `scripts/smoke.sh`: 67/67 auth, CSRF, permissions, settings, media/WebP, upload byte-limit/traversal security, content, navigation, inquiry, property/catalog và cleanup |
| Admin browser E2E | PASS | Playwright 34/34, `--workers=1`, full local gateway/API stack |
| Responsive QA | PASS | 1440, 1024, 768, 390 px; không tràn ngang, mobile sidebar/logout |
| Version conflict | PASS | CMS content, settings, property và inquiry stage stale-version cases |
| Permission QA | PASS | API smoke + 3 backend permission-guard unit cases (viewer/editor/owner) |
| Restart persistence | PASS | Opt-in Playwright test force-recreates `api`, `web`, `worker`; PostgreSQL/Redis/media volumes không bị restart/reset; test kết thúc với cleanup |
| Public propagation/SEO | PASS with scope | Public APIs/routes, draft isolation, robots/sitemap, redirect, noindex và true 404 được test; chưa bật index, chưa có positive JSON-LD check với live-approved content |
| Docker config | PASS | `docker compose --env-file .env.docker --env-file .env.ports config --quiet` |
| Nginx | PASS | `nginx -t`, API và web đều 200 sau khi force-recreate API |
| Env examples | PASS | Fixture thư mục tạm: tạo env/secrets hai lần; hash không đổi lần hai; file thật được giữ |
| Seed/Owner wrapper | PASS | Seed chạy lặp lại ở lượt audit trước; create-owner guard từ chối Owner đã tồn tại, không đổi user |
| No-hardcode scan | PASS WITH FINDINGS | 43 findings đã phân loại như trên; không có runtime admin fallback |

`npm ci` chạy sạch bằng Node 24; lint/typecheck/build đều PASS. Frontend full dependency tree báo 3 advisories (2 high, 1 critical). `npm audit --omit=dev` không lấy được kết quả từ registry nên chưa xác định được production-only severity. Backend install báo 17 advisories (1 low, 8 moderate, 8 high). Không ép nâng dependency trong task này.

Preflight port đã chạy với `--write`: 18473 đang bận nên `.env.ports` chuyển sang 18474. `.env.runtime` là file ignored, cập nhật riêng `PUBLIC_ORIGINS` để khớp cổng mới và giữ nguyên kiểm tra same-origin/CSRF. `prepare-local-secrets.py` giữ nguyên các secret hiện có; không có secret nào được commit. Compose hiện đủ 6 service up, API/PostgreSQL healthy; migration job đã hoàn thành. URL local hiện tại là `http://127.0.0.1:18474`.

## Migration/config/production impact

<pre>
NEW_MIGRATIONS=0 since START_SHA
MIGRATION_FILES=NONE in this task delta (3 existing migration files since production baseline)
DESTRUCTIVE=NO in this task delta
SEED_REQUIRED=NO for upgrading an already-seeded schema

DEPLOY_FROM_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
DEPLOY_TO_SHA=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369 (implementation; docs-only follow-up không đổi runtime code)
REBUILD_WEB=YES
REBUILD_API=YES (full range since production baseline contains API changes)
REBUILD_WORKER=YES (full range since production baseline contains worker/runtime changes)
RUN_MIGRATION=YES for the 3 existing post-baseline migrations
RUN_SEED=NO for an existing database at the stated baseline
RESTART_GATEWAY=YES (dynamic DNS configuration changed)
ENV_CHANGES=SEO_INDEXING_ALLOWED defaults false; SEO_APPROVED_CANONICAL_ORIGIN defaults blank; optional AI_CONTENT_*, AI_IMAGE_*, AI_SETTINGS_ENCRYPTION_KEY[_FILE]; no actual local secret/env file committed
SAFE_TO_PREPARE_PRODUCTION_DEPLOY=NO
BLOCKERS=frontend full dependency tree báo 3 advisories (2 high, 1 critical), chưa xác định production-only severity do registry audit lỗi; backend báo 17 advisories (8 high); production migration/backup/restore/TLS/CSRF/CDN chưa audit; static-page route backfill cần backup và forward-fix plan; booking/inventory/customer/promotion/payment/report còn PENDING; chưa có nội dung public đã duyệt để kiểm JSON-LD dương tính
</pre>

Không deploy, migrate, seed/import, bật SEO index, đổi DNS hoặc restart production. Nếu review production sau này, cần backup được xác minh và kế hoạch xử lý route backfill; không coi local test là bằng chứng về production secrets/runtime.

## Commit và handoff

Implementation commit: `c8fe7a94303ce81cb109cc3a35c8587dbe9b3369` (`fix(admin): close run-to-goal gaps and gateway restart`). Production code-review range và toàn bộ 225 file path được liệt kê trong production handoff. Docs-only follow-up cập nhật handoff/scanner report; sau push, final `origin/main` SHA và trạng thái `HEAD == origin/main`, worktree clean sẽ được xác minh và báo trong kết quả cuối (commit không thể tự ghi SHA của chính nó).

Handoff song song về production: [`docs/PRODUCTION_SYNC_HANDOFF_2026-09-26.md`](PRODUCTION_SYNC_HANDOFF_2026-09-26.md).
