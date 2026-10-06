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

## Next
- Step 2–3 (admin meta, route, CSS, JSON-LD).
