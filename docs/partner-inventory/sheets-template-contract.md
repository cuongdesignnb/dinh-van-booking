# Google Sheets workbook and cell contract

## Authorization and lifecycle

Use one explicitly authorized sandbox spreadsheet per business month and a separate tab per property. The whole-business consolidated view is internal only. This repository/run does not have a supplied workbook, tab or service-account credential; live Google E2E is therefore `BLOCKED`, not a fake-adapter pass. Never use production sheets during QA.

An administrator with `sheets.manage` registers the exact spreadsheet ID, reporting period, timezone and a property binding. Binding records the organization/property relationship and three disjoint A1 regions. Ranges must be large enough for their headers and rows: OUTPUT 12 columns, INPUT 16 columns, RESULT 9 columns. Adapter does not create/share files or infer permissions from a tab title, color, cell owner, email or formula.

## OUTPUT (database → Sheet, 12 columns)

Header order:

`roomTypeId`, `roomTypeCode`, `roomTypeName`, `stayDate`, `capacity`, `blockedCount`, `heldCount`, `reservedCount`, `availableRaw`, `stopSell`, `lastConfirmedAt`, `version`.

This is a read-only application-owned projection of the authoritative PostgreSQL inventory for the bound organization’s authorized room scope and workbook period. It does not update PostgreSQL. `availableRaw` is calculated by the application. No profile, photo, rate-plan, policy, booking guest data or customer PII is synchronized in either direction.

## INPUT (draft command, 16 columns)

Header order:

`batchId`, `draftItemId`, `roomTypeId`, `stayDate`, `baseVersion`, `baselineExternalSoldCount`, `baselineMaintenanceCount`, `baselineOwnerWithheldCount`, `baselineStopSell`, `newExternalSoldCount`, `newMaintenanceCount`, `newOwnerWithheldCount`, `newStopSell`, `operation`, `reason`, `submit`.

PostgreSQL creates and stores an immutable draft batch/baseline before projecting these rows. The identity, baseline fields and version are server-generated and must match exactly on submission. Blank `new*` is no change; entering numeric `0` explicitly sets the allowed value to zero. `operation=SET` applies the complete submitted batch atomically; `operation=CONFIRM_UNCHANGED` may not contain changed values and only confirms the range. Every applicable row must contain the exact submit command `GỬI`; the server accepts it only once. There is no Sheet input for held or reserved commitments, capacity, a property claim/grant or a public profile.

Formula strings are rejected. Input rows are interpreted as commands only when they match a server-created batch and active binding/grant, not because the user typed a room ID or email. The saved `payloadHash` prevents edits/replays from changing a submitted batch; create a new draft to make a new proposal.

## RESULT (application → Sheet, 9 columns)

Header order:

`batchId`, `draftItemId`, `roomTypeId`, `stayDate`, `status`, `message`, `acceptedVersion`, `acceptedAt`, `conflictId`.

Result records accepted/applied, invalid, stale/conflict and replayed submissions. Conflict preserves the original baseline, current PostgreSQL value/version and proposed value in the database; the operator resolves it deliberately and submits a new batch. If a database import committed but Google result write failed, PostgreSQL remains the source of truth and the worker retries the RESULT projection. The status must be represented as pending projection until the Sheet confirms; an export timestamp is not a property’s confirmation of unchanged inventory.

## Scheduling, pause and retry

The worker polls imports on a separate Sheets queue and exports pending inventory outbox events. Import and export pause controls are independent. Google network I/O occurs outside PostgreSQL transaction boundaries. A provider exception cannot stall the existing booking-hold-expiry queue. Recovery uses the persisted batch/result/outbox status and retry endpoints; it never resets booking commitments, silently advances a base version, or overwrites a changed projection with stale data.

Final source-close check (2026-10-03): `backend/scripts/partner-outbox-recovery-qa.mjs` starts the real compiled worker against disposable PostgreSQL/Redis with the fake adapter, retains one pending database event while the Sheets queue is paused, restarts that worker, then verifies the event is processed and the mutation is not duplicated. A hold-expiry job completes on its separate queue during the pause. `OUTBOX_WORKER_RESTART_RECOVERY=PASS`; `GOOGLE_RECOVERY=NOT_RUN`. This does not accept real Google two-way sync or provider-loss recovery.

## Sandbox checklist (still outstanding)

1. Owner supplies and authorizes exactly one disposable Google spreadsheet and property tab for a declared month.
2. Owner supplies a least-privilege service account credential through the host secret store; do not put its JSON in files, shell history or report.
3. Verify the ranges are disjoint and have sufficient row/column capacity; bind to an existing property and an approved grant.
4. With `sheetsSync.enabled` off and import off, verify no provider call occurs. Enable only sandbox flags, test one web→Sheet output projection, then a frozen Sheet batch→web input, blank versus zero, unchanged confirmation, replay, conflict, retry, and independent pause/recovery.
5. Revoke sandbox access/credential and restore test baseline. Do not enable production integration as part of this task.
