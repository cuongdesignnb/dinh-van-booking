# Production sync handoff — 2026-09-27

This is a review handoff only. No production host, database, DNS, environment, indexing setting, or service was accessed or changed. The deploy target is the implementation SHA below; a documentation-only follow-up commit will update this handoff after the target push.

## 1. Git state

<pre>
REPO=https://github.com/cuongdesignnb/dinh-van-booking.git
BRANCH=main
PRODUCTION_BASELINE_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
REMOTE_MAIN_BEFORE=30ca32dade747b6592f427ec45d559cb1d8ffbad
LOCAL_HEAD_BEFORE=30ca32dade747b6592f427ec45d559cb1d8ffbad
LOCAL_DIRTY_BEFORE=YES (related admin audit/handoff work already in progress; preserved)
LOCAL_AHEAD_BEFORE=0
FINAL_SHA=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369 (implementation/deployment target; docs-only follow-up is not runtime code)
REMOTE_MAIN_AFTER_IMPLEMENTATION_PUSH=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369
DOCS_ONLY_FOLLOWUP=separate docs/report commit; its exact SHA and final origin/main tip are reported in the task result
WORKTREE_FINAL=CLEAN after docs-only follow-up; verified in task result
PUSH_RESULT=PASS for implementation push; docs-only push and final origin/main tip verified in task result
</pre>

At task start, local main and origin/main both pointed to `30ca32dade747b6592f427ec45d559cb1d8ffbad`; there were no local-only commits. The implementation/audit commit is `c8fe7a94303ce81cb109cc3a35c8587dbe9b3369`. The handoff is refreshed separately in a docs-only commit; production code-review/deploy target remains c8fe7a9.

## 2. Changes present after the production baseline

- **Frontend:** API-backed public catalogue/content, detail/list routes for stays/combos/destinations/articles/static pages, consultation form, responsive layout, metadata/canonical/JSON-LD, robots/sitemap, self-hosted licensed fonts. Primary areas: src/app/**, src/components/site/**, src/components/home/**, src/lib/api/public.ts, src/lib/seo/**, src/styles/**.
- **Admin:** authenticated API shell; property catalog; CMS article/destination/combo/static-page editors; TipTap; Media Library; settings and AI provider UI; menu; inquiry inbox. This implementation fixes stale Nginx Docker upstream DNS after container recreation, adds explicit list API error/retry states, settings save/conflict persistence and property unpublish. Browser tests cover real CRUD, public propagation, permission/version conflicts, restart persistence and responsive layouts. Primary areas: src/app/admin/**, src/components/admin/**, tests/admin/**, infra/gateway/default.conf.
- **Backend/API:** session auth/CSRF/permissions; content/catalog/public APIs; AI content/image integration; media conversion/storage; inquiry and navigation; settings; audit/version/publication checks. Primary areas: backend/src/**.
- **Database/migrations:** 3 migrations since baseline, listed in section 4. No migration was added in c8fe7a9.
- **SEO/Schema:** index gate defaults closed; canonical and metadata policy; server-rendered JSON-LD builders; robots/sitemap; public route/redirect resolution; draft isolation. Primary areas: src/lib/seo/**, src/app/robots.ts, src/app/sitemap.ts, backend/src/public/**, infra/gateway/default.conf.
- **Operations:** safe .env.docker.example and .env.runtime.example; compose wiring; backend runner builds from source in a disposable Node container before seed/create-owner/test; no actual environment or secret file is tracked.
- **Tests:** Playwright public/admin/SEO/pricing and lifecycle tests; backend unit tests; API smoke; no-hardcode scanner and data audit docs.
- **Documentation:** data lineage, AI guide, technical SEO, admin route matrix and legacy findings, local/production handoffs.

## 3. Commits since production baseline

| SHA | Commit | Summary | Migration? |
|---|---|---|---|
| c50a7cedd7833c557a65eae9885fcd6e82f6ff94 | feat: connect CMS, catalog, AI content and SEO | API/CMS/catalog integration, AI, public SEO, tests and docs | YES — 3 |
| 29159b26b6529953116ce5e8684e8a3152cb3d2a | docs: add production sync handoff | Initial production handoff | NO |
| 702d97e46203fef1843426574f05ee33aa79cfc1 | fix(admin): close local API audit gaps | Authenticated shell/menu, article projection/media guard, API smoke hardening and admin audit | NO |
| 093cb06a83dc4ff4bfd2795a348a74248fc5b861 | docs: refresh production sync handoff | Handoff refresh | NO |
| 30f24f7a3c3de6ab3ff37783950a2b4d45e2a45f | test(admin): verify API-backed catalogue workflows | Remove live AdminStore shell dependency, exercise real stay/combo/destination CRUD lifecycle, refresh admin evidence | NO |
| c8fe7a94303ce81cb109cc3a35c8587dbe9b3369 | fix(admin): close run-to-goal gaps and gateway restart | Admin/API/browser run-to-goal closure, Nginx dynamic Docker DNS resolver, persistence and permission QA | NO |
| docs-only follow-up SHA in final result | docs: finalize admin and production handoffs | Handoff updates and refreshed scanner report only | NO |

Production code review/deploy target is the range `54c246bbe9f70ed3bf298401e39df3e30a73057c..c8fe7a94303ce81cb109cc3a35c8587dbe9b3369`. The final remote main additionally contains a docs-only follow-up; its exact tip is stated in the task result.

## 4. Database impact

<pre>
NEW_MIGRATIONS=3
MIGRATION_FILES=backend/prisma/migrations/20260923110000_public_seo_snapshots/migration.sql; backend/prisma/migrations/20260923113000_static_pages_root_routes/migration.sql; backend/prisma/migrations/20260923120000_protect_root_reserved_pages/migration.sql
DESTRUCTIVE_MIGRATION=NO (no tables/columns dropped; route data is transformed)
DATA_BACKFILL_REQUIRED=YES (eligible static pages move to root routes; old section paths remain redirects)
SEED_REQUIRED=NO for an upgrade from the stated baseline (role/permission seed source is unchanged)
SETTINGS_MIGRATION_REQUIRED=NO
</pre>

The first migration adds nullable publication/SEO snapshot fields. The static-page migrations transform route assignments and reserve application paths. No migration drops tables or columns. The route backfill has no automatic down migration; before a production rollout, require a verified database and media backup plus a reviewed restore/forward-fix plan. Production migration state was not inspected.

Local migration status after rebuilding the app stack: all 5 unique migrations applied. One earlier init attempt is recorded as rolled back, followed by a successful application. scripts/backend.sh seed was run twice locally after confirming exact built-in grants; it remained at 21 permissions, 5 roles and 2 users. Production seed is not required for this code upgrade and must not be run unless separately justified.

## 5. Environment/config impact

<pre>
NEW_ENV_VARS=SEO_INDEXING_ALLOWED (default false); SEO_APPROVED_CANONICAL_ORIGIN (default blank); optional AI_CONTENT_*, AI_IMAGE_*, AI_SETTINGS_ENCRYPTION_KEY[_FILE]
REMOVED_ENV_VARS=NONE
CHANGED_ENV_VARS=Compose forwards SEO gate/canonical origin to web and API; default keeps indexing closed
NEW_SECRET_REQUIRED=NO (provider keys are optional; AI key encryption falls back to the existing SESSION_SECRET)
</pre>

If a dedicated AI_SETTINGS_ENCRYPTION_KEY is configured, persist the same key across restarts; do not rotate SESSION_SECRET during this source sync. AI provider keys and canonical origin require owner approval. Never enable indexing as part of this deploy. Both example files were tested in a disposable fresh-clone fixture: first run created the env/secrets, second run preserved every file byte-for-byte. The real local env/secret files were kept and are not tracked.

## 6. Docker/operations impact

<pre>
REBUILD_WEB=YES
REBUILD_API=YES
REBUILD_WORKER=YES
RUN_MIGRATION=YES
RUN_SEED=NO (baseline upgrade; current role/permission seed definitions did not change)
RESTART_GATEWAY=YES (gateway config changed)

ENV_EXAMPLE_FIX=PASS
BACKEND_SH_SEED_FIX=PASS
</pre>

The Compose command built images for api, web and worker. Backend image layers were unchanged/cached and those containers stayed up; the changed web image was recreated, and the migration job completed. PostgreSQL, Redis and media volumes were not removed or reset. API health and local homepage/robots returned HTTP 200. The read-only port preflight found 18473 occupied by this local stack and 18474 free. The preflight `--write` mode was not run because rewriting `.env.ports` would interrupt the active test URL. Local env/secrets were preserved.

scripts/backend.sh seed and the existing-owner create-owner guard were exercised through the wrapper. The wrapper copies checked-in source to a fresh container filesystem, runs npm ci, Prisma generate and Nest build, then executes the command; it does not depend on host backend/dist. Seed completed twice with unchanged counts. create-owner built successfully and safely refused the already-existing email; no Owner account was changed or created. The actual password was never printed or committed.

## 7. Test results

| Test | Result | Notes |
|---|---|---|
| Frontend lint | PASS | npm run lint -- --no-warn-ignored |
| Frontend typecheck | PASS | npm run typecheck |
| Frontend build | PASS | Host Next production build and Docker web image build |
| Frontend Playwright | PASS | 34/34 with clean Node 24 dependency install; serial against local gateway; includes CRUD lifecycle, inquiries, TipTap/media, settings persistence/conflict, publish/public propagation, restart persistence and responsive layouts |
| Backend build | PASS | Source build inside Node 24 Docker runner and Compose API build |
| Backend tests | PASS | 14/14, including permission-guard cases |
| Docker config | PASS | `docker compose --env-file .env.docker --env-file .env.ports config --quiet` |
| API smoke | PASS | 65/65: auth/CSRF/permissions, settings/version conflict, media/WebP/ALT, content/navigation/inquiry/property/catalog and cleanup |
| SEO audit | PASS WITH LIMITATION | Robots, sitemap, canonical/noindex/draft isolation, redirects and true 404 pass; positive published-content JSON-LD was not exercised because there is no approved public content |
| Env examples | PASS | Fresh-clone creation + idempotent rerun, no overwrite |
| Backend seed/owner wrapper | PASS | Seed twice; duplicate-owner guard rejected without DB mutation |
| No-hardcode audit | PASS WITH FINDINGS | 43: 21 erased type-only imports, 6 allowed guest preference matches, 16 disconnected legacy-admin findings; see docs/data-audit/no-hardcode-report.json and docs/admin/admin-legacy-findings.md |
| Dependency audit notice | OPEN | Backend install reports 17 (1 low, 8 moderate, 8 high). Frontend full dependency tree reports 3 (2 high, 1 critical); production-only `npm audit --omit=dev` could not reach registry, so prod-only severity is unclassified. No forced dependency changes |

The new browser tests use unique ATG-* records and remove them; final local aggregate confirms 0 test properties/content and the original 2 users remain. A separate prior persistence check confirmed an identified draft survives local API/web/worker restart and was then deleted by exact ID.

## 8. Production deployment recommendation

<pre>
DEPLOY_FROM_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
DEPLOY_TO_SHA=c8fe7a94303ce81cb109cc3a35c8587dbe9b3369
SAFE_TO_PREPARE_DEPLOY_COMMAND=NO
BLOCKERS=3 frontend full-tree advisories (2 high, 1 critical) with prod-only status unverified; 17 backend advisories (8 high); booking/inventory/customer/promotion/payment/report incomplete; production DB migration state, backup/restore, HTTPS/TLS, CSRF and CDN not inspected; route backfill needs reviewed backup/forward-fix plan; no approved live content for positive JSON-LD verification
</pre>

No production deploy, migration, seed/import, index opening, DNS update or service restart occurred. Keep SEO_INDEXING_ALLOWED=false until the owner explicitly approves the HTTPS canonical origin and real published content. Checkout is consultation, not a confirmed booking/payment system.

## 9. Exact changed-file output

Exact `git diff --name-status 54c246bbe9f70ed3bf298401e39df3e30a73057c c8fe7a94303ce81cb109cc3a35c8587dbe9b3369` captured after the implementation commit (225 tracked paths). The docs-only follow-up changes no path set relative to this production baseline.

<pre>
A	.env.docker.example
A	.env.runtime.example
M	.gitignore
M	README.md
A	artifacts/seo/2026-09-23/before-after-public-update.json
A	artifacts/seo/2026-09-23/external-validators.txt
A	artifacts/seo/2026-09-23/http-status-cases.json
A	artifacts/seo/2026-09-23/performance-lab.json
A	artifacts/seo/2026-09-23/route-audit.csv
A	artifacts/seo/2026-09-23/runtime-context.txt
A	artifacts/seo/2026-09-23/sitemap-check.json
A	artifacts/seo/2026-09-23/validation-summary.txt
M	backend/package.json
A	backend/prisma/migrations/20260923110000_public_seo_snapshots/migration.sql
A	backend/prisma/migrations/20260923113000_static_pages_root_routes/migration.sql
A	backend/prisma/migrations/20260923120000_protect_root_reserved_pages/migration.sql
M	backend/prisma/schema.prisma
M	backend/scripts/smoke.mjs
A	backend/src/ai/ai.controller.ts
A	backend/src/ai/ai.dto.ts
A	backend/src/ai/ai.module.ts
A	backend/src/ai/ai.service.spec.ts
A	backend/src/ai/ai.service.ts
A	backend/src/ai/safe-network.ts
M	backend/src/app.module.ts
A	backend/src/catalog/catalog.module.ts
A	backend/src/catalog/dto/property.dto.ts
A	backend/src/catalog/properties.controller.ts
A	backend/src/catalog/properties.service.ts
A	backend/src/common/permissions.guard.spec.ts
M	backend/src/content/content.controller.ts
A	backend/src/content/content.service.spec.ts
M	backend/src/content/content.service.ts
M	backend/src/content/dto/content.dto.ts
A	backend/src/content/slug.spec.ts
M	backend/src/content/slug.ts
A	backend/src/inquiries/dto/inquiry.dto.ts
A	backend/src/inquiries/inquiry.controller.ts
A	backend/src/inquiries/inquiry.module.ts
A	backend/src/inquiries/inquiry.service.ts
M	backend/src/main.ts
A	backend/src/navigation/navigation.controller.ts
A	backend/src/navigation/navigation.dto.ts
A	backend/src/navigation/navigation.module.ts
A	backend/src/navigation/navigation.service.ts
A	backend/src/public/public-catalog.service.spec.ts
A	backend/src/public/public-catalog.service.ts
A	backend/src/public/public.controller.ts
A	backend/src/public/public.module.ts
A	backend/src/scripts/data/cuc-phuong-stays.spec.ts
A	backend/src/scripts/data/cuc-phuong-stays.ts
A	backend/src/scripts/import-cuc-phuong.ts
M	backend/src/settings/dto/settings.dto.ts
M	backend/src/settings/settings.controller.ts
M	backend/src/settings/settings.registry.ts
M	backend/src/settings/settings.service.ts
M	compose.yaml
A	docs/ADMIN_RUN_TO_GOAL_HANDOFF_2026-09-26.md
A	docs/PRODUCTION_SYNC_HANDOFF_2026-09-26.md
A	docs/admin/admin-legacy-findings.md
A	docs/admin/admin-run-to-goal-matrix.md
M	docs/admin/implementation-status.md
A	docs/ai-content-and-images.md
A	docs/data-audit/README.md
A	docs/data-audit/allowed-static-values.md
A	docs/data-audit/api-manifest.md
A	docs/data-audit/cache-strategy.md
A	docs/data-audit/cuc-phuong-import.md
A	docs/data-audit/data-lineage.csv
A	docs/data-audit/environment.md
A	docs/data-audit/evidence/local-smoke.md
A	docs/data-audit/findings-before.md
A	docs/data-audit/legacy-local-data.md
A	docs/data-audit/no-hardcode-report.json
A	docs/data-audit/remaining-blockers.md
A	docs/data-audit/schema-delta.md
A	docs/data-audit/screenshots/README.md
A	docs/data-audit/verification.md
A	docs/seo/technical-seo-implementation.md
M	docs/ui-verification.md
M	eslint.config.mjs
M	infra/gateway/default.conf
M	infra/web.Dockerfile
M	package-lock.json
M	package.json
M	playwright.config.ts
A	public/fonts/OFL.txt
A	public/fonts/dancing-script-latin-ext.woff2
A	public/fonts/dancing-script-latin.woff2
A	public/fonts/dancing-script-vietnamese.woff2
A	public/fonts/playfair-latin-ext.woff2
A	public/fonts/playfair-latin.woff2
A	public/fonts/playfair-vietnamese.woff2
A	public/fonts/roboto-condensed-italic-latin-ext.woff2
A	public/fonts/roboto-condensed-italic-latin.woff2
A	public/fonts/roboto-condensed-italic-vietnamese.woff2
A	public/fonts/roboto-condensed-latin-ext.woff2
A	public/fonts/roboto-condensed-latin.woff2
A	public/fonts/roboto-condensed-vietnamese.woff2
M	scripts/backend.sh
A	scripts/no-hardcode-runtime.mjs
A	src/app/[slug]/page.tsx
M	src/app/admin/cai-dat/page.tsx
A	src/app/admin/chuyen-trang/page.tsx
M	src/app/admin/combo-du-lich/page.tsx
M	src/app/admin/dat-phong/page.tsx
M	src/app/admin/diem-den/page.tsx
M	src/app/admin/khach-hang/page.tsx
M	src/app/admin/layout.tsx
A	src/app/admin/menu/page.tsx
M	src/app/admin/noi-dung/page.tsx
M	src/app/admin/page.tsx
M	src/app/admin/phong-nghi/page.tsx
A	src/app/admin/thu-vien-anh/page.tsx
M	src/app/admin/yeu-cau-tu-van/page.tsx
A	src/app/bai-viet/[slug]/page.tsx
A	src/app/bai-viet/page.tsx
A	src/app/chuyen-trang/[slug]/page.tsx
A	src/app/chuyen-trang/page.tsx
A	src/app/combo-du-lich/[slug]/page.tsx
M	src/app/combo-du-lich/page.tsx
M	src/app/dat-phong/page.tsx
A	src/app/diem-den/[slug]/page.tsx
M	src/app/diem-den/page.tsx
D	src/app/fonts.ts
M	src/app/globals.css
M	src/app/layout.tsx
M	src/app/lien-he/page.tsx
M	src/app/not-found.tsx
M	src/app/page.tsx
M	src/app/phong-nghi/[slug]/page.tsx
M	src/app/phong-nghi/page.tsx
A	src/app/robots.ts
A	src/app/sitemap.ts
A	src/components/admin/AdminAuthGate.tsx
M	src/components/admin/AdminStore.tsx
A	src/components/admin/content/AdminContentList.tsx
M	src/components/admin/content/ContentScreen.tsx
M	src/components/admin/content/MediaLibrary.tsx
M	src/components/admin/content/MediaPicker.tsx
A	src/components/admin/crm/InquiryInbox.tsx
A	src/components/admin/media/MediaLibrary.tsx
A	src/components/admin/media/MediaPicker.tsx
A	src/components/admin/navigation/MenuManager.tsx
A	src/components/admin/properties/PropertyCatalogScreen.tsx
A	src/components/admin/settings/AiSettingsPanel.tsx
A	src/components/admin/settings/SettingsFormEditor.tsx
A	src/components/admin/settings/SettingsScreen.tsx
A	src/components/admin/shared/AiContentAssistant.tsx
M	src/components/admin/shared/RichTextEditor.tsx
M	src/components/admin/shell/AdminShell.tsx
M	src/components/admin/shell/AdminSidebar.tsx
M	src/components/admin/shell/AdminTopbar.tsx
M	src/components/admin/shell/page-meta.ts
M	src/components/booking/Checkout.tsx
M	src/components/combos/ComboExplorer.tsx
M	src/components/contact/ConsultationForm.tsx
M	src/components/contact/ContactWidgets.tsx
A	src/components/content/RichContentRenderer.tsx
M	src/components/destinations/DestinationExplorer.tsx
M	src/components/destinations/DiscoveryLower.tsx
M	src/components/home/DestinationGrid.tsx
M	src/components/home/FeaturedStays.tsx
M	src/components/home/PersonalContact.tsx
M	src/components/home/SiteFooter.tsx
M	src/components/home/SiteHeader.tsx
M	src/components/home/StayCard.tsx
M	src/components/home/Testimonials.tsx
M	src/components/home/TrustStrip.tsx
M	src/components/home/WhyChooseUs.tsx
M	src/components/layout/PageShell.tsx
A	src/components/seo/JsonLd.tsx
A	src/components/site/SiteDataProvider.tsx
M	src/components/stay-detail/BookingCard.tsx
M	src/components/stay-detail/DetailWidgets.tsx
M	src/components/stay-detail/InfoBlocks.tsx
M	src/components/stays/ListingCard.tsx
M	src/components/stays/StayFilterPanel.tsx
M	src/components/stays/StayMap.tsx
M	src/components/stays/StaySearchBar.tsx
M	src/components/stays/StaysExplorer.tsx
M	src/components/ui/BrandLogo.tsx
M	src/components/ui/DialogHost.tsx
M	src/config/site.ts
M	src/data/combos.ts
M	src/data/destinations.ts
M	src/data/stays.ts
M	src/data/types.ts
A	src/lib/api/client.ts
A	src/lib/api/public.ts
M	src/lib/booking/pricing.ts
A	src/lib/catalog/constants.ts
A	src/lib/catalog/pricing.ts
A	src/lib/content/rich-document.ts
A	src/lib/seo/content.ts
A	src/lib/seo/metadata.ts
A	src/lib/seo/policy.ts
A	src/lib/seo/schema.ts
M	src/lib/services/consultation.ts
M	src/lib/stay-filters.ts
A	src/middleware.ts
A	src/styles/admin-ai.css
M	src/styles/admin-editor.css
A	src/styles/admin-media.css
M	src/styles/admin-responsive.css
M	src/styles/admin-ui.css
M	src/styles/admin.css
M	src/styles/pages.css
A	src/styles/rich-content.css
A	src/styles/static-pages.css
M	src/styles/stays.css
D	tests/admin/bookings.spec.ts
M	tests/admin/catalogue.spec.ts
D	tests/admin/editor.spec.ts
A	tests/admin/critical-workflows.spec.ts
A	tests/admin/helpers.ts
A	tests/admin/restart-persistence.spec.ts
A	tests/admin/run-to-goal.spec.ts
M	tests/admin/shell.spec.ts
D	tests/home.spec.ts
D	tests/navigation.spec.ts
D	tests/pages.spec.ts
M	tests/pricing.spec.ts
A	tests/public-data.spec.ts
A	tests/seo.spec.ts
</pre>
