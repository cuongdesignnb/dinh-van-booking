# Technical SEO & structured data — implementation status

Last checked: 2026-09-23. Baseline: `54c246bbe9f70ed3bf298401e39df3e30a73057c`. Work is local and uncommitted; the existing dirty worktree was preserved.

## Safety state

Search indexing remains closed. `SEO_INDEXING_ALLOWED` defaults to `false`; the database SEO toggle, an HTTPS canonical origin, an exact Owner-approved deployment origin, and confirmed brand identity are also required. The local origin `http://127.0.0.1:18473` is never accepted as a canonical URL. `robots.txt` allows crawlers to visit public paths so they can see `noindex`, disallows admin/API paths, and only advertises the sitemap after the gate opens.

The local database currently has zero published stays, combos, destinations, articles, or static pages. Consequently the sitemap has zero URLs and public lists are empty; drafts are not substituted. No content was fabricated to make the sitemap or structured-data validators appear complete.

## Implemented

- Public reads now use explicit API projections from PostgreSQL and reject demo content/media. Public media must be ready and public; private media is served only after permission checks. API errors are propagated instead of becoming fixture fallbacks or successful empty results.
- SEO settings use the existing settings registry/API. A server-side gate controls canonical URLs, robots, JSON-LD and sitemap eligibility; query facets and private routes are noindex. Root metadata supplies site defaults without inheriting the homepage canonical/robots onto child pages.
- Added independently addressable detail routes for stays, combos, destinations, articles and root-level CMS pages. Legacy root routes are resolved only after the referenced item is confirmed public. The old `?combo=` and `?d=` links resolve by real published database ID/slug: valid targets issue Next.js permanent redirects (HTTP 308); missing targets are 404.
- Added runtime `robots.txt` and sitemap generation from the public URL inventory. Eligibility requires published, non-demo content, useful body text, approved public cover media, and entity-specific requirements; stays also require an active property, active room/unit and positive rate.
- Added core graph builders for Organization/WebSite/WebPage, breadcrumbs, collections, stays, trips, destinations and articles. JSON-LD is escaped safely and emitted only when the shared page eligibility checks and index gate allow it. Commercial `Offer`, review aggregate, and VacationRental markup remain disabled.
- Added `firstPublishedAt`, `lastPublicChangedAt`, and revision content snapshots through additive migrations. Unknown publication times remain null. A follow-up migration protects reserved root paths after the CMS-page route migration. Content/settings writes require an expected version and use compare-and-swap or serializable transactions.
- Rebuilt and started the local API/web containers; Nginx was syntax-checked and restarted to load API `X-Robots-Tag` headers.

## Verification evidence

Evidence is in [`artifacts/seo/2026-09-23`](../../artifacts/seo/2026-09-23/). The focused local Playwright suite passes 6/6, backend unit tests pass 4/4, TypeScript and ESLint pass, and Docker production builds for API and web pass. The applied migrations are listed in `runtime-context.txt`.

The source audit [`no-hardcode-report.json`](../data-audit/no-hardcode-report.json) reports 43 findings: 21 type-only references (not runtime fixture use), 6 allowed guest-preference reads, and 16 legacy-admin references flagged for review before production. Keep those legacy screens out of any production workflow until each is confirmed replaced by authenticated API/DB flows.

## Not verified / launch blockers

- Positive published-content cases could not be exercised without creating test business records. Therefore positive canonical/OG/schema output, valid legacy redirects, slug-history chains, admin-write-to-second-session visibility, and sitemap `lastmod` transitions are not marked passed.
- Expected-version conflict races, CSRF/role permutations, private-media unauthorized/authorized download, API/DB outage status, cache invalidation across instances, and scheduled publication are not integration-tested here.
- No Lighthouse/Core Web Vitals lab, mobile visual pass, Schema.org validator, Google Rich Results Test, Search Console, or production crawl was run.
- Pagination URLs do not yet have a server-backed, independently indexable page contract; arbitrary `page` and filter queries remain noindex. Never submit filter combinations as landing pages.
- Owner/Editor must confirm the production HTTPS domain, legal/brand/contact details, licensed public logo/cover images, and which actual records are approved for publication. Confirm that the index toggle is intended before setting it. Do not set the deployment gate or public indexing toggle as part of this task.
- W6 commercial structured data remains blocked by verified price/inventory and review dependencies. No production deploy, DNS change, Search Console submission, booking/payment activation, or production indexing was performed.

## Result summary

| Area | Result |
|---|---|
| Local noindex gate and protected admin API | PASS |
| Public projection and empty-database behavior | PASS for the observed empty local database |
| Unknown URL HTTP 404, including unresolved legacy queries | PASS |
| Positive 301/308 redirect target behavior | NOT RUN — no published records |
| Robots/sitemap safety while index is closed | PASS |
| Positive canonical, metadata image, and core JSON-LD | NOT RUN — no approved origin or eligible records |
| Offers / review aggregates / VacationRental | DISABLED BY DEPENDENCY |
| Performance / field data / external validators | NOT RUN / NOT AVAILABLE |
| Production deploy and production indexing | NOT REQUESTED / NOT ENABLED |
