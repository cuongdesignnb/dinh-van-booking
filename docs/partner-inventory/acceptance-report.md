# Acceptance and release-readiness report

## Result summary

**Core implementation is present, but this is not a complete acceptance or release approval.** Code/schema/UI were added and exercised locally against a disposable PostgreSQL container. Google Sheets live end-to-end, the complete specification test set, performance targets, mobile/accessibility matrix, full backup/restore, and a full project Playwright suite were not completed. Do not treat this report as permission to enable production flags or deploy.

Source-close verification: 2026-10-03, workstation-local isolated QA. No production system or durable project database was used. The audit rows explicitly marked previous evidence below were not rerun by the source-close task; the required source gates and targeted recovery were rerun on the final candidate.

## Test evidence

| Gate | Result | Evidence / boundary |
|---|---|---|
| Isolated PostgreSQL inventory/partner/Sheets fake QA | `PASS` for executed assertions | Final run of `backend/scripts/partner-inventory-pg-qa.mjs`: `QA_RESULT=PASS ASSERTIONS=33`; disposable PostgreSQL container bound only to `127.0.0.1:51494`, DB exactly `dvb_partner_qa2`; all 10 migrations were deployed only to this isolated DB. Assertions include identical partner JSONB replay and SSE read-capability scope. |
| Booking concurrency CON-01 | `PASS` | 20 concurrent real PostgreSQL requests for last room: one accepted; remaining requests conflict |
| CON-02/03A/03B/04 | `PASS` for implemented race cases | Real PostgreSQL assertions on booking/blocked range/conflict, cancellation/confirm/expiry interactions; CON-04 also verifies the winning admin write records confirmation timestamp, actor and source |
| Search/access control/revision isolation | `PASS` for implemented cases | Partner search denied without approved membership; public search excludes draft/private values; cross-month uses same nightly store; membership revoke/room scope/grant expiry; revision idempotency/public isolation/stale conflict |
| Fake Sheets adapter | `PASS` for tested subset only | Output reads DB; isolated ranges; batch input/apply/replay/immutable payload/conflict behavior exercised. **Not Google E2E.** |
| Partner/public browser workflow | `PASS` for tested paths | Final `node scripts/partner-portal-ui-qa.mjs` run: public availability link, registration duplicate privacy, rejected password, pending isolation, dedicated create-property/create-room/profile/room/rate editor pages and return to selected property, public multi-night query, calendar week/month (at least 28 fetched days), bulk preview/apply, confirm unchanged. Loopback proxy `127.0.0.1:33000`, disposable API/UI/PG (`127.0.0.1:51494`) only. |
| Browser JavaScript/hydration/server faults | `PASS` for the isolated workflow | No page errors, hydration/chunk errors or HTTP 5xx. Two expected unauthenticated 401 probes: session check and wrong password. |
| Frontend lint/typecheck/build | `PASS` | Fresh final local `npm run lint`, `npm run typecheck`, and `npm run build`; Next build includes `/doi-tac`, `/doi-tac/chinh-sua`, `/admin/doi-tac`, and `/lich-phong`. |
| Backend build/unit tests | `PASS` | Final Nest build and backend unit suite passed 70/70; run does not substitute for the PostgreSQL integration and Google gates listed below. |
| API smoke | `PASS` for public availability read | Public GET through the isolated same-origin proxy returned HTTP 200 with the availability feature flag enabled only in the disposable test DB; this is not the broader mutating repository smoke script. |
| Prisma schema / migrations | `PASS` | Final `prisma validate` using the bundled Node 24 runtime passed; all 10 repository migrations, including both new additive migrations, applied successfully to the disposable PostgreSQL database. No project/local durable database was migrated. |
| Admin runtime audit | Previous implementation evidence; not rerun in source close | `npm run audit:admin-runtime`: 33 routes, 101 reachable sources, no pending routes, zero demo/fallback counts. |
| Public content audit | Previous implementation evidence; not rerun in source close | `npm run audit:public-content`: all 12 required metrics zero; 24 public route entries/150 reachable modules and 33 admin routes/93 reachable modules; no unresolved imports. |
| No-hardcode audit | Previous implementation evidence; findings remain | Command exited successfully, but report lists 44 findings requiring separate classification; not represented as zero findings or a fresh source-close audit. |
| Targeted actual worker/outbox restart | `PASS` (fake provider only) | `backend/scripts/partner-outbox-recovery-qa.mjs`: one restart; persisted event consumed; one inventory mutation/audit/outbox; identical admin replay unchanged. A hold-expiry job completed while the separate Sheets queue was paused. Google recovery and broader Redis-loss recovery are not covered. |
| Google sandbox end-to-end | `BLOCKED` | Owner has not supplied/authorized a sandbox workbook or credential. No live Google API call. Fake adapter is not substituted for this gate. |
| Complete section-15 requirements / full root Playwright suite | `NOT_RUN` / partial | The isolated partner/public browser workflow passed, but the broad root Playwright setup/reset/restart target was not run against this durable local environment. Several specified sync, realtime, UX and operations cases remain. |
| p95 targets | `NOT_MEASURED` | No performance benchmark executed. |
| Backup and restore | `NOT_RUN` | No project/local durable database restore performed. |
| Production Chrome / production impact | `NOT_RUN` / none | No production access/action or deployment. Source commit/push is separately authorized for this close task; actual SHA/remote equality is reported in the final result, not treated as deployment. |

## Test IDs still outstanding

Run the remaining exact checks from the attached specification before accepting the core as complete, including unexecuted `AUTH-*`, `REV-*`, `INV-*`, full `SYNC-*` with a real workbook, `LIVE-*` through each public/admin/booking/worker writer, mobile/accessibility checks, `REG-01`, Google/Redis-loss recovery, operational backup/restore, and the defined p95 targets. The targeted actual-worker restart with fake provider is now verified, not the whole recovery matrix. Dedicated partner object editor pages are implemented and the exercised profile/room/rate paths passed; broader route/mobile coverage remains open. These are open work, not inferred passes.

## Source-close review and Git boundary

Verified base: `989d6f57bc2d510351037ea6b50836bdad5beda9` on `main`. Close review fixes are limited to semantic JSONB idempotency comparison, inventory-day-before-block foreign-key ordering, readable SSE grant scope and full-month calendar fetching, with targeted QA assertions. Both migrations remain additive and preserve booking commitments; all six feature flags default off. The final result records secret scan/diff review and the actual commit/push/fetched remote SHA after gates pass. No deploy or production activation is included; Google credentials are not needed to commit this reviewed foundation.

## Release readiness

- `partnerPortal.enabled`, `inventoryCalendar.enabled`, `publicAvailability.enabled`, `sheetsSync.enabled`, `sheetsSync.importEnabled`, `unitCalendar.enabled`: default `false`.
- `UNIT_MODE=NOT_IMPLEMENTED`; no room-unit assignment calendar.
- `GOOGLE_SANDBOX_E2E=BLOCKED`; exact missing prerequisites: owner-authorized disposable workbook ID/tab/ranges plus secret-store credential for the sandbox service account.
- `WEB_TO_SHEET` / `SHEET_TO_WEB`: fake adapter semantics tested in part; live directions unverified.
- `BUSINESS_DATA_CHANGES=0` outside the explicitly disposable QA database. No new commercial prices, capacity, property, or production grant were supplied or inserted.
- Before release: complete outstanding section-15 tests, Google sandbox two-way QA and recovery, backup/restore rehearsal, p95 measurement, route/mobile UX acceptance, security review, migration review against release backup, owner go-ahead. Keep production feature flags off until those gates pass.
