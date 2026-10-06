# v3 "Về mình" page — running log

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-v3-about.md`.
START_SHA = d2e2315 (origin/main).
Rule for successors: build on what is committed; never reset / force-push. Commit + push after each chunk.

## Plan
1. Backend: settings key `about.page` (group `publicPages`), truthful bootstrap copy, menu "Về mình" → `/ve-minh`, `/ve-minh` in `seoUrls()` when the page is enabled, spec/tests.
2. Admin: field labels + row templates for `about.page` in `SettingsFormEditor`.
3. Frontend: `src/app/ve-minh/page.tsx` + `src/styles/site/about.css`; `buildAboutGraph` (AboutPage + Person + BreadcrumbList + FAQPage); monogram shared from `HomeArt`; link from `/lien-he`.
4. Demo API data (`scripts/ui-demo`) gets `about.page` + nav + seo url; optional SEO-on env for JSON-LD checks.
5. QA at 1440/1024/768/390, screenshots, Docker rebuild, seed `--only about.` dry-run → apply, menu via Admin API, final report.

## Done
- backend: `about.page` registry key, bootstrap copy (`paragraphsDoc`), menu Về mình → `/ve-minh`, `seoUrls()` adds `/ve-minh` when enabled+title, `ve-minh` reserved slug (backend + src/lib/slug.ts), spec updated. `scripts/backend.sh build` PASS, `test` 79/79 PASS.

- admin FIELD_META + row templates for `about.page`; `src/app/ve-minh/page.tsx` + `src/styles/site/about.css`; `buildAboutGraph` in `src/lib/seo/schema.ts`; `AdvisorMonogram` moved to `HomeArt`; `/lien-he` advisor card links "Tìm hiểu thêm về mình"; demo data (`about.page`, nav, seo url, `DEMO_SEO_INDEX=1` switch). typecheck + lint PASS.

- CSS polish (centered CTA band, compact mobile value cards, horizontal area cards 600–1023px, balanced/pretty wraps); `areaServed` only on `worksFor`.
- QA (demo API, prod build): `qa.mjs --only=public` 12 routes × 1440/1024/768/390 all OK incl. `public-about` (log `artifacts/ui-redesign-v2/qa-results-v3-about.txt`); admin-settings OK. Screenshots `artifacts/ui-redesign-v2/about-1440.png`, `about-390.png`.
- SEO-on check (`DEMO_SEO_INDEX=1` + env): index/follow, canonical, OG/Twitter, JSON-LD Organization/WebSite/AboutPage/BreadcrumbList/Person/FAQPage, sitemap has `/ve-minh`; `?q=` → noindex, `?utm_` keeps canonical. Evidence `artifacts/ui-redesign-v2/about-seo-check.json`.
- Found (pre-existing, not changed): frontend `getSeoPolicy` requires `brand.identity.description` to be a plain string; bootstrap stores a rich doc, so the site can never become indexable even after Owner approval. Backend `seoPolicy` handles docs.

- Docker `compose.sh up -d --build web api worker` OK (migrate clean). Seed `--dry-run --only about.` → only `SETTING_CREATE about.page`, 0 replace, 0 media import; `--apply` → `SETTING_CREATED=1`, `DVB_PUBLIC_BOOTSTRAP_APPLY=PASS`. Menu via `PUT /api/v1/navigation/primary`: Về mình `/lien-he` → `/ve-minh` (other items untouched, "Tra cứu phòng" stays disabled).
- `PageHero` image now uses the media's own alt (was replaced by the generic "Ảnh minh họa"); web container rebuilt again.
- :18473 and :18480 `/ve-minh` 200, 1 h1, tel:0974045828, 0 console errors, 0 overflow. `artifacts/ui-redesign-v2/about-real-1440.png` (via new `scripts/ui-demo/real-shot.mjs`).

- Final build + public QA re-run on final code: BUILD PASS, QA 60/60 OK. Final report `docs/ui-redesign/final-report-v3-about.md`.

## Addendum (2026-10-06 evening): full SEO copy + structured Admin form
- ef85383 backend: new `about.page` copy (H1 with "Đặt phòng Cúc Phương", intro 81 words, story 331 words / 4 paragraphs, 4 values 33–36 words, 4 steps, 4 "Hiểu Cúc Phương như người nhà" cards, 6 FAQs, CTA), `ogDescription` + `ogImageMediaId`, `normalizeAboutPage` server validation (TipTap whitelist via `sanitizeDocument`, UUID media ids, internal links, bounded lists, trimmed/limited texts). Backend tests 85/85.
- d49b246 frontend: `AboutPageForm` (8 sections, existing `ValueField` → TipTap + Media Library picker, list add/remove/↑↓/drag-handle, SEO length meters), OG description/image in metadata, 4-card area grid, demo data now read from `scripts/ui-demo/about-page.json` (snapshot of the bootstrap).
- Docker rebuilt; seed `--only about.` dry-run → `SETTING_SKIP about.page DIFFERS`; row was v1 with only the bootstrap audit entry, so `--apply --replace-existing --only about.` → `SETTING_REPLACED=1`.
- `scripts/ui-demo/about-admin-e2e.mjs` on :18473: edit intro (TipTap) + pick card image (Media Library) + reorder value → save → /ve-minh shows it → undo via form → stored value equals original. First attempt saved but failed to undo (script mistook the brand e-mail field for the login form); restored with the seed replace, fixed the script, final run all PASS (v6→v7→v8).
- Form section nav: hash jumps scrolled the locked outer admin document; replaced with nearest-scroll-container scrolling.
- QA 60/60 OK, build PASS, SEO approved-mode check PASS (FAQPage 6 questions). Screenshots refreshed + `about-admin-1440.png`.

## Next
- Nothing required. Task finished; production deploy intentionally not done.
