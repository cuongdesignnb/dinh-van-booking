# Admin legacy findings — 2026-09-27

> **Lưu ý cập nhật:** các kết luận “pending” trong snapshot này thuộc lần audit trước khi hoàn thiện module vận hành. Những file fixture được liệt kê vẫn tồn tại nhưng nằm ngoài import graph hoạt động. Trạng thái mới được đo bằng `npm run audit:admin-runtime`; xem [ma trận chi tiết](./full-completion-matrix.md). Không dùng bảng pending cũ để suy ra route đang chạy.

Audit scope: active route import graph under `src/app/admin/**`, source findings from `npm run audit:no-hardcode`, and `localStorage` use. `Reachable?` means reachable from a current `/admin` route, not merely importable by a legacy file. No source was deleted during this audit.

## Result

- Current `/admin` pages import API-backed screens or `PendingModule`. `src/app/admin/layout.tsx` mounts `AdminAuthGate` and `AdminShell`, not `AdminStoreProvider`; the shell no longer reads local role/toast state.
- The 16 `legacy-admin-review` findings below are source-level blockers only if those dead screens are reconnected. They are not 16 live admin routes. Keep these modules isolated until their own API/workflow replaces fixtures.
- The scanner also reports 21 type-only imports (erased by TypeScript) and six guest-favorite local-storage reads/writes. These are itemized below and are not business-data fallbacks.
- Local-storage business-data findings: **0**. `src/lib/favorites.ts` stores only guest preference IDs; server-side content, price, property, user, inquiry, and settings state is API/PostgreSQL backed.

## Scanner findings — type-only imports (21)

| File | Line | Category | Reachable? | Action | Result |
|---|---:|---|---|---|---|
| `src/app/phong-nghi/[slug]/page.tsx` | 37 | Fixture type import | Yes, public route; import type only | Keep `import type`; do not convert to runtime import | Erased at build; no fixture runtime fallback |
| `src/components/booking/Checkout.tsx` | 27 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/combos/ComboExplorer.tsx` | 36 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; API supplies records |
| `src/components/destinations/DestinationExplorer.tsx` | 35 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; API supplies records |
| `src/components/destinations/DiscoveryLower.tsx` | 10 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/home/DestinationGrid.tsx` | 5 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; API supplies records |
| `src/components/home/FeaturedStays.tsx` | 4 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; API supplies records |
| `src/components/home/StayCard.tsx` | 5 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/stay-detail/BookingContext.tsx` | 5 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/stays/ListingCard.tsx` | 6 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/stays/StayMap.tsx` | 8 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/components/stays/StaysExplorer.tsx` | 9 | Fixture type import | Yes, public UI; import type only | Keep type-only | Erased at build; API supplies records |
| `src/lib/api/public.ts` | 2 | Fixture type import | Yes, public API adapter; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/lib/api/public.ts` | 3 | Fixture type import | Yes, public API adapter; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/lib/api/public.ts` | 5 | Fixture type import | Yes, public API adapter; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/lib/catalog/constants.ts` | 1 | Fixture type import | Yes, public API adapter; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/lib/catalog/constants.ts` | 3 | Fixture type import | Yes, public API adapter; import type only | Keep type-only | Erased at build; no fixture runtime fallback |
| `src/lib/catalog/pricing.ts` | 1 | Fixture type import | Yes, public pricing; import type only | Keep type-only | Erased at build; no commercial fixture values |
| `src/lib/seo/schema.ts` | 3 | Fixture type import | Yes, public SEO; import type only | Keep type-only | Erased at build; schema reads published API projections |
| `src/lib/seo/schema.ts` | 4 | Fixture type import | Yes, public SEO; import type only | Keep type-only | Erased at build; schema reads published API projections |
| `src/lib/stay-filters.ts` | 5 | Fixture type import | Yes, public filter utility; import type only | Keep type-only | Erased at build; no fixture runtime fallback |

## Scanner findings — guest preference storage (6)

| File | Line(s) | Category | Reachable? | Action | Result |
|---|---|---|---|---|---|
| `src/lib/favorites.ts` | 4, 29, 31, 34, 35, 78 | `browser-admin-store` rule match; guest favorite IDs only | Yes, guest/public UI; not admin business state | Keep guest preference behavior; do not use it for bookings, customers, inventory, or staff sessions | Allowed by policy; these six matches explain the scanner count |

## Scanner findings — legacy admin fixtures (16)

| File | Line | Category | Reachable? | Action | Result |
|---|---:|---|---|---|---|
| `src/components/admin/bookings/BookingDetail.tsx` | 7 | Fixture import | No; old booking screen only | Leave isolated; replace with authorized booking API before connecting | Legacy finding retained; current route is pending |
| `src/components/admin/bookings/BookingForm.tsx` | 4 | Fixture import | No; old booking screen only | Leave isolated; implement booking workflow separately | Legacy finding retained; current route is pending |
| `src/components/admin/bookings/BookingsScreen.tsx` | 7 | Fixture import | No; old booking screen only | Leave isolated; implement booking workflow separately | Legacy finding retained; current route is pending |
| `src/components/admin/combos/CombosScreen.tsx` | 24 | Fixture import | No; superseded by `AdminContentList` route | Keep old screen disconnected; remove after import-graph review | Current combo route uses CMS API |
| `src/components/admin/content/DestinationEditor.tsx` | 6 | Fixture import | No; superseded by `AdminContentList` route | Keep old editor disconnected; remove after import-graph review | Current destination route uses CMS API |
| `src/components/admin/crm/CrmScreen.tsx` | 17 | Fixture import | No; old CRM screen only | Keep disconnected; customer workflow remains pending | No fake CRM displayed by route |
| `src/components/admin/crm/CustomerPanel.tsx` | 7 | Fixture import | No; old CRM screen only | Keep disconnected; customer workflow remains pending | No fake customer panel displayed |
| `src/components/admin/overview/OverviewScreen.tsx` | 22 | Fixture import | No; superseded by pending overview route | Keep disconnected until real reporting API exists | No demo KPI displayed by route |
| `src/components/admin/properties/PropertiesScreen.tsx` | 24 | Fixture import | No; superseded by `PropertyCatalogScreen` | Keep old screen disconnected; remove after import-graph review | Current stay route uses properties API |
| `src/components/admin/properties/RatePanels.tsx` | 6 | Fixture import | No; only referenced by legacy property modules | Keep disconnected; inventory/rate editor remains incomplete | No fixture rates reach the active route |
| `src/components/admin/shared/charts.tsx` | 5 | Fixture import | No; only legacy dashboard consumer | Keep disconnected until reporting API exists | No fixture chart reaches the active route |
| `src/lib/admin/data.ts` | 6 | Fixture import | No; legacy store/screens only | Keep isolated; do not add a route import | No live route reads this fixture data |
| `src/lib/admin/data.ts` | 18 | Fixture import | No; legacy store/screens only | Keep isolated; do not add a route import | No live route reads this fixture data |
| `src/lib/admin/data.ts` | 33 | Demo runtime branch | No; legacy compatibility layer only | Keep isolated; remove with the obsolete data module in a reviewed cleanup | Not a current fallback path |
| `src/lib/admin/formatters.ts` | 1 | Fixture import | No; legacy admin consumers only | Keep isolated; remove with obsolete consumer graph | Not imported by current routes |
| `src/lib/admin/selectors.ts` | 5 | Fixture import | No; legacy admin consumers only | Keep isolated; remove with obsolete consumer graph | Not imported by current routes |

## Compatibility store and remaining risks

| File | Line | Category | Reachable? | Action | Result |
|---|---:|---|---|---|---|
| `src/components/admin/AdminStore.tsx` | 57, 116 | Legacy compatibility provider/hook | No; active layout no longer mounts provider | Leave for old source consumers until dedicated cleanup; do not restore it to layout | Owner role/toast state no longer feeds active route; `commit()` does not fake API success |
| `src/app/admin/layout.tsx` | 2–3 | Authenticated route shell | Yes | Keep `AdminAuthGate` + `AdminShell`; no provider | Session and role come from the API |
| `src/components/admin/shell/AdminShell.tsx` | 1 | Authenticated shell | Yes | Keep local menu UI state only | No compatibility store/toast dependency |

- `npm run audit:no-hardcode` completed with 43 findings: 21 type-only, 6 allowed guest preferences, 16 isolated legacy findings. Full machine report: `docs/data-audit/no-hardcode-report.json`.
- Pending routes: dashboard/reports, admin bookings, customers, promotions, and payment operations. Their placeholder state is intentional and honest.
- The stay editor creates and deletes a test/local property transactionally, but does not yet manage existing room/inventory/rate schedules. Do not market draft Cúc Phương imports as live inventory.
- Local DB currently has 11 draft/unverified properties and no room units/rate plans; no public stay records. Search indexing remains closed.
