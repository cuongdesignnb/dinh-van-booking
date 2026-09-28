# DVB — Global slug lifecycle and route stability

Task: `DVB_GLOBAL_SLUG_LIFECYCLE_AND_ROUTE_STABILITY_RUN_TO_GOAL`
Date: 2026-09-28
Baseline: `df66482ee385bbc3b09a43ee6fedb557da7df3e6` (`main`)

## Product contract implemented

| Operation | Result |
| --- | --- |
| Create, title typed or changed while slug is automatic | Vietnamese-aware slug appears and follows the title. The API independently generates it if slug is missing or blank. |
| Create, slug edited by hand | Switches to manual; later title/AI changes cannot overwrite the entered slug. |
| Duplicate | A new create-mode draft receives a new title-derived slug, then follows the same automatic/manual rules. |
| Edit, title changed (including AI-assisted title) | Persisted slug and public route stay unchanged. Omitted or same normalized slug cannot reserve a new route. |
| Explicit field edit or “Tạo slug từ tiêu đề” | Only changes form state until Save. URL preview and route-change warning are shown. Cancel leaves DB untouched. |
| Create collision | Server reserves a unique slug, e.g. `slug-2`; protected system routes also receive a safe suffix. |
| Edit collision | HTTP 409 with a clear owner-conflict message; no silent suffix. Protected system slugs are rejected. |
| Explicit rename / historical restore | In one transaction, old route becomes 308 history and exactly one route becomes current. The same content's historical route is reactivated with `upsert`, not duplicated. |

One `AdminSlugField` and `src/lib/slug.ts` serve both active admin screens: `PropertyCatalogScreen` for stay and `AdminContentList` for combo, destination, article and page. Both client and canonical server slugifiers use the same Vietnamese test vectors. The server is authoritative when a create collision requires a suffix.

The PostgreSQL schema already has globally unique `public_routes.path` and a partial unique index for one current route per content. No migration was needed. New route writes use 308; the public resolver emits 308 for existing historical rows whose stored value is 301, without rewriting those rows or production data.

## Cross-kind acceptance

| Kind | Create auto | Edit title stable | Generate button | Manual override | Route history / restore |
| --- | --- | --- | --- | --- | --- |
| stay | PASS | PASS | PASS | PASS | PASS |
| combo | PASS | PASS | PASS | PASS | PASS |
| destination | PASS | PASS | PASS | PASS | PASS |
| article | PASS | PASS | PASS | PASS | PASS |
| page | PASS | PASS | PASS | PASS | PASS |

`tests/admin/slug-lifecycle.spec.ts` drives the five real admin routes, authenticated API calls, and read-only inspection of the exact synthetic content's `public_routes` rows in local PostgreSQL. It covers create auto/manual/generate, edit title stability, generate-and-cancel, same-slug save, omitted/same normalized update, create collision, foreign 409, explicit rename, repeated save, historical restore, duplicate article, and protected page slug. Each test creates only uniquely named local drafts and deletes those drafts in `finally`; post-run local query found `0` `Slug QA %` content nodes. The backend tests additionally exercise the shared route transaction helper for all five kinds and a legacy 301 public resolver row.

## Runtime and legacy audit

`npm run audit:admin-runtime` traverses actual admin entry imports. It reports `legacySlugEditorReachableCount=0` and `activeSlugScreenMissingCount=0`; both active screens import `AdminSlugField`. `PropertyEditor`, `ComboEditor`, `DestinationEditor`, `PropertiesScreen`, `CombosScreen` and `ContentScreen` remain unreachable legacy files. They were not reintroduced into production runtime and no AdminStore/localStorage business fallback was added.

## Fresh local QA

| Check | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm --prefix backend run build` | PASS |
| `npm --prefix backend test` | PASS, 38/38 |
| `scripts/smoke.sh` via Git Bash (Windows WSL Bash unavailable) | PASS, 69/69 |
| `BASE_URL=http://127.0.0.1:18473 DVB_BOOTSTRAP_E2E=1 npx playwright test --workers=1` | PASS; 47 passed, 2 unrelated opt-in tests skipped |
| `npm run audit:no-hardcode` | PASS; 42 classified baseline findings, no runtime business fixture fallback |
| `npm run audit:admin-runtime` | PASS; 0 legacy slug editors reachable, 0 active slug screens missing |
| `npm run audit:public-content` | PASS; all 12 public business-hardcode/editor/image metrics 0 |

The two Playwright skips are pre-existing opt-in mutation/restart tests (`DVB_BOOTSTRAP_MUTATION_QA`, `DVB_ADMIN_RESTART_STACK`), not slug coverage. Docker local API, web, worker, Redis and PostgreSQL were rebuilt/checked; no production stack was touched.

## Handoff markers

```text
SLUG_POLICY_CREATE_AUTO=PASS
SLUG_POLICY_EDIT_TITLE_STABLE=PASS
SLUG_GENERATE_BUTTON_ALL_KINDS=PASS
SLUG_MANUAL_OVERRIDE=PASS
STAY_SLUG_UI=PASS
COMBO_SLUG_UI=PASS
DESTINATION_SLUG_UI=PASS
ARTICLE_SLUG_UI=PASS
PAGE_SLUG_UI=PASS
PROPERTY_SELF_COLLISION_FIX=PASS
SLUG_CREATE_FROM_TITLE=PASS
SLUG_CREATE_COLLISION_UNIQUE=PASS
SLUG_UPDATE_OMITTED_STABLE=PASS
SLUG_UPDATE_SAME_VALUE_STABLE=PASS
SLUG_UPDATE_TITLE_ONLY_STABLE=PASS
SLUG_UPDATE_FOREIGN_COLLISION_409=PASS
SLUG_RENAME_CREATES_REDIRECT=PASS
SLUG_REPEATED_SAVE_STABLE=PASS
SLUG_HISTORICAL_RESTORE=PASS
PUBLIC_ROUTE_HISTORY_NO_LOOP=PASS
CREATE_TITLE_AUTOGENERATES_SLUG=PASS
CREATE_MANUAL_SLUG_STOPS_AUTO_SYNC=PASS
CREATE_GENERATE_BUTTON_REFRESHES_SLUG=PASS
EDIT_TITLE_DOES_NOT_CHANGE_SLUG=PASS
EDIT_GENERATE_BUTTON_CHANGES_FORM_SLUG=PASS
EDIT_CANCEL_DOES_NOT_CHANGE_ROUTE=PASS
EDIT_SAVE_SAME_SLUG_NO_ROUTE_CHANGE=PASS
RUNTIME_FIXTURE_FALLBACK_COUNT=0
LEGACY_SLUG_EDITOR_REACHABLE_COUNT=0
NEW_MIGRATIONS=0
ENV_CHANGES=0
BUSINESS_DATA_CHANGES=0
PRODUCTION_DEPLOYMENT=NO
```

`BUSINESS_DATA_CHANGES=0` refers to deployed/production business data and permanent content changes. Tests used temporary local draft fixtures, then removed them. Existing production records, including Nhà Sàn Forest Home and its current/historical routes, were not edited. After a separately authorized deployment, the Owner may explicitly use the editor to restore its own historical slug. The immutable final commit and remote SHA are reported after push; embedding that SHA in this file would change it.
