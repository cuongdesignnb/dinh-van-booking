```
DVB_FULL_TECHNICAL_SEO_RESULT

START_SHA=a049e88 (spec expected 89ddafe; main was ahead, so per §0 there was no reset and the audit/implementation ran on a049e88)
FINAL_SHA=2fa8c19 (last implementation/docs commit; this report is the next commit "docs(seo): final report", then the BA review commit)
REMOTE_MAIN_AFTER=equal to local HEAD after the last push (git rev-parse HEAD origin/main)
WORKTREE_FINAL=CLEAN

ROUTE_AUDIT=PASS
ALL_HUMAN_ROUTES_VI_ASCII=PASS
ROUTE_REGISTRY=PASS
ROUTE_LINT=PASS

SLUG_GENERATE_ONLY=PASS
CREATE_NO_HIDDEN_AUTOSLUG=PASS
TITLE_EDIT_SLUG_STABLE=PASS
GENERATE_BUTTON=PASS
SLUG_COLLISION=PASS
RESERVED_SLUG=PASS
HISTORICAL_ROUTE=PASS
OLD_ROUTE_308=PASS
REDIRECT_ONE_HOP=PASS
DELETE_ROUTE_POLICY=PASS (archive/unpublish/delete → 404, never a redirect to home; 410 not implemented, see KNOWN_GAPS)

CANONICAL=PASS
QUERY_POLICY=PASS
ROBOTS=PASS
SITEMAP=PASS
METADATA=PASS
OPEN_GRAPH=PASS
TWITTER=PASS

HOME_SCHEMA=PASS
STAYS_COLLECTION_SCHEMA=PASS
STAY_DETAIL_SCHEMA=PASS
COMBO_COLLECTION_SCHEMA=PASS
COMBO_DETAIL_SCHEMA=PASS
DESTINATION_COLLECTION_SCHEMA=PASS
DESTINATION_DETAIL_SCHEMA=PASS
ARTICLE_COLLECTION_SCHEMA=PASS
ARTICLE_DETAIL_SCHEMA=PASS
CONTACT_SCHEMA=PASS
BREADCRUMB_SCHEMA=PASS
(schema PASS = unit tests + approved-mode QA on the demo API with a production build. The local DB has
 no published content, so positive schema output on real records was not observable.)

NO_FAKE_REVIEW_SCHEMA=PASS
NO_FAKE_GEO_SCHEMA=PASS
NO_PRIVATE_SCHEMA_DATA=PASS

SSR_CONTENT=PASS
IMAGE_SEO=PARTIAL (every <img> has alt, size/fill, no undefined src; OG/schema images absolute HTTPS on the approved origin.
                   Decorative images passed alt="" are rendered with the generic fallback "Ảnh minh họa" by ManagedImage,
                   and real ALT quality depends on Media Library alt text. Left unchanged.)
H1_STRUCTURE=PASS
NO_HYDRATION_ERRORS=PASS

FRONTEND_TYPECHECK=PASS
FRONTEND_LINT=PASS
FRONTEND_BUILD=PASS
BACKEND_BUILD=PASS
BACKEND_TESTS=PASS (95/95)

MIGRATIONS=0
BUSINESS_DATA_CHANGES=0
PRODUCTION_DEPLOYMENT=NO
INDEXING_ACTIVATION=NOT_CHANGED (OWNER_ACTION_REQUIRED)

COMMITS=8 since START_SHA + this report (+ the BA review commit)
  8d3557b docs(seo): start technical SEO progress log
  1453328 feat(seo): explicit Generate-only slug lifecycle (preview/generate/routes API, no title->slug on create, no slug in generic update, restore keeps URL, partner drafts without URL)
  c4961c6 feat(seo): route registry + route lint, Generate-only Admin slug UI …, Admin SEO panel, policy/metadata/sitemap fixes …, typed schema graph …, seo:test unit suite
  87d01aa feat(seo): Owner-verified localBusiness schema toggle, demo approved-mode SEO data, seo-qa script
  b4061a9 fix(seo): sitemap eligibility uses body text only (same as the page index gate); approved-mode QA evidence
  a972393 test(seo): real-stack slug lifecycle E2E and gated/approved SEO QA evidence
  b1f51eb test(seo): seo.spec sitemap expectation includes /ve-minh
  2fa8c19 docs(seo): current route audit, route map, slug lifecycle, schema matrix, operations guide
FILES_CHANGED=66 between a049e88 and 2fa8c19 (+7557 / −703, including the JSON/XML/PNG evidence); +1 with this report
DOCS=docs/seo/current-route-audit.md, docs/seo/route-map.md, docs/seo/slug-lifecycle.md, docs/seo/schema-matrix.md,
     docs/seo/technical-seo-operations.md, docs/seo/final-report.md, docs/seo/progress.md;
     evidence in artifacts/seo/2026-10-06/
KNOWN_GAPS=see below
BLOCKERS=none
```

## Evidence
| Check | Command | Result |
|---|---|---|
| Route lint | `npm run seo:routes` | `routes=55 pages=51 reservedParity=PASS linkLiteralProblems=0` → ROUTE_LINT=PASS. A negative test catches `Phòng_Test` and `about`. |
| SEO unit suite | `npm run seo:test` (Playwright runner, no browser) | 19/19 (policy, canonical, query, title, every schema builder, serializer) |
| Backend | `bash scripts/backend.sh test` | 95/95. New: `slug-lifecycle.spec.ts` (9), `slug.spec.ts` (6) |
| Frontend | `npm run typecheck`, `npm run lint`, `NEXT_DIST_DIR=.next-pub npm run build` | PASS / PASS / PASS. The Docker web image also ran `next build`. |
| Approved-mode QA (demo API, `DEMO_SEO_INDEX=1`, `SEO_INDEXING_ALLOWED=true`, approved origin, production build) | `scripts/seo/seo-qa.mjs` → `artifacts/seo/2026-10-06/seo-qa-approved.json`, `sitemap-approved.xml` | **280/280** |
| Real Docker stack, indexing closed | `SEO_QA_MODE=gated` → `seo-qa-gated.json` | **108/108** |
| Real-stack slug E2E (QA content, cleaned up) | `scripts/seo/slug-e2e.mjs` → `slug-e2e.json` + 4 screenshots | **32/32** |
| Existing SEO e2e | `BASE_URL=http://localhost:18473 npx playwright test tests/seo.spec.ts` | 6/6. The sitemap expectation was updated for `/ve-minh` (v3). |

**What the approved-mode QA covered**, on 11 pages (`/`, 4 lists, 4 details, `/lien-he`, `/ve-minh`):
- 200, title, description, one H1 in SSR HTML;
- images: alt + size, no `undefined`;
- robots index; absolute canonical = clean URL; OG title/description/url; Twitter card; og:image absolute;
- expected schema types; @ids absolute on the approved origin; `#webpage`/`#breadcrumb`/entity ids;
- no rating/review/geo/offer/internal counters; no localhost/Docker host;
- 0 hydration, console or page errors (Chromium).

Plus:
- private `/dat-phong`, `/lich-phong`, `/doi-tac`, `/admin`: noindex meta + `X-Robots-Tag`, no canonical/JSON-LD;
- queries: UTM/gclid → clean canonical; sort/filter → noindex without canonical; `/lich-phong` with dates → noindex; detail with dates → clean canonical;
- status codes: trailing slash → 308; uppercase → 308; unknown → 404; demo old slug → 308 one hop to a 200 page whose canonical is itself;
- robots.txt: Disallow `/admin/` `/api/`, Sitemap line;
- sitemap: only approved-origin URLs; no private/query/redirect URLs; contains details; every sampled URL is 200 + index.

**Gated** = the same pages on http://localhost:18473: everything noindex, no canonical/JSON-LD, empty sitemap, no Sitemap line, private headers, 404/308 rules, 0 browser errors.

**Slug E2E** (real stack, QA content `[QA-SEO]`):
- Admin UI create: typing the title leaves "Chưa tạo"; Generate fills `/bai-viet/qa-seo-nha-san-forest-home`; renaming before save doesn't change it; Save stores exactly that slug.
- Edit: title + SEO save keeps the slug. "Generate lại slug" shows the confirmation with the old/new URL; history shows the old URL → 308 with the actor; saving after Generate works.
- API: PUT with `slug` → 400; stale version → 409; create without Generate → slug/path null; non-normalised slug on create → 400; collision with a current slug and with a historical slug → 409 + `-2` suggestion; reserved → 400; stay preview endpoint.
- Published URL change: unconfirmed → 400; confirmed → both old URLs 308 straight to the new URL (one hop, the target is 200); history 1 + 2; sitemap still empty; archive → current and old URLs 404.
- Cleanup: 0 QA nodes and 0 QA routes left (checked in PostgreSQL). The local DB is back to 11 stay drafts, as before.

## What changed (summary)
- **Slug lifecycle (backend):**
  - `slug-lifecycle.ts` with preview/generate/routes endpoints for content and properties;
  - create never derives a slug from the title;
  - generic update DTOs no longer accept `slug`;
  - published URL changes require confirmation;
  - collisions return 409, never a silent suffix;
  - historical routes stay reserved;
  - audit `content.slug_generated`;
  - revision restore keeps the URL;
  - partner drafts have no URL;
  - reserved list +`doi-tac`, `lich-phong`.
- **Admin:**
  - new `AdminSlugField`: "Chưa tạo" → Generate, collision suggestion, confirmation dialog, route history table;
  - `AdminSeoPanel`: Google preview, canonical/robots/OG facts, warnings for empty/short/long/duplicate meta, missing OG, slug not generated, noindex, thin content, missing schema inputs; typed schema status, no free JSON-LD;
  - used for content, combos, destinations, articles, static pages and stays;
  - publish checklist: Generate message, combo needs an itinerary, article needs an author.
- **Routes:**
  - `src/lib/routes.ts` registry;
  - `scripts/check-human-routes.mjs`;
  - middleware: lowercase 308; `X-Robots-Tag: noindex` always on `/admin`, `/dat-phong`, `/doi-tac`, `/lich-phong`; reserved list from the registry.
- **Policy/metadata:**
  - fixed the frontend `getSeoPolicy` bug (rich-document brand description blocked indexing forever);
  - brand title template shared with Admin, never repeated;
  - `/lich-phong` now noindex with no relative canonical (it could resolve to localhost) and no hardcoded brand;
  - admin/partner titles take the brand from settings;
  - canonical is lowercase;
  - the sitemap drops private/query paths;
  - backend sitemap eligibility uses body text only, the same rule as the page index gate, so a sitemap URL is never a noindex page.
- **Schema:**
  - stable ids `#lodging/#trip/#destination/#article/#itemlist`;
  - lodging subtype only on an exact kind match;
  - PostalAddress, check-in/out only when visible, amenityFeature;
  - ContactPage on `/lien-he`;
  - `/ve-minh` Person `worksFor` → `#organization` (the unverified inline TravelAgency was removed);
  - TravelAgency only with the new Owner flag `seo.structuredData.localBusiness` + phone + address;
  - never rating/review/geo/offer.

## KNOWN_GAPS
- **410 Gone** needs a tombstone table (a migration), so it was not built (§72). Deleted/archived content returns 404.
  - After a **hard delete** of a never-published draft, its old paths are free again.
  - Archived content keeps its routes reserved.
- **Replacement redirect** (an Admin picks an equivalent page for a deleted item → 308) has no UI or API. Nothing redirects to home.
- **Schema on real records not observed**: the local DB has 0 published items (11 drafts must stay unpublished). Positive schema/canonical/sitemap output was checked on the demo API in approved mode and with unit tests.
- **IMAGE_SEO PARTIAL**: decorative images get the generic alt "Ảnh minh họa"; ALT quality depends on Media Library data.
- **Pagination**: catalog lists are client-filtered with no `?page=` URLs. Any `page` query is noindex. There are no crawlable paginated pages because none are needed for the current catalog size.
- **Core Web Vitals**: hero `priority` + preload, `fill` images inside sized containers, SSR content verified. No Lighthouse/field data was run (§45: no fake score target).
- **Offer, AggregateRating, VacationRental** stay off by design until verified price/inventory and first-party review workflows exist.
- **Homepage index rule** (pre-existing): `/` is indexable only when at least one stay/destination is publicly eligible.
- **Hardcoded brand in partner-portal UI copy** (`PartnerPortal.tsx`, from v2): it is visible UI text, not metadata, and was left unchanged.
- **Audit history**: `audit_logs` keeps the create/slug/delete entries for the deleted QA items. The audit trail is append-only by design.
