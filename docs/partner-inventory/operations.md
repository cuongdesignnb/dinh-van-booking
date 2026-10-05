# Operations, feature flags and recovery

## Deployment preparation (not performed)

This is a source-close handoff only. Commit/push of the reviewed source to `main` is authorized by `DVB_CLOSE_PARTNER_INVENTORY_SOURCE_AND_PUSH` after source gates pass; the final result carries the actual commit and remote SHA. Production, its catalog and imported Cúc Phương data were not contacted. Do not run migration, enable flags or start a production worker until an independently approved release window and verified backup exist.

Review additive migrations under `backend/prisma/migrations/20261002090000_partner_inventory_sheets_core` and `20261003120000_partner_revision_idempotency`. Validate against the intended release database using the repository’s Prisma migration procedure. Do not run `down -v`, reset, seed production or manually alter commitment counters. The first migration adds structures/columns and audit/ledger support; it does not delete current business records or zero held/reserved values.

Build/release the current API and frontend together. Existing `dvb-admin-operations` hold expiry remains separate from `dvb-sheets-sync`. Confirm Redis/BullMQ connectivity and monitor both workers independently before enabling partner/Shares behavior. Worker schedules currently include hold expiry (15 s), inventory outbox export (15 s), Sheets import polling (60 s), and stale partner inventory reminders (hourly).

## Enablement order

All new feature settings default off:

1. Review policies, role ownership, support contact and applicable property data/privacy requirements.
2. Enable `partnerPortal.enabled` for controlled registration/login.
3. Verify partner identity/application through admin. Activate an organization only after its verification procedure; this does not create property access.
4. Review an existing-property claim, then separately create/review a grant with exact capabilities, expiry and room scope. Never duplicate the property.
5. Review and publish each property/room/rate revision separately. Preserve pending revision isolation.
6. Before exposing inventory, have an authorized admin or owner verify each active room/date range. The admin range mutation records who and when confirmed it; if only confirming the current values, re-enter those exact values with current versions (do not use workbook export time as confirmation). Set `inventoryCalendar.enabled` only after approved grant, owner pool and inventory opening procedure are verified. Keep `unitCalendar.enabled=false`.
7. Enable `publicAvailability.enabled` only after published catalogue, confirmed inventory and freshness thresholds have been operationally accepted.
8. Keep `sheetsSync.enabled=false` and `sheetsSync.importEnabled=false` until Google sandbox E2E passes with authorized credentials/file. Production Sheets is out of this handoff.

Changes to flags are administrator actions and should be captured in existing audit records. No flag was enabled on a durable project database by QA; disposable fixture flags were confined to the isolated test DB and are discarded with that environment.

## Failure and recovery

- Conflict/version mismatch: preserve draft and present base/current/proposed; ask the actor to review and submit a new command. Never auto-refresh the expected version and retry an overwrite.
- Inventory invariant/over-allocation: stop the write and investigate source ledger/booking commitments; do not erase holds/reservations or force a “corrected” count.
- Google provider error: show PostgreSQL committed/Sheet pending distinctly, leave immutable batch/outbox state, retry projection after checking authorized range and access. Do not hold database transaction during Google calls.
- Import paused, export paused and global flag are separate. Confirm the intended direction before resume.
- Outbox/worker interruption: inspect pending event and `SheetSyncRun`, restore Redis/worker connection and retry idempotently. Booking hold expiry must be verified on its own queue.
- Grant/membership revoked: requests and streams should lose scope immediately; do not leave long-lived browser data treated as authorization.
- Backup/restore was not executed in this task. Before release, create and verify a tested backup/recovery procedure for PostgreSQL, media and application secrets separately. No actual recovery time/objective has been measured here.

## Secrets and environment

Potential runtime secret: `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`, provisioned only in approved secret storage, least-privilege and sandbox-scoped. It was absent/not used in QA. Do not add secret values to `.env`, source control, localStorage, screenshots or report. `DVB_SHEETS_ADAPTER=fake` is test-only and is not proof of Google connectivity.

No new environment secret was needed for code compilation. For local isolated QA only, scripts guard the exact disposable DB `dvb_partner_qa2`; credentials and generated users are temporary. `unitCalendar.enabled` remains false and no property-level room assignment is implied by `RoomUnit` records.

## Verified targeted restart recovery (2026-10-03)

`backend/scripts/partner-outbox-recovery-qa.mjs` requires loopback `dvb_partner_qa2` and explicit `DVB_QA_DISPOSABLE_REDIS=1`; never point it at shared/project Redis. It uses temporary generated credentials and `DVB_SHEETS_ADAPTER=fake`, launches the compiled real worker, stops only its own child, restarts it, and restores the disposable test flag in `finally`. The pending PostgreSQL event was processed after restart with one inventory change, one audit and one outbox event, and unchanged quantities/version on replay. A hold-expiry job completed on `dvb-admin-operations` while `dvb-sheets-sync` was paused. Result: `OUTBOX_WORKER_RESTART_RECOVERY=PASS` (fake adapter only). Google recovery, broader Redis outage and backup/restore remain unverified. QA processes/containers are task-owned and removed after source verification; no durable feature flags are enabled.

## Room matrix operation delta — 2026-10-05

- Admin: open `/admin/ton-phong`, select a real property, week/month and actual RoomType row. Click the exact night to set **Số phòng còn bán**, or mark sold out (zero). Admin needs inventory write permission but not a partner organization/grant. Inactive/unverified categories explain their disabled state.
- **Chưa mở** is missing InventoryDay, not zero. Admin may explicitly confirm verified capacity through the existing opening command. Partner can only ask Admin to open it. Do not infer capacity, fake rows, or reset booking counters.
- Bulk: select one category and nights visible in the loaded calendar, enter available and preview. Review every proposed night then confirm the entire batch. A version conflict rolls back all days and retains the draft. Review current data and start a new explicit command; do not silently retry with new versions.
- Quick-set adjusts only its permitted withholding ledger: partner-owned owner_withheld, or admin_calendar for Admin. Other organizations' blocks, maintenance/external-sales locks and held/reserved commitments are protected. Increasing available beyond that safe pool returns a conflict; investigate the original ledger source, never delete commitments to make the count fit.
- Public badge aggregates active/verified room categories over the customer's nights (default Vietnam today/tomorrow). Còn phòng needs one whole-stay available category; Hết phòng needs all eligible categories known/fresh and sold out. Missing/stale/integrity is Đang cập nhật. `publicAvailability.enabled=false` returns unknown; this task does not enable any durable flag.
- Admin/Partner save commits PostgreSQL first. Reload a different public session to verify changed badge without build/restart. Listing date changes fetch one batch, not a request per card. Existing outbox consumers, Sheets and hold-expiry jobs are unchanged; no Google dependency is added.
- QA helper `backend/scripts/inventory-matrix-qa.mjs` refuses databases other than loopback:51534 / `dvb_inventory_matrix_qa` and requires an empty fixture scope and an ephemeral `DVB_MATRIX_QA_PASSWORD`. Run only against a disposable migrated/role-seeded database and local API/frontend bridge at 33100/33101/33102; never production/shared data. Test media is generated locally, fixtures have QA provenance and cleanup is verified. No credentials, cookies or screenshots are source-controlled. Local targeted QA is not Google E2E or production acceptance.
