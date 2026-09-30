# Production Chrome QA Fix Handoff — 2026-09-30

## Decision

**Not accepted for commit, push, or production deployment.** The media/legacy-ALT fixes and related verification are implemented locally, but the production React error `#418` has no proven root cause and the full opt-in Playwright suite has not completed cleanly after the final outage-test adjustment. No production deployment or production business-data mutation was performed.

## Repository state

- Branch: `main`
- Starting HEAD: `4e49bb14af148714ca00f45db3cd3e35bfaafd68`
- Final HEAD: `4e49bb14af148714ca00f45db3cd3e35bfaafd68` (unchanged)
- Commit/push: not performed
- Production deploy: not performed
- Worktree: local modifications remain uncommitted; pre-existing QA evidence under `docs/PRODUCTION_CHROME_QA_2026-09-30.md` and `artifacts/production-chrome-qa-2026-09-30/` was preserved.

## Implemented locally

1. Added shared media ALT normalization for legacy sentinel values such as missing/undefined values and filename-like placeholders (`.jpg`, `.png`, etc.). Public and admin image rendering now uses a safe descriptive fallback without rewriting existing database rows.
2. Added media usage metadata to media list/detail responses. Usage accounts for registered content and settings references, and the API rejects deletion of an asset that is still referenced with HTTP `409` (`media_in_use`).
3. Updated Media Library to show where an asset is in use and disable its delete action while referenced.
4. Added service, upload-metadata, smoke, and browser assertions for usage status, safe ALT behavior, and deletion protection.
5. Corrected stale E2E selectors for the current promo markup and made the API-outage test verify the exact API container's Docker state before checking the public retry/recovery behavior.

The handoff does **not** claim that these changes fix React error `#418`.

## Production Chrome investigation

- In the user's Chrome profile, direct visits intermittently produced minified React error `#418` on `/dat-phong` and `/phong-nghi`; `/combo-du-lich` and `/diem-den` were clean in the same sampling window. The reports reference a shared hashed client chunk.
- A separate clean Chromium run against production passed **20/20** visual-route checks across five viewport widths, with no captured console/client errors.
- This difference makes a browser-profile-specific interaction plausible, but it does not prove an extension or profile mutation is the cause. A local hydration observation also showed a `head`/`body` charset-meta discrepancy in a development warning; that observation was not established as the production cause.
- Chrome extension settings could not be inspected in this session. Therefore the production #418 root cause remains **unproven and unresolved**. Do not describe it as fixed.

Suggested follow-up: reproduce in Chrome Incognito or a clean profile with extensions disabled, compare affected routes, and capture the complete console/component stack and response for the shared client chunk. If the error persists in a clean profile, investigate the relevant route hydration/render tree before accepting a fix.

## Forest Home production finding

The Forest Home public record showed repeated location text in its excerpt/body/meta description, and an image ALT placeholder (`undefined.jpg`) was observed. The repetitive copy is a production content/data issue; it was not edited. Correct the copy and image ALT through the authorized admin workflow after owner review. The local ALT normalization prevents a filename sentinel from being exposed as useful alternative text, but does not alter the stored production record.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Pass (final rerun) |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `npm --prefix backend run build` | Pass |
| `npm --prefix backend test` | Pass, 64/64 |
| Local API smoke | Pass, 72 passed / 0 failed |
| `npm run audit:no-hardcode` | Pass; reports 43 existing findings |
| `npm run audit:admin-runtime` | Pass; 18 routes, 79 reachable modules, zero pending admin routes/modules and zero fixture fallbacks |
| `npm run audit:public-content` | Pass; all 12 required metrics are zero |
| Standard Playwright suite | Pass, 108 passed / 4 opt-in tests skipped (before the final test-only outage adjustment) |
| Opt-in bootstrap tests | Passed individually, including mutation/apply/restore flow |
| Restart persistence + API outage tests | Pass, 2/2 sequentially after the final outage-test adjustment |
| Full opt-in Playwright suite | **Not cleanly verified after the final adjustment.** The preceding full run was 111 passed / 1 failed in API-outage health-state polling; the changed test then passed in the targeted sequential run above. |
| Production visual routes in clean Chromium | Pass, 20/20 |
| `git diff --check` | Pass (exit code 0; Git emitted line-ending normalization warnings only) |

The full opt-in Playwright command to rerun is:

```powershell
$env:BASE_URL='http://127.0.0.1:18473'
$env:DVB_ADMIN_RESTART_STACK='1'
$env:DVB_PUBLIC_API_OUTAGE_QA='1'
$env:DVB_BOOTSTRAP_E2E='1'
$env:DVB_BOOTSTRAP_MUTATION_QA='1'
npx playwright test --workers=1 --reporter=line
```

## Local data safety

The local Docker stack was left healthy. QA homepage/settings/property markers were removed/restored; checks showed zero `home_qa` properties, zero `home_qa` content nodes, zero QA settings markers, and all 11 imported `CP-%` properties still present. The two media assets from this run were removed; the two older `upload-*.webp` assets dated 2026-09-28 were preserved. No production rows, settings, credentials, or images were changed.

## Required before acceptance

1. Prove and fix the production Chrome `#418` cause (or document a clean-profile reproduction that decisively isolates it).
2. Rerun the full opt-in Playwright command and obtain a clean result, then recheck local QA fixture cleanup.
3. Review the complete staged diff, including regenerated audit reports, before any commit.
4. Only after all acceptance gates pass, follow the task's requested main commit/push procedure. Production deployment remains out of scope.
