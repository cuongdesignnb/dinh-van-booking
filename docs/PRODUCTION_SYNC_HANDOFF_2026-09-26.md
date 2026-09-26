# Production sync handoff — 2026-09-26

This is a review handoff only. No production host, database, DNS, production settings,
or production service was accessed or changed. **Do not deploy based on this document yet**:
the recommendation below is `NO` until the listed blockers are addressed.

> Git cannot store a commit's own full SHA inside a file in that same commit without
> changing that SHA. Therefore `FINAL_SHA` below is the implementation commit; this
> handoff is a separate documentation-only follow-up commit. The exact current remote
> tip (which includes this file) is reported in the task's final result.

## 1. Git state

```text
REPO=https://github.com/cuongdesignnb/dinh-van-booking.git
BRANCH=main
PRODUCTION_BASELINE_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
REMOTE_MAIN_BEFORE=54c246bbe9f70ed3bf298401e39df3e30a73057c
LOCAL_HEAD_BEFORE=54c246bbe9f70ed3bf298401e39df3e30a73057c
LOCAL_DIRTY_BEFORE=YES
LOCAL_AHEAD_BEFORE=0
FINAL_SHA=c50a7cedd7833c557a65eae9885fcd6e82f6ff94 (implementation/deployment target)
REMOTE_MAIN_AFTER=c50a7cedd7833c557a65eae9885fcd6e82f6ff94 (after implementation push)
WORKTREE_FINAL=CLEAN (after the documentation-only handoff follow-up)
PUSH_RESULT=PASS (implementation commit pushed and fetch-verified; handoff pushed separately)
HANDOFF_DOC_FOLLOWUP=Documentation-only commit containing this file; exact tip is in the final result
```

Initial branch was `main`, local HEAD and `origin/main` both matched the production
baseline, there were no local commits ahead, and the worktree was dirty. The audited
implementation was committed as `c50a7ce` and pushed normally (no force push). A fetch
after the push confirmed local HEAD and `origin/main` both at the full `FINAL_SHA` above.

## 2. Changes absent from the production baseline

- **Frontend:** public catalog/content reads use the API; dynamic stay/combo/destination/article/static-page routes; content rendering; consultation inquiry submission; responsive public and admin styling; self-hosted licensed fonts. Key files include `src/lib/api/public.ts`, `src/app/**`, `src/components/site/SiteDataProvider.tsx`, `src/components/content/RichContentRenderer.tsx`, `src/components/home/SiteFooter.tsx`, and `src/styles/**`.
- **Admin:** authenticated API-backed property drafts, content list/editor, static pages, menu manager, inquiry inbox, shared Media Library and image picker, structured settings editor and AI provider settings. Key files include `src/components/admin/AdminAuthGate.tsx`, `src/components/admin/properties/PropertyCatalogScreen.tsx`, `src/components/admin/content/AdminContentList.tsx`, `src/components/admin/media/**`, `src/components/admin/navigation/MenuManager.tsx`, and `src/components/admin/settings/**`.
- **Backend:** property/content/public catalog, inquiry, navigation, Media Library and AI-writing/image endpoints; optimistic version handling, publication checks, sanitized rich content, encrypted provider keys and internal-link candidates from currently published records. Key files include `backend/src/{catalog,content,public,inquiries,navigation,media,ai}/**` and `backend/src/settings/**`.
- **Database/migrations:** three additive/data-routing migrations; see section 4.
- **SEO/Schema:** indexing gate defaults closed; canonical/metadata policy, robots, sitemap, redirects for legacy routes, JSON-LD builders and publication eligibility. Key files include `src/lib/seo/**`, `src/app/robots.ts`, `src/app/sitemap.ts`, `backend/src/public/public-catalog.service.ts`, `infra/gateway/default.conf`, and the migrations below.
- **Operations:** committed safe `.env` templates, explicit false/blank SEO defaults, backend runner now copies source into a disposable container and builds before executing scripts, and web/gateway runtime settings. No actual environment file or secret is included.
- **Tests:** AI/security/content/public-catalog unit tests, Cuc Phuong manifest tests and focused SEO browser tests. The backend suite run in this audit passed 10/10; the full existing frontend Playwright suite could not be completed with the API stopped.
- **Documentation:** data-lineage and remaining-blocker audit, SEO evidence, AI configuration guide, license and operator instructions; this file is the separate follow-up handoff.

## 3. Commits for production review

| SHA | Commit | Nội dung | Có migration? |
|---|---|---|---|
| `c50a7cedd7833c557a65eae9885fcd6e82f6ff94` | `feat: connect CMS, catalog, AI content and SEO` | Full audited implementation from the baseline: real API/CMS/admin integrations, SEO, AI, docs, tests and reproducible local setup | YES — 3 |
| `<handoff-only follow-up>` | `docs: add production sync handoff` | This handoff file only; no runtime or database change | NO |

The source implementation range is `54c246bbe9f70ed3bf298401e39df3e30a73057c..c50a7cedd7833c557a65eae9885fcd6e82f6ff94`.
The follow-up commit exists only to keep the required handoff in the repository and
worktree clean; its exact SHA is intentionally not embedded in itself.

## 4. Database impact

```text
NEW_MIGRATIONS=3
MIGRATION_FILES=backend/prisma/migrations/20260923110000_public_seo_snapshots/migration.sql; backend/prisma/migrations/20260923113000_static_pages_root_routes/migration.sql; backend/prisma/migrations/20260923120000_protect_root_reserved_pages/migration.sql
DESTRUCTIVE_MIGRATION=NO
DATA_BACKFILL_REQUIRED=YES (automatic route transition for eligible static pages)
SEED_REQUIRED=NO
SETTINGS_MIGRATION_REQUIRED=NO
```

`public_seo_snapshots` adds nullable publication timestamps and a nullable content
revision snapshot. The two static-page migrations move eligible CMS pages to root
routes, preserve section routes as redirects, and protect reserved application paths.
They do not drop tables or columns. The route data changes have no automatic down
migration; take verified database/media backups and use a reviewed forward-fix or
restore plan if rollback is needed. Production migration state was not inspected.

The optional Cúc Phương importer is a separate explicit command; it was not run and is
not required for deployment. It is not wired into startup or migrations.

## 5. Environment/config impact

```text
NEW_ENV_VARS=SEO_INDEXING_ALLOWED (default false); SEO_APPROVED_CANONICAL_ORIGIN (default blank); optional AI_CONTENT_*, AI_IMAGE_*, AI_SETTINGS_ENCRYPTION_KEY[_FILE] fallbacks
REMOVED_ENV_VARS=NONE
CHANGED_ENV_VARS=Compose passes the SEO indexing gate and approved origin to web/API; indexing stays closed by default
NEW_SECRET_REQUIRED=NO (AI provider keys are owner-supplied optional configuration; encryption defaults to the existing SESSION_SECRET)
```

If `AI_SETTINGS_ENCRYPTION_KEY` or its file variant is chosen, preserve it unchanged;
otherwise stored provider keys are encrypted using the existing session secret. Do
not rotate existing session/encryption secrets as part of this source sync. The owner
must separately approve any provider/key and canonical origin. Do not open indexing
as part of deployment.

## 6. Docker/operations impact

```text
REBUILD_WEB=YES
REBUILD_API=YES
REBUILD_WORKER=YES (uses the same backend runtime build)
RUN_MIGRATION=YES
RUN_SEED=NO
RESTART_GATEWAY=YES (Nginx config changed)

ENV_EXAMPLE_FIX=PASS
BACKEND_SH_SEED_FIX=PASS (clean-container build-before-script workflow verified; actual DB mutation was not run)
```

The `.env.docker.example` and `.env.runtime.example` files contain defaults/paths, not
credentials. `scripts/prepare-local-secrets.py` was checked in a disposable directory:
it generated strong local-only secret files, copied missing env files, and preserved
them on a second run. `scripts/backend.sh test` installed dependencies, generated
Prisma Client, built `dist`, and ran tests from a clean disposable container without
copying host `node_modules` or writing build outputs into the repository. Actual
`seed`/`create-owner` execution was not run because no database services were running.

Docker Compose config validation passed. No Compose project containers were running
after the audit; the temporary backend test container used `--rm`. No project database
was started, migrated, seeded, or changed in this task.

## 7. Test results

| Test | Result | Notes |
|---|---|---|
| Frontend lint | PASS | `npm run lint` |
| Frontend typecheck | PASS | `npm run typecheck` |
| Frontend build | PASS | `npm run build` |
| Frontend Playwright | FAIL / INTERRUPTED | `npm test -- --reporter=line` started Next, which repeatedly returned HTTP 503 “API phía máy chủ chưa được cấu hình”; stopped without a full-suite summary. Not a pass. |
| Backend build | PASS | `scripts/backend.sh test` includes `npm run build` |
| Backend tests | PASS | 10 passed, 0 failed |
| Docker config | PASS | `docker compose --env-file .env.docker --env-file .env.ports config --quiet` |
| API smoke | NOT RUN | Local Compose/API was stopped; avoided starting/migrating a project database during handoff. |
| SEO audit | PARTIAL | Source/noindex/sitemap/metadata/route policies reviewed; focused SEO evidence from 2026-09-23 records 6/6. Positive published-content/schema cases are not verified now because no local API/content dataset was running. |
| No-hardcode audit | PASS WITH FINDINGS | `npm run audit:no-hardcode`: 43 findings (21 erased type-only imports, 6 allowed guest ID preferences, 16 legacy-admin blockers). |
| `git diff --check` | PASS | Staged diff clean after fixing whitespace findings. |
| Credential/path scan | PASS | No private-key/token patterns; no actual `.env`, `.secrets`, credentials, backups or database dumps staged. Five SQL files are Prisma migrations (two baseline, three new). |
| Dependency audit notice | BLOCKER | Backend `npm ci` reported 17 findings: 1 low, 8 moderate, 8 high. No forced upgrade was attempted. |

## 8. Production deployment recommendation

```text
DEPLOY_FROM_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
DEPLOY_TO_SHA=c50a7cedd7833c557a65eae9885fcd6e82f6ff94 (implementation; handoff-only doc follows)

SAFE_TO_PREPARE_DEPLOY_COMMAND=NO
BLOCKERS=backend dependency audit findings (8 high); no completed frontend E2E against a running local API; legacy fixture-backed admin dashboard/booking/customer paths; booking/inventory/payment services incomplete; no production DB/image/TLS/CSRF/CDN verification; no positive live SEO/schema cases; production migration state unknown
```

No production deploy, migration, seed/import, indexing change, DNS update, or service
restart was performed. The database-backed public surface intentionally does not use
demo catalog fallback. Keep `SEO_INDEXING_ALLOWED=false` until the owner approves an
HTTPS origin and real content has been reviewed. Checkout remains an inquiry flow,
not a confirmed reservation/payment system.

## 9. Exact changed files

Output of `git diff --name-status 54c246bbe9f70ed3bf298401e39df3e30a73057c..HEAD`
after the implementation and handoff commits (the final line is this follow-up file):

```text
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
A	tests/seo.spec.ts
A	docs/PRODUCTION_SYNC_HANDOFF_2026-09-26.md
```
