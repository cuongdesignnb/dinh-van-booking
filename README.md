# Đinh Vân Booking — Homepage

Frontend homepage for Đinh Vân Booking (tư vấn & đặt phòng Cúc Phương, Ninh Bình), rebuilt from
the design reference in `docs/reference/`. Spec: `doc.md`.

**Stack:** Next.js 15 (App Router) · TypeScript · plain CSS (`src/app/globals.css`) ·
`next/font` (Playfair Display, Roboto Condensed, Dancing Script — Vietnamese subsets) ·
`lucide-react` + `simple-icons` inline SVG · Playwright.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm run start -- -p 3100
npm run lint && npm run typecheck
npm test             # Playwright (starts/reuses the server on :3100)
npm run shoot        # screenshots → docs/screenshots (server must be running)
npm run assets:extract   # re-create images from the reference (Python + OpenCV)
```

## Routes

| Route | Screen |
|---|---|
| `/` | Homepage |
| `/phong-nghi` | Stay listing (filters in the URL; `?demo=loading|error`, `?fixture=extended` for states) |
| `/phong-nghi/[slug]` | Stay detail (8 slugs) |
| `/combo-du-lich` | Combos (`?combo=<slug>` opens the detail dialog) |
| `/diem-den` | Destinations (`?d=<id>` opens the detail dialog) |
| `/lien-he` | Consultation form (`?intent=stay|combo|destination&item=…`; `?demo=adapter-error`) |
| `/dat-phong` | Booking draft (needs `stay`, `room`, dates, guests; `?scenario=baseline` = brief fixture) |

Screen status and verification: `docs/implementation-status.md`, `docs/ui-verification.md`.
`node scripts/shoot-all.mjs artifacts/ui 1448 390` regenerates screenshots (server on :3100).

## Structure

- `src/components/home/*` — page sections (server components except `SiteHeader`,
  `BookingSearch`, `Testimonials`).
- `src/components/ui/*` — client islands: dialogs, popovers, date/guest pickers, favorites,
  `MotionController` (scroll reveals, parallax, card tilt, magnetic buttons).
- `src/data/home-fixtures.ts` — demo data (rooms, destinations, reviews), all flagged `demo`.
- `src/config/site.ts` — preview/production mode and contact channels (all `null` until confirmed).
- `docs/asset-audit.md`, `docs/ui-verification.md` — asset provenance and verification report.

## Preview status

The site runs in `preview` mode: `noindex`, no structured data, contact buttons open a
"Thông tin liên hệ đang được cập nhật" dialog, search shows suggestions only (no availability,
no booking). Replace the data listed in `docs/asset-audit.md` before production.
