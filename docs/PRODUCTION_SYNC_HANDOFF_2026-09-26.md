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
REMOTE_MAIN_BEFORE=29159b26b6529953116ce5e8684e8a3152cb3d2a
LOCAL_HEAD_BEFORE=29159b26b6529953116ce5e8684e8a3152cb3d2a
LOCAL_DIRTY_BEFORE=NO
LOCAL_AHEAD_BEFORE=0
IMPLEMENTATION_SHA=702d97e46203fef1843426574f05ee33aa79cfc1
FINAL_SHA=702d97e46203fef1843426574f05ee33aa79cfc1 (implementation/deployment target; doc-only follow-up follows)
REMOTE_MAIN_AFTER_IMPLEMENTATION=702d97e46203fef1843426574f05ee33aa79cfc1
REMOTE_MAIN_AFTER_DOC=docs-only follow-up SHA is reported in the task result
WORKTREE_FINAL=CLEAN (after the documentation-only handoff follow-up)
PUSH_RESULT=PASS (implementation push fetched and verified; handoff is a separate documentation-only follow-up)
HANDOFF_DOC_FOLLOWUP=Documentation-only commit containing this refreshed file; exact tip is reported in the task result
```

At the start of this follow-up audit, branch `main` was clean and local HEAD matched
`origin/main`; both were already ahead of the production baseline by the previously
reviewed integration and handoff commits. The current audit fix was committed as
`702d97e` and pushed normally (no force push). A fresh fetch confirmed local HEAD and
`origin/main` both at the full implementation SHA above. The only remaining commit is
the documentation-only refresh of this handoff; its exact remote tip is provided in
the task result because a commit cannot contain its own SHA.

## 2. Changes absent from the production baseline

- **Frontend:** public catalog/content reads use the API; dynamic stay/combo/destination/article/static-page routes; content rendering; consultation inquiry submission; responsive public and admin styling; self-hosted licensed fonts. Key files include `src/lib/api/public.ts`, `src/app/**`, `src/components/site/SiteDataProvider.tsx`, `src/components/content/RichContentRenderer.tsx`, `src/components/home/SiteFooter.tsx`, and `src/styles/**`.
- **Admin:** authenticated API-backed property drafts, content list/editor, static pages, menu manager, inquiry inbox, shared Media Library and image picker, structured settings editor and AI provider settings. This audit also replaced misleading shell placeholders with real session/logout behavior and surfaced unsupported workflows honestly; the menu can restore its default through an audited API action. Key files include `src/components/admin/AdminAuthGate.tsx`, `src/components/admin/shell/**`, `src/components/admin/properties/PropertyCatalogScreen.tsx`, `src/components/admin/content/AdminContentList.tsx`, `src/components/admin/media/**`, and `src/components/admin/navigation/MenuManager.tsx`.
- **Backend:** property/content/public catalog, inquiry, navigation, Media Library and AI-writing/image endpoints; optimistic version handling, publication checks, sanitized rich content, encrypted provider keys and internal-link candidates from currently published records. This audit fixed the article typed projection on publish and nested media storage-key validation. Key files include `backend/src/{catalog,content,public,inquiries,navigation,media,ai}/**` and `backend/src/settings/**`.
- **Database/migrations:** three additive/data-routing migrations; see section 4.
- **SEO/Schema:** indexing gate defaults closed; canonical/metadata policy, robots, sitemap, redirects for legacy routes, JSON-LD builders and publication eligibility. Key files include `src/lib/seo/**`, `src/app/robots.ts`, `src/app/sitemap.ts`, `backend/src/public/public-catalog.service.ts`, `infra/gateway/default.conf`, and the migrations below.
- **Operations:** committed safe `.env` templates, explicit false/blank SEO defaults, backend runner now copies source into a disposable container and builds before executing scripts, and web/gateway runtime settings. No actual environment file or secret is included.
- **Tests:** API-backed browser tests replaced stale fixture-only admin/public tests. The current local run passed the full 26/26 Playwright suite, 11/11 backend unit tests, and 54/54 API smoke checks. SEO checks covered noindex/draft isolation, route/redirect behavior and robots/sitemap policy; a positive published-content JSON-LD case remains unverified because no eligible live content exists.
- **Documentation:** data-lineage and remaining-blocker audit, SEO evidence, AI configuration guide, license and operator instructions; this file is the separate follow-up handoff.

## 3. Commits for production review

| SHA | Commit | Nội dung | Có migration? |
|---|---|---|---|
| `c50a7cedd7833c557a65eae9885fcd6e82f6ff94` | `feat: connect CMS, catalog, AI content and SEO` | Full audited implementation from the baseline: real API/CMS/admin integrations, SEO, AI, docs, tests and reproducible local setup | YES — 3 |
| `29159b26b6529953116ce5e8684e8a3152cb3d2a` | `docs: add production sync handoff` | Initial production-sync audit handoff; no runtime or database change | NO |
| `702d97e46203fef1843426574f05ee33aa79cfc1` | `fix(admin): close local API audit gaps` | API-backed shell/menu fixes, article projection/media validation, smoke hardening and current-run docs/tests | NO |
| `<handoff-only follow-up>` | `docs: refresh production sync handoff` | This refreshed handoff only; no runtime or database change | NO |

The current code implementation range is
`54c246bbe9f70ed3bf298401e39df3e30a73057c..702d97e46203fef1843426574f05ee33aa79cfc1`.
The documentation-only follow-up keeps the handoff in the repository and the worktree
clean; its exact SHA is intentionally not embedded in itself.

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
RUN_MIGRATION=YES (for the three migrations since the production baseline; none were added by the current audit commit)
RUN_SEED=NO
RESTART_GATEWAY=YES (Nginx config changed)

ENV_EXAMPLE_FIX=PASS
BACKEND_SH_SEED_FIX=PASS (isolated build-before-script path reviewed; local seed is idempotent; create-owner was not run)
```

The `.env.docker.example` and `.env.runtime.example` files contain defaults/paths, not
credentials; this follow-up changed no environment files. The local Compose stack was
rebuilt and the `api`, `web`, and `worker` services restarted without removing or
resetting database/Redis volumes. Compose config validation passed; API health reported
database up and the home route returned HTTP 200. The existing local database remains
user data. The seeded roles/owner account were left intact; `create-owner` was not run.
The local owner login is `halabcreative@gmail.com`; the password remains in the local
owner secret file and is not copied into this handoff.

## 7. Test results

| Test | Result | Notes |
|---|---|---|
| Frontend lint | PASS | `npm run lint -- --no-warn-ignored` |
| Frontend typecheck | PASS | `npm run typecheck` |
| Frontend build | PASS | Next.js production build completed during Docker web image rebuild |
| Frontend Playwright | PASS | 26 passed, 0 failed, serial run against local Docker API/web; covers admin routes, menu, content/media, SEO, pricing and responsive widths |
| Backend build | PASS | Docker API/worker build completed; Nest build passed |
| Backend tests | PASS | 11 passed, 0 failed |
| Docker config | PASS | `docker compose --env-file .env.docker --env-file .env.ports config --quiet` |
| API smoke | PASS | 54 passed, 0 failed; includes auth/CSRF, settings restore, WebP/ALT/media, publishing, article API, redirects and test-data cleanup |
| Local persistence | PASS | A precisely identified page draft survived API/web/worker restart, then was deleted through the versioned API and verified 404 |
| SEO/public-data | PASS WITH LIMITATION | noindex, draft isolation, robots/sitemap policy, HTTP 404 and redirects verified. Positive published-content JSON-LD is unverified because there is no eligible published content. |
| No-hardcode audit | PASS WITH FINDINGS | `npm run audit:no-hardcode`: 43 findings (21 erased type-only imports, 6 allowed guest ID preferences, 16 legacy-admin findings documented for review). |
| `git diff --check` | PASS | Cached diff check clean before implementation commit. |
| Credential/path scan | PASS | Staged secret scan clean; zero env/secret files staged. Existing local credentials and database volumes were preserved. |
| Dependency audit notice | OPEN BLOCKER | Previous audit recorded 17 backend dependency findings (1 low, 8 moderate, 8 high); this follow-up did not rerun or force-upgrade dependencies. |

## 8. Production deployment recommendation

```text
DEPLOY_FROM_SHA=54c246bbe9f70ed3bf298401e39df3e30a73057c
DEPLOY_TO_SHA=702d97e46203fef1843426574f05ee33aa79cfc1 (implementation; handoff-only doc follows)

SAFE_TO_PREPARE_DEPLOY_COMMAND=NO
BLOCKERS=backend dependency audit findings from prior review (8 high); booking/inventory/payment/CRM/report workflows remain incomplete; no production DB backup/migration-state/TLS/CSRF/CDN verification; no positive published-content JSON-LD case; production state remains unknown
```

No production deploy, migration, seed/import, indexing change, DNS update, or service
restart was performed. The database-backed public surface intentionally does not use
demo catalog fallback. Keep `SEO_INDEXING_ALLOWED=false` until the owner approves an
HTTPS origin and real content has been reviewed. Checkout remains an inquiry flow,
not a confirmed reservation/payment system.

## 9. Exact changed files

The full production-baseline inventory below was captured before this follow-up. The
exact additional implementation delta committed in `702d97e` is listed after it; thus
the baseline-to-implementation inventory is the existing list plus this exact delta.

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

Exact output of `git diff --name-status 29159b26b6529953116ce5e8684e8a3152cb3d2a 702d97e46203fef1843426574f05ee33aa79cfc1`:

```text
M	backend/scripts/smoke.mjs
M	backend/src/content/content.service.spec.ts
M	backend/src/content/content.service.ts
M	backend/src/main.ts
M	backend/src/navigation/navigation.controller.ts
M	backend/src/navigation/navigation.service.ts
A	docs/ADMIN_RUN_TO_GOAL_HANDOFF_2026-09-26.md
A	docs/admin/admin-legacy-findings.md
A	docs/admin/admin-run-to-goal-matrix.md
M	docs/admin/implementation-status.md
M	docs/data-audit/no-hardcode-report.json
M	src/components/admin/AdminAuthGate.tsx
M	src/components/admin/navigation/MenuManager.tsx
M	src/components/admin/shell/AdminShell.tsx
M	src/components/admin/shell/AdminSidebar.tsx
M	src/components/admin/shell/AdminTopbar.tsx
M	src/components/admin/shell/page-meta.ts
M	src/styles/admin.css
D	tests/admin/bookings.spec.ts
M	tests/admin/catalogue.spec.ts
D	tests/admin/editor.spec.ts
A	tests/admin/helpers.ts
M	tests/admin/shell.spec.ts
D	tests/home.spec.ts
D	tests/navigation.spec.ts
D	tests/pages.spec.ts
M	tests/pricing.spec.ts
A	tests/public-data.spec.ts
```

The handoff file itself is the only file changed by the documentation-only follow-up.
