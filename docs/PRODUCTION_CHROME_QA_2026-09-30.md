# DVB — Production Chrome QA after business import

**Task:** `DVB_PRODUCTION_CHROME_QA_AFTER_IMPORT_2026_09_30`
**QA result:** `FAIL — acceptance is not signed off`
**Checked:** 2026-09-30 (Asia/Saigon)
**Target:** [https://cucphuongtravel.com/](https://cucphuongtravel.com/)
**Production SHA in handoff:** `4e49bb14af148714ca00f45db3cd3e35bfaafd68` — Chrome UI does not expose a build SHA, so this was not independently verified.

## Scope and method

Read-only production QA in Chrome: navigated public/admin routes, read visible page content and form state, checked responsive viewport dimensions, image load state and Chrome console logs. No form was saved or submitted; no content, booking, price, inventory, media or account data was changed. No deploy, restart, migration, import, API-only check, source inspection, commit or push was performed.

The requested public/customer session could not be isolated: a new Chrome tab shared the existing Owner login. The public routes below were visually inspected, but they must not be treated as unauthenticated-session isolation evidence. The available Chrome control did not expose DevTools Network, so individual response status codes and 5xx responses remain unverified. These are acceptance blockers, not inferred passes.

## Results

| Check | Result | Evidence |
|---|---|---|
| Admin stay records | **PASS** — 12 shown: 11 imported drafts and the existing published Forest Home | Admin stay list, screenshot 07 |
| Imported record state | **PASS** — all 11 imported records display `Bản nháp · Chờ xác minh`; edit forms show `Không lập chỉ mục` checked for all 11 | Read-only edit-form inspection of each imported record |
| Room types | **PASS** — 6 total: 5 under Mineral Retreat and 1 under Forest Home | Admin room-type list, screenshot 09 |
| Mineral Retreat rooms | **PASS** — Executive Villa, Premium Villa, Family Villa, Family Suite Bungalow, Deluxe Bungalow; all are inactive, have no room/unit quantity and no rate, and capacity is pending verification | Room list and read-only edit form, screenshots 09 and 12 |
| Forest Home public inventory | **PASS** — one published room type, `Phòng tiêu chuẩn`, 650,000đ/night, maximum 3 guests | Public detail and admin list, screenshots 05–06 and 09 |
| Public catalogue exposure | **PASS WITH LIMITATION** — `/phong-nghi` shows one stay (Forest Home), not the 11 drafts; separate anonymous-session isolation is not verified | Screenshots 03–04; shared Owner session limitation above |
| Old stay slug | **PASS** — `/phong-nghi/nha-san-forest-home` navigates to `/phong-nghi/nha-san-forest-home-2` | Chrome address/location after navigation |
| Empty public catalogues | **PASS** — combo, destination, article and special-page routes show explicit empty states and no demo cards | Screenshots 13–15; routes `/combo-du-lich`, `/diem-den`, `/bai-viet`, `/chuyen-trang` |
| Contact and booking pages | **PASS** — contact form is present; booking page asks the visitor to choose a stay and does not invent a selection | Route inspection and screenshot 16 |
| Media Library | **PASS WITH FINDING** — 8 items; all inspected thumbnails loaded and the library reports WebP storage. One asset is labelled and alt-tagged `undefined.jpg` despite being served as WebP | Screenshot 17 and read-only image metadata |
| Responsive overflow | **PASS** — at 390×844, measured document width was 375px; at 1440×900 it was 1425px. No horizontal overflow was seen on checked pages; visible images loaded | Screenshots 01–16 and Chrome page measurements |
| Admin inquiry queue | **PASS** — explicit empty state, “Chưa có yêu cầu tư vấn.” | Read-only `/admin/yeu-cau-tu-van` page inspection |
| Console | **FAIL** — 4 captured React minified error `#418` entries; no warnings in the captured console logs | Chrome console logs during route QA |
| Network status | **NOT VERIFIED** — Network panel/status-code inspection was unavailable through the permitted browser control | Acceptance blocker |
| Anonymous/public session | **NOT VERIFIED** — all Chrome tabs shared the Owner session; no cookies were cleared and no one was logged out | Acceptance blocker |
| Protect in-use media from deletion | **NOT VERIFIED / RISK** — the selected `undefined.jpg` asset is also used on the public Forest Home detail; the `Xoá ảnh` button appears enabled. It was deliberately not clicked because deletion would mutate production data | Screenshot 17 and observed public image URL |

## Findings requiring follow-up

1. **React hydration errors:** Chrome recorded four React error `#418` entries during route navigation. Identify the affected route(s) and fix/verify the hydration mismatch in a subsequent engineering change; this QA did not modify production.
2. **Forest Home copy is corrupted/repeated:** the address `Đồng Tiến - Cúc Phương - Ninh Bình` is repeated many times in both the public detail excerpt and body, visibly making the page look broken (screenshots 05–06).
3. **Bad media alt/name:** the Forest Home image loads, but its accessible name is `undefined.jpg`. The media record is stored as `image/webp`; correct the alt text and display name through the approved admin workflow.
4. **Deletion guard needs a safe test:** an image currently referenced by Forest Home exposes an enabled `Xoá ảnh` control in the selected-asset panel. No delete action was attempted. Verify the server-side reference guard in a disposable/staging environment before relying on this protection in production.
5. **Finish acceptance in isolated sessions:** rerun public routes in a genuinely signed-out/incognito profile, and inspect Chrome DevTools Network for failed/5xx requests. Until then this is not a full production acceptance pass.

## Screenshot evidence

Screenshots are under `artifacts/production-chrome-qa-2026-09-30/`:

1. `01-home-1440.png`
2. `02-home-390.png`
3. `03-stays-1440.png`
4. `04-stays-390.png`
5. `05-forest-detail-1440.png`
6. `06-forest-detail-390.png`
7. `07-admin-properties-1440.png`
8. `08-admin-properties-390.png`
9. `09-admin-room-types-1440.png`
10. `10-admin-room-types-390.png`
11. `11-admin-mineral-edit-1440.png`
12. `12-admin-mineral-room-edit-1440.png`
13. `13-public-combos-1440.png`
14. `14-public-destinations-1440.png`
15. `15-public-pages-1440.png`
16. `16-public-booking-1440.png`
17. `17-admin-media-selected-undefined-alt-1440.png`

## Final status

`DVB_PRODUCTION_CHROME_QA_AFTER_IMPORT_2026_09_30_RESULT`
`QA_RESULT=FAIL`
`PUBLIC_SESSION_ISOLATION=NOT_VERIFIED`
`NETWORK_5XX_CHECK=NOT_VERIFIED`
`CONSOLE_REACT_418_COUNT=4`
`SCREENSHOTS=17`
`PRODUCTION_DATA_MUTATIONS=0`
`DEPLOY_OR_COMMIT=NONE`
