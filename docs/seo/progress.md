# DVB_FULL_TECHNICAL_SEO_ROUTE_SCHEMA — progress

Spec: `/home/openclaw/projects/dinh-van-booking-TASK-SEO.md` (sections 1–78).
START_SHA (real) = a049e88 (the spec expected 89ddafe; main had moved on, so per §0 there was no reset).

## Done
- Audited the backend slug/route code, public resolve, sitemap, frontend SEO policy/metadata/schema and the Admin slug field.
- P0 backend (1453328): `slug-lifecycle.ts` (preview/generate/routes), Generate-only, no title→slug on create, slug removed from the update DTOs, restore keeps the URL, partner drafts get no URL; 95/95 backend tests.
- P0/P1/P2/P3 frontend (c4961c6):
  - `src/lib/routes.ts` registry and `scripts/check-human-routes.mjs` (`npm run seo:routes`);
  - new `AdminSlugField` (Generate, confirmation, route history) and `AdminSeoPanel`;
  - policy fix (rich brand description); private noindex + lowercase 308 in middleware;
  - schema graph with stable ids;
  - `npm run seo:test` (19 unit tests).
- `seo.structuredData.localBusiness` toggle (default false); demo API approved mode; `scripts/seo/seo-qa.mjs`.

## Next
- Backend tests again; local `next build` + approved-mode QA (demo API); fix findings.
- Docker rebuild; real-stack QA with QA content (Admin E2E Generate + 308) and cleanup.
- Docs (§67), final report (§77), BA review.
