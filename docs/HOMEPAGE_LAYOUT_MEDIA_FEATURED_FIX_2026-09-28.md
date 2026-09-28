# DVB — Homepage layout, Media Library images, featured stays

Task: `DVB_HOMEPAGE_LAYOUT_MEDIA_FEATURED_RUN_TO_GOAL`
Start: `e1fa03cac0161ffe8ebe262f164b30925bfc3f4a`
Visual-only reference: `ac20af35fdf50d603d72c479effafb57429b6c32`
Date: 2026-09-28

## Delivered

- Rebuilt the homepage's editorial slots without restoring business fixtures: Hero with embedded search, Trust, Featured main with Promo sidebar, the two-column lower grid, optional Combos, and FAQ after the lower grid. `home.sections` still controls visibility and group order; each module still reads its own public DB setting. Empty or invalid Trust/Why/FAQ items do not create empty layout shells.
- Adapted the one-stay card and promo-only composition; removed the large blank lower area when the advisor image is null. The 390, 768, 1024, 1440 and 1920 px viewport checks include horizontal-overflow and CTA bounds.
- Introduced `ManagedImage` for public Next image consumers. Only URLs beginning `/media/` bypass the Next optimizer; other image URLs retain normal Next behavior. The real `/media/*.webp` responses are verified on homepage, stay list and stay detail.
- Added explicit `featured: boolean` to the public stay projection. `published` controls public catalogue inclusion; `featured` controls homepage inclusion in `featured` mode. Admin's real property editor and list explain/show the status, while Home Settings exposes the `featured`/`all` choice as radio controls.
- Sanitized new media-upload filenames, ALT and captions that would otherwise persist literal `undefined`/`null` names. Property cover pickers refresh their default ALT from the current property title. Existing production media rows are deliberately not modified; SHA deduplication still returns an existing asset unchanged.

## Visual evidence

- [390 px homepage](../artifacts/homepage-restored-390.png)
- [768 px homepage](../artifacts/homepage-restored-768.png)
- [1440 px homepage](../artifacts/homepage-restored-1440.png)
- [1920 px homepage](../artifacts/homepage-restored-1920.png)
- [1440 px stay catalogue](../artifacts/stays-media-1440.png)

The screenshots use short-lived, clearly marked `HOME-QA-*` local properties; the test unpublishes and removes them, restores every touched setting, and removes its own uploaded media. Screenshots are evidence, not production content.

## Acceptance and verification

| Check | Result |
| --- | --- |
| HOMEPAGE_CLASSIC_LAYOUT_STRUCTURE / HERO_CLASSIC_COMPOSITION | PASS — Playwright DOM and Hero/Search geometry |
| FEATURED_PROMO_SIDE_BY_SIDE / LOWER_TWO_COLUMN_LAYOUT | PASS — desktop bounding boxes |
| RESPONSIVE_LAYOUT | PASS — 390/768/1024/1440/1920 px, no horizontal scroll; visual review of screenshots |
| MANAGED_MEDIA_RENDER_FIX / PUBLIC_STAY_CARD_MEDIA / PUBLIC_STAY_LIST_MEDIA / PUBLIC_STAY_DETAIL_MEDIA | PASS — direct `/media/*.webp`, HTTP 200 `image/webp`; no optimizer URL |
| HOME_FEATURED_MODE_FEATURED / HOME_FEATURED_MODE_ALL / HOME_FEATURED_EMPTY | PASS — two published synthetic stays with different featured flags, then both unpublished; promo-only fallback |
| ADMIN_FEATURED_LABEL / ADMIN_HOME_SELECTION_MODE_UI | PASS — real Admin editor/list and Settings radio controls |
| BAD_MEDIA_ALT_SANITIZATION | PASS — backend unit tests and actual local malformed upload |
| RUNTIME_FIXTURE_FALLBACK_COUNT / PUBLIC_BUSINESS_IMAGE_HARDCODE_COUNT | `0` / `0` |

Automated-test markers: `HOMEPAGE_CLASSIC_LAYOUT_STRUCTURE=PASS`, `HOMEPAGE_FEATURED_PROMO_COMPOSITION=PASS`, `HOMEPAGE_LOWER_TWO_COLUMN_COMPOSITION=PASS`, `MANAGED_MEDIA_NEXT_IMAGE_REGRESSION=PASS`, `PUBLIC_STAY_CARD_MEDIA=PASS`, `PUBLIC_STAY_LIST_MEDIA=PASS`, `PUBLIC_STAY_DETAIL_MEDIA=PASS`, `HOME_FEATURED_MODE_FEATURED=PASS`, `HOME_FEATURED_MODE_ALL=PASS`, `HOME_FEATURED_EMPTY=PASS`, `ADMIN_FEATURED_LABEL=PASS`, `ADMIN_HOME_SELECTION_MODE_UI=PASS`, `BAD_MEDIA_ALT_SANITIZATION=PASS`.

Fresh commands on this change:

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm --prefix backend run build` | PASS |
| `npm --prefix backend test` | PASS, 29/29 |
| `bash scripts/smoke.sh` | PASS, 69/69 |
| `BASE_URL=http://127.0.0.1:18473 DVB_BOOTSTRAP_E2E=1 npx playwright test --workers=1` | PASS, 41 passed; 2 intentionally skipped opt-in tests |
| `npm run audit:no-hardcode` | PASS; 42 pre-existing broad-scan findings, unchanged from baseline (16 legacy Admin, 20 type-only, 6 allowed guest preference) |
| `npm run audit:admin-runtime` | PASS; 0 reachable fixture/demo/business-localStorage modules |
| `npm run audit:public-content` | PASS; 19 public entries, 125 reachable modules, 0 unresolved imports and all 12 business-hardcode/editor metrics `0` |

## Scope and handoff

- `OLD_LAYOUT_USED_AS_VISUAL_REFERENCE=YES`
- `OLD_FIXTURE_DATA_RESTORED=NO`
- `NEW_MIGRATIONS=0`
- `ENV_CHANGES=0`
- `BUSINESS_DATA_CHANGES=0` (only temporary local E2E records, cleaned after tests)
- `PRODUCTION_DEPLOYMENT=NO`

No production deploy, DNS/SSL change, production bootstrap, indexing change, or modification to Nhà Sàn Forest Home was performed. Production's existing `undefined.jpg` media row is not automatically rewritten. Code is locally verified and ready for a separately authorized deployment; production behavior should be smoke-checked after such a deployment. The final pushed commit SHA is reported in the task result because embedding a commit's own SHA in this file would change that SHA.
