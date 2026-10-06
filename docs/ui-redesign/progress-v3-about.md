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

## Next
- Final report `docs/ui-redesign/final-report-v3-about.md`, push, STOP.
