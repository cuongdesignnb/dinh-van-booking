# Architecture and invariants

## System of record

PostgreSQL is the sole decision source for properties, published content, grants, room-night inventory, holds and reservations. A Sheet is never read back by the public website as an alternate source of availability. `InventoryDay(roomTypeId, stayDate)` is the single nightly availability row; week and month are calendar projections over the same rows.

The system retains the existing property and supplier records. A partner request to manage an existing listing is a `PropertyAccessClaim`, not a second property. A partner organization becoming active does not grant access automatically. An approved claim/grant, its expiry/revocation and its property/room scope are checked separately from account review. Profile/room/rate proposals are immutable versioned revisions until an authorized administrator approves them; draft projection is not public projection.

## Inventory write path

`InventoryMutationService` is the shared writer used by partner operations, admin range changes, booking hold/confirm/cancel/expiry and Sheets imports. Mutations lock rows in stable `(roomTypeId, stayDate)` order, require the caller’s expected version and idempotency key, update the ledger/snapshot in the same database transaction, and create audit/outbox evidence transactionally. Successful admin range edits also record the authenticated admin, timestamp and `admin` confirmation source; administrators can re-enter the verified current range to attest it after migration without using a Sheet-export time as confirmation. Bulk mutations validate all rows before commit; conflict returns the frozen base, current and proposed values and does not automatically fetch a new version and overwrite.

For each business night, `[checkIn, checkOut)` applies. The row keeps the booking-owned `heldCount` and `reservedCount`; partner/Sheet inputs can only express externally sold, maintenance, owner-withheld and stop-sell according to scope. Availability is computed from capacity minus blocked/held/reserved commitments, with stop-sell independently preventing sale. Missing inventory remains missing (no implicit row creation); zero is a real value. `external_sold` is recorded only in the grant-owning organization’s block ledger. It is not subtracted twice from an unrelated allotment. The integrity constraint detects over-allocation rather than “fixing” counters by erasing holds/bookings.

Booking hold expiry stays on the existing `dvb-admin-operations` queue. Sheets import/export and partner freshness reminders use a separate `dvb-sheets-sync` queue so provider failures cannot stall expiry. Inventory writes emit versioned outbox events; a Sheet write failure leaves PostgreSQL committed and reports pending projection, not a false “Sheet accepted” state.

## Exposure and freshness

Public catalogue visibility requires the existing publication rules plus `publicAvailability.enabled`. Availability is checked for every requested night and uses the latest confirmation timestamp and configured near-term/far-term freshness thresholds. Missing, sold-out, stale, needs-check and available states are distinct. The public API omits organization and guest-private fields and never returns internal room counts. A result is an availability indication, not a booking or guaranteed offer.

Partner search requires an active approved partner context and returns the public catalogue projection; privileged inventory reads require scoped read grants. SSE inventory events require `canReadInventory` and are scoped to the organization/user, with membership and grant scope re-checked; polling remains the fallback. The final PostgreSQL QA verifies that an active grant without read capability receives no inventory event.

## Sheets boundary

`SheetsService` orchestrates a `SheetsValuesProvider` adapter. `DVB_SHEETS_ADAPTER=fake` is test-only; production adapter authenticates using `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` supplied to the runtime secret store. No service account JSON is written into the repository. The current environment had neither authorized sandbox workbook nor credential, so live reads/writes were not attempted.

Monthly workbook periods and property bindings declare disjoint output, input and result ranges. Output exports database inventory only. Input commands refer to a server-created immutable batch and baseline/version; blank means no change, numeric zero is a real set-to-zero, and `GỬI` submits the entire batch once. `CONFIRM_UNCHANGED` refreshes confirmation provenance without changing inventory quantities. Replays restore the saved result; modified submitted payloads are rejected. Conflicts preserve baseline/current/proposed values. Import/export can be paused independently, and a scheduled worker retries/reprojects without holding a database transaction open during Google I/O.

## Flags / operational gates

All new features remain opt-in and default to `false`: `partnerPortal.enabled`, `inventoryCalendar.enabled`, `publicAvailability.enabled`, `sheetsSync.enabled`, `sheetsSync.importEnabled`, and `unitCalendar.enabled`. The unit calendar stays disabled; `RoomUnit` is not an implemented room-assignment calendar. A real Google workbook, identity verification policy, grants, public profile approval, freshness configuration, backup/restore runbook, and owner release approval are prerequisites to live use.

## Source-close verification boundary (2026-10-03)

Actual compiled worker restart recovery passed on disposable PostgreSQL/Redis: a persisted pending event was consumed after restarting the task-owned worker; inventory mutation, audit and outbox counts remained one. The existing hold-expiry queue completed a job independently while the Sheets queue was paused. This proves the exercised fake-provider restart path, not Google-provider or Redis-loss recovery. Identical JSONB-backed requests now compare semantically for admin/partner replay, and missing-day creation precedes ledger foreign-key insertion in the same locked transaction. No commitment reset or second inventory store was introduced.
