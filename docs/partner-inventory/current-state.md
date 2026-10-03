# Partner portal, room inventory and Sheets — current state

## Baseline and scope

- Repository: `cuongdesignnb/dinh-van-booking`.
- Verified continuation base: `989d6f57bc2d510351037ea6b50836bdad5beda9` (`main`). This is the source baseline supplied for this continuation, not a claim about the current production SHA.
- Production was not contacted, changed, fetched, or deployed for this task. Source close on 2026-10-03 authorizes commit/push to `main` only after the final source gates; the final `DVB_PARTNER_INVENTORY_SOURCE_CLOSE_RESULT` records the actual committed SHA and fetched remote equality. This is not deployment or feature activation authority.
- The existing Toast, dedicated catalog editor pages, Media Library, RichTextEditor, stable slugs, pricing/code workflows, and hydration fixes were retained. This work adds partner/inventory/Sheets capabilities and a public availability entry point; it does not recreate those earlier features.
- The existing public catalogue, booking flow, AdminOperations, hold-expiry worker, and PostgreSQL database remain authoritative. Google Sheets is only an explicitly gated projection/command interface.

## Delta found and implemented

| Surface | Before / reusable code | Delta in this continuation | Current state |
|---|---|---|---|
| Partner identity | Existing `User`, cookie session and staff permission infrastructure | Separate organization, application, membership, status, grants and rate limiting; partner is not made staff | Core implemented; administrator still has to approve applications and explicitly grant property scopes |
| Property authority | Existing `Property`/`Supplier` catalog | Claim associates with existing property; no duplicate property is created; property/room/rate edits are versioned revisions | Core implemented; approval of the account, claim/grant, and public revision are separate actions |
| Inventory | Existing `InventoryDay`, booking reservations/holds and AdminOperations | Shared mutation service, inventory blocks/ledger, expected versions, idempotency, audit/outbox and last-confirmed actor/source for admin and partner writes; partner/admin/booking/worker paths connected | Core implemented; unit-level assignment is not implemented |
| Partner portal | Existing public/admin app shell, editor, media APIs and toast | `/doi-tac`, dedicated `/doi-tac/chinh-sua?mode=...` pages for property/room/rate changes, and `/admin/doi-tac`; week/month calendar, bulk preview/apply and confirm unchanged | Isolated browser QA passed for profile/room/rate editor navigation, return to selected property, calendar and submission paths; broader mobile QA remains open |
| Public search | Existing public stay API | `/lich-phong` queries the public multi-night API and displays freshness/status without internal room counts; `/phong-nghi` has a direct entry point and configured homepage search also links to it | Build and isolated browser result/entry-point validation passed |
| Sheets | Existing Redis/BullMQ worker and permission system | Monthly workbook, property binding, separated OUTPUT/INPUT/RESULT, frozen draft batch, poll/import/export, conflict/retry/pause | Code and fake-adapter PostgreSQL test only. Real Google E2E is blocked pending an authorized sandbox workbook and credential |

## Routes, APIs, services, tables and permissions

| UI / actor | API | Service | Principal records | Authorization |
|---|---|---|---|---|
| Partner sign-up/login and organization dashboard | `POST /api/v1/partners/registrations`; existing `/api/v1/auth/*`; `GET /api/v1/partners/context` | `PartnerService`, existing `AuthService` | `PartnerApplication`, `PartnerOrganization`, `PartnerMembership` | Registration flag, existing session rules, pending applicants receive no active organization |
| Partner inventory / property / member / notification views | `GET/POST /api/v1/partners/{properties,members,inventory,notifications,...}` | `PartnerService` | Membership, approved grant, inventory, notification | Active membership + current organization/property/room scope + grant capabilities; grant revocation is checked on requests |
| Partner profile, room and rate proposals | `POST /api/v1/partners/profile-revisions` | `PartnerService` | `PartnerProfileRevision` | Active profile grant and scoped property/room; pending revision does not alter public projection |
| Existing-property claim | `POST /api/v1/partners/property-access-claims`; admin review under `/api/v1/admin/property-access-claims` | `PartnerService` | `PropertyAccessClaim`, `PartnerPropertyGrant` | Claim is not a grant until reviewed; same canonical `Property` is retained |
| Admin review and grants | `/api/v1/admin/partner-applications`, `/partner-organizations`, `/partner-grants`, `/partner-revisions`, `/property-access-claims` | `PartnerService` | Applications, memberships, grants, claims, revisions, `AuditLog` | `partner.read`, `partner.review`, `partner.grant` |
| Partner/admin/booking inventory mutation | `/api/v1/partners/inventory/*`; existing admin inventory; booking lifecycle | `InventoryMutationService` | `InventoryDay`, blocks, changes, reservations, conflicts, `OutboxEvent` | Actor-specific write gate plus scoped room IDs and versions |
| Sheets configuration / draft / sync | `/api/v1/admin/sheets/*` | `SheetsService`, `SheetsValuesProvider` | Workbook, binding, draft batch/items, sync run, conflict | `sheets.read`, `sheets.manage`; sync flags must also permit the operation |
| Public and partner multi-night availability | `/api/v1/public/availability`, `/api/v1/partners/availability` | `PublicCatalogService`, `PartnerService` | Published catalogue + authoritative nightly `InventoryDay` | Public flag and publication/freshness rules; partner search requires approved membership and returns the public projection, not privileged grant inventory |

## Migration and flag posture

Two additive migrations were added:

1. `20261002090000_partner_inventory_sheets_core`: partner org/application/membership/claim/grant/revision/notification/rate-limit, media ownership, inventory block/ledger/conflict, outbox and Sheets schema; room inventory scope/limit and confirmation provenance. Existing held/reserved commitments are not reset. Existing blocked-count gaps are copied into `legacy_unclassified` ledger blocks; a ledger already exceeding its stored counter is reported as an integrity incident for operator review, not silently rewritten.
2. `20261003120000_partner_revision_idempotency`: revision request idempotency key/hash.

Settings are registered with safe-off defaults; migration does not activate business operations:

| Setting | Default |
|---|---:|
| `partnerPortal.enabled` | `false` |
| `inventoryCalendar.enabled` | `false` |
| `publicAvailability.enabled` | `false` |
| `sheetsSync.enabled` | `false` |
| `sheetsSync.importEnabled` | `false` |
| `unitCalendar.enabled` | `false` |

## Not established by this run

Source-close verification on 2026-10-03: frontend lint/typecheck/build, backend build and 70/70 unit tests, Prisma validation/all 10 migrations on disposable PostgreSQL, PostgreSQL QA 33/33, and isolated partner/public browser workflow passed. The calendar browser assertion now checks at least 28 fetched dates in month mode. JSONB-normalized idempotent admin/partner replay, missing-day blocked ledger creation, and SSE read-capability scope were checked during close review. An actual compiled worker restart consumed a persisted inventory outbox event with one mutation/audit/outbox only; the hold-expiry queue completed a job while the Sheets queue was paused. This recovery used the fake adapter only, not Google.

- No Google workbook or credential was supplied/authorized; no Google API call or real two-way synchronization occurred.
- No production account/property, property grant, room inventory, business price, published profile, or live invitation was changed by QA.
- Full requirement-suite, production Chrome QA, full backup/restore, performance targets, and every mobile/accessibility breakpoint have not been accepted.
- The full legacy Playwright suite was intentionally not run because its shared project setup/reset/restart behavior is not confirmed safe for this durable local environment. The isolated partner/public browser workflow was run instead.
