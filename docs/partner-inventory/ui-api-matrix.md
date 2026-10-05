# UI → API → service → data → permission matrix

## Room matrix / public badge delta (2026-10-05)

| UI | Action / API (prefix `/api/v1`) | Service / authority |
|---|---|---|
| `/admin/ton-phong` | System-wide selector `GET /admin/inventory/properties`; nightly rows `GET /admin/inventory/matrix?propertyId&from&to` (end exclusive) | AdminOperationsService; `inventory.read`, all non-demo properties, no partner grant |
| Shared admin/partner matrix | Short cell dialog showing actual property, RoomType name/code, date and captured version; main input is available, counters/provenance are read-only | Admin `POST /admin/inventory/available`, Partner existing `POST /partners/inventory/available`; same InventoryMutationService; admin `inventory.write` versus active scoped partner grant |
| Admin missing cell | Explicit verified capacity confirmation; existing `PUT /admin/inventory/:roomTypeId` with `[from,to)` and expected version zero | No guessed capacity; Partner missing dialog requests Admin, cannot create inventory |
| Admin date-range editor | One room category, inclusive last-night UI; `POST /admin/inventory/available/preview`, then `/bulk` with same captured versions | Preview makes no writes; apply is atomic and idempotent; 409 leaves the draft intact |
| `/`, `/phong-nghi` grid/list | Shared bottom-left image badge; `GET /public/stays?checkIn&checkOut` for server rendering, `/public/stay-availability?checkIn&checkOut` as one client date-range batch | PublicCatalogService; shared freshness/aggregation; only status/asOf, no counts/ledger/version; `Cache-Control: private, no-store`, server fetch no-store |

Both calendars use one component. Mobile is seven days with deliberate calendar scrolling, not a 31-column shrunken page. Public dates default to Vietnam today/tomorrow; missing/stale/integrity means **Đang cập nhật**. Availability feature OFF also yields unknown, not an active availability promise. Badge is separate from content/favorite badges and respects reduced motion. Targeted local browser/API acceptance passed at 1440, 1024 and 390px; this does not replace the broader historical acceptance gaps below.

All API paths below are prefixed by `/api/v1`. Authentication uses the existing cookie/session infrastructure. Partner identities are not staff roles.

| UI | User action | API | Service / persistence | Gate and behavior |
|---|---|---|---|---|
| `/doi-tac` sign-in | Sign in with existing account | Existing `/auth/login`, `/auth/me` | Existing `AuthService`; `User` session | Active organization is resolved separately; staff permissions are not inferred from `userId` |
| `/doi-tac` registration | Submit organization and contact | `POST /partners/registrations` | `PartnerService`; application/org + partner rate limit | Generic accepted response avoids exposing existing email; registration does not grant property rights |
| `/doi-tac` dashboard | Select active organization/property | `GET /partners/context`, `/partners/properties` | `PartnerService`; membership and grants | Only active memberships and active, unexpired grants are returned |
| `/doi-tac` team | Invite/add or change membership | `GET/POST /partners/members`, `PATCH /partners/members/:userId` | `PartnerService`; membership | Owner/organization rules, no staff role escalation |
| `/doi-tac` property management | Open a dedicated editor page to create a draft property/room or propose profile/room/rate changes | `POST /partners/properties`, `/properties/:id/room-types`, `POST /partners/profile-revisions` | `PartnerService`; property draft or revision | Expected published revision/version; pending data is private; approval is distinct from organization verification; editor route rechecks current property/grant scope |
| `/doi-tac` existing property claim | Find eligible property and request management | `GET /partners/property-access-claims/candidates`, `POST /partners/property-access-claims` | `PartnerService`; claim | Does not clone property; administrator must review then issue/activate grant |
| `/doi-tac` media | Upload/list organization-owned media | `GET /partners/media`, `POST /partners/media/upload` | Partner media authorization + existing media service | Ownership and upload capability checked; processed image remains private until appropriate approval |
| `/doi-tac` calendar | View 7-day or month (max 31 days), navigate, bulk preview, apply, confirm unchanged | `GET /partners/inventory`, `POST /partners/inventory/bulk/preview`, `POST /partners/inventory/available`, `POST /partners/inventory/confirm` | `InventoryMutationService`, inventory ledger | Read/write grant and room scope; previews show before/proposed; expected versions; all-or-nothing; no `heldCount`/`reservedCount` input |
| `/doi-tac` availability | Search public properties for multiple nights | `GET /partners/availability` | `PartnerService` + public catalogue | Requires approved partner context; displays only published catalogue and freshness-aware result |
| `/doi-tac` notifications | Read and mark as read | `GET /partners/notifications`, `PATCH /partners/notifications/:id/read` | `PartnerService`; notification | User/organization scope; SSE event stream/poll fallback is scoped and revocation-aware |
| `/admin/doi-tac` applications/org | Approve, request more information, reject or block; manage members | `GET /admin/partner-applications`, `/admin/partner-organizations`; `POST /admin/partner-applications/:id/review`; `PATCH /admin/partner-organizations/:id` | `PartnerService`; status/application/membership + audit | `partner.read`, `partner.review`; org approval alone does not create property grant |
| `/admin/doi-tac` claim/grant | Review claim and issue/revoke scoped grant | `/admin/property-access-claims`, `POST /admin/property-access-claims/:id/review`, `GET/PATCH /admin/partner-grants` | `PartnerService`; claim/grant | `partner.review` / `partner.grant`; property/room scope and capabilities explicit |
| `/admin/doi-tac` revisions | Approve/reject revision | `GET /admin/partner-revisions`, `POST /admin/partner-revisions/:id/review` | `PartnerService`; revision and existing catalog/property tables | `partner.review` / existing catalog publish rules; pending revision is not public |
| `/admin/doi-tac` workbooks | Register monthly file/tab/ranges, binding, preview batch, retry projection, sync, pause/resume | `/admin/sheets/workbooks`, `/workbooks/:id/bindings`, `/bindings/:id/draft-batches`, `/draft-batches/:id/retry-projection`, `/workbooks/:id/sync`, `/workbooks/:id/pause/:direction` | `SheetsService` + `SheetsValuesProvider` | `sheets.read`, `sheets.manage`; global/import flags; requires explicitly authorized workbook before real provider |
| Public `/lich-phong` | Search availability from the stay-listing entry point, a configured homepage search, or standalone page | `GET /public/availability` | `PublicCatalogService` + PostgreSQL nightly inventory | Public availability flag, public publication and freshness; omits internal counts and does not book |

## UI quality and remaining interaction gaps

- Admin review is grouped into human-oriented tabs rather than exposing database JSON. Toast and existing editor/media components are reused.
- Calendar can switch week/month, navigate, preview a scoped batch and confirm unchanged. Month is capped at 31 nights; mobile calendar/list behavior is responsive but not yet accepted at every real device breakpoint.
- Partner create/profile/room/rate forms use `/doi-tac/chinh-sua` with explicit mode and object IDs; the isolated browser test verifies profile, room and rate navigation plus return to the selected property. Inventory day edits remain a short dialog; bulk changes remain preview-first. Mobile breakpoints still need broader acceptance.
- No UI action automatically publishes catalog changes, changes production flags, shares a workbook, or sends bulk invitations.

## Final source-close evidence (2026-10-03)

The isolated browser workflow passed on the final production build, including full-month fetching (at least 28 day rows, rather than the previous seven-day response), week/month navigation, bulk preview/apply, confirm unchanged, and dedicated profile/room/rate editor returns. PostgreSQL QA also checks readable SSE scope and suppresses events for `canReadInventory=false`. No page/hydration/chunk/5xx failures occurred; two expected 401s were the anonymous session probe and deliberate wrong-password login. Broader mobile/accessibility and full root Playwright acceptance remain unexecuted.
