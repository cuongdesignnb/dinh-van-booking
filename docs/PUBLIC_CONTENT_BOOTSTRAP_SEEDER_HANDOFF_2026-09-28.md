# DVB — Public content bootstrap seeder handoff (2026-09-28)

START_SHA=469558567e7c8d031f34ff07771185a4c0821a7e
FINAL_SHA=38777e63e75f09f30f2f0cadd38fc2f4ed4c7267 (implementation commit; the docs-only handoff commit is reported in the final task result)
REMOTE_MAIN_AFTER=38777e63e75f09f30f2f0cadd38fc2f4ed4c7267 (verified after implementation push; the subsequent docs-only tip is reported in the final task result)
WORKTREE_FINAL=CLEAN after docs-only commit/push verification; see final task result

BOOTSTRAP_SCRIPT=`bash scripts/backend.sh seed:public-bootstrap -- --dry-run [--actor-email owner@example.com]`
DEFAULT_MODE=DRY_RUN
APPLY_MODE=`bash scripts/backend.sh seed:public-bootstrap -- --apply [--actor-email owner@example.com]` — PASS on local
REPLACE_MODE=`bash scripts/backend.sh seed:public-bootstrap -- --apply --replace-existing [--actor-email owner@example.com]` — PASS on local
MIGRATION_REQUIRED=NO
SEED_PERMISSION_CHANGED=NO

## Scope and safeguards

The separate seeder imports owner-confirmed presentation copy into 24 public settings, six existing presentation images through the normal Media Library WebP/SHA/rendition pipeline, and the five-link primary menu only if that menu does not already exist. It requires an existing active Owner as the audit actor and never creates an account. Dry-run checks images, hashes, DB rows, and actor but writes neither DB nor files. Normal apply skips *every existing setting row*, regardless of version; it never replaces Admin edits. Explicit `--replace-existing` affects only the 24 manifest keys, prints BEFORE/AFTER, updates versions, and records audit entries. Existing navigation is always left untouched. Media is reused by SHA and no existing asset is deleted. The permission/role `seed` command remains unchanged.

BRAND_BOOTSTRAP=PASS
HEADER_BOOTSTRAP=PASS
FOOTER_BOOTSTRAP=PASS
HOME_HERO_BOOTSTRAP=PASS
HOME_TRUST_BOOTSTRAP=PASS
HOME_WHY_BOOTSTRAP=PASS
HOME_PROMO_BOOTSTRAP=PASS
HOME_CONTACT_BOOTSTRAP=PASS
FAQ_BOOTSTRAP=PASS
CONTACT_PAGE_BOOTSTRAP=PASS
CATALOG_PRESENTATION_BOOTSTRAP=PASS
SEO_BOOTSTRAP=PASS
NAVIGATION_BOOTSTRAP=PASS
MEDIA_LIBRARY_BOOTSTRAP=PASS

All rich fields are TipTap/ProseMirror documents. Public brand description now has a plain-text SEO projection. The existing SVG brand mark displays until an approved logo is supplied through Media Library. Empty public catalogs and reviews produce no cards/placeholder sections. Empty business settings still produce no demo/hardcoded business copy. Social URLs, business hours, email, address, map, and Zalo remain unset. SEO indexing stays disabled; no canonical production origin was set.

ADVISOR_NAME=Đinh Vân
ADVISOR_GENDER=FEMALE
ADVISOR_PHONE=0974045828
MALE_ADVISOR_ASSET_SEEDED=NO
ZALO_URL_REQUIRES_OWNER_CONFIRMATION=YES

The old `advisor-panel.webp` and `pages/contact-hero.webp` depict a man and were **not** imported or referenced as Đinh Vân. Advisor image fields remain `null`; a confirmed photo of Đinh Vân may be added later by the Owner. Six imported assets are `hero-cuc-phuong.webp`, `experience-promo.webp`, and the stays, destinations, combo, and checkout presentation heroes. None is a listing, review, or testimonial image. The phone CTA resolves to `tel:0974045828`; no Zalo CTA renders while `zaloUrl` is null.

FAKE_PROPERTIES_SEEDED=0
FAKE_ROOM_PRICES_SEEDED=0
FAKE_REVIEWS_SEEDED=0
FAKE_RATINGS_SEEDED=0
FAKE_BOOKINGS_SEEDED=0
FAKE_CUSTOMERS_SEEDED=0

## Verification on local Docker

- Clean disposable QA DB: dry-run left `settings|menus|media = 0|0|0`; apply produced `24 settings | 1 menu | 5 menu items | 6 WebP media`, with zero properties/reviews/bookings/customers. Second apply created zero settings/media/menu. The isolated QA DB and media volume were deleted after verification.
- Main local DB: 24 settings created, six images imported, existing five-link menu skipped; second apply created zero and reused all six media. The original 11 stay drafts remained drafts. Local site at `http://127.0.0.1:18473/` rendered Hero, trust, why, promo, FAQ, contact, menu and footer without public fake catalog cards. After Docker rebuild/restart, those rows remained in PostgreSQL.
- Admin edit QA: changed Hero title to an `ABCXYZ` marker through the authenticated API; ordinary `--apply` preserved it and the separate public session saw it immediately. Explicit replace restored the bootstrap title, left `booking.rules` untouched, and produced version/audit history. E2E restored baseline.
- Media QA: all six IDs resolve to actual WebP bytes via `/media/...` with ALT text; repeat apply reports `MEDIA_REUSE=6`. The existing Media Library deletion guard and public editor/media controls were exercised by Playwright/API smoke.
- Female-identity QA: no male advisor asset/reference or banned male copy; `advisorImageMediaId=null`, `imageMediaId=null`, `phone=0974045828`.

BOOTSTRAP_IDEMPOTENCY=PASS
EXISTING_ADMIN_CONTENT_PRESERVED=PASS
EXPLICIT_REPLACE_QA=PASS
MEDIA_DEDUPE_QA=PASS
PUBLIC_RENDER_AFTER_BOOTSTRAP=PASS
EMPTY_CATALOG_NO_FAKE_CARDS=PASS
ADVISOR_GENDER_QA=PASS

FRONTEND_LINT=PASS
FRONTEND_TYPECHECK=PASS
FRONTEND_BUILD=PASS
BACKEND_BUILD=PASS
BACKEND_TEST=PASS (26/26)
API_SMOKE=PASS (69/69)
PLAYWRIGHT=PASS (40 passed, 2 configured skips; the opt-in mutation QA passed separately)
AUDIT_NO_HARDCODE=PASS
AUDIT_ADMIN_RUNTIME=PASS (`runtimeFixtureFallbackCount=0`)
AUDIT_PUBLIC_CONTENT=PASS (all required public runtime hardcode/editor/image metrics = 0)

NEW_MIGRATIONS=0
ENV_CHANGES=0
SEED_PERMISSION_CHANGED=NO
HANDOFF_FILE=docs/PUBLIC_CONTENT_BOOTSTRAP_SEEDER_HANDOFF_2026-09-28.md
COMMIT_CREATED=YES
PUSHED_TO_MAIN=YES
PRODUCTION_DEPLOYMENT=NO
SAFE_TO_PREPARE_PRODUCTION_BOOTSTRAP=YES (dry-run/review first; apply requires a separate production authorization and confirmed image rights)
BLOCKERS=NONE for local implementation; production remains unchanged until a separate deploy and explicit production bootstrap.

For a future production run, back up PostgreSQL/media first, confirm rights to use the six presentation images, ensure an active Owner actor and matching Compose media volume, review `--dry-run`, and only then consider `--apply`. Never use `--replace-existing` without comparing the printed BEFORE/AFTER for each candidate. Do not enable `SEO_INDEXING_ALLOWED` or `seo.defaults.robotsIndex` as part of this bootstrap.
