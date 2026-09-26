# Đinh Vân Booking — Website & CMS

Frontend homepage for Đinh Vân Booking (tư vấn & đặt phòng Cúc Phương, Ninh Bình), rebuilt from
the design reference in `docs/reference/`. Spec: `doc.md`.

**Stack:** Next.js 15 (App Router) · TypeScript · self-hosted WOFF2 fonts · TipTap ·
NestJS/Fastify · Prisma/PostgreSQL · Redis · Docker Compose/Nginx · Playwright.

## Commands

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build && npm run start -- -p 3100
npm run lint && npm run typecheck
npm test             # Playwright (starts/reuses the server on :3100)
npm run shoot        # screenshots → docs/screenshots (server must be running)
npm run assets:extract   # re-create images from the reference (Python + OpenCV)
```

The public app requires a reachable API (`INTERNAL_API_BASE_URL`) for database-backed
content. For the local Compose setup, use `scripts/prepare-local-secrets.py`,
`scripts/preflight-ports.py --write`, then `scripts/compose.sh up -d --build`.
Backend scripts run in a Node 24 container: `scripts/backend.sh build|test|seed`;
`seed` requires the local Compose database to be running.

## Routes

| Route | Screen |
|---|---|
| `/` | Homepage |
| `/phong-nghi` | Published stays from the API; URL filters are not indexable |
| `/phong-nghi/[slug]` | Published stay detail; unresolved or ineligible content is 404 |
| `/combo-du-lich`, `/combo-du-lich/[slug]` | Published combo listing and detail; legacy `?combo=…` resolves to the real route or 404 |
| `/diem-den`, `/diem-den/[slug]` | Published destination listing and detail; legacy `?d=…` resolves to the real route or 404 |
| `/lien-he` | Consultation form; submits an inquiry to the API |
| `/dat-phong` | Inquiry flow, not a confirmed reservation or payment; can be prefilled with `stay` |
| `/bai-viet/[slug]` | Published article |
| `/chuyen-trang/[slug]`, `/<slug>` | Published static page (legacy section path redirects to its root route) |
| `/robots.txt`, `/sitemap.xml` | Runtime SEO policy and eligible public URL inventory |

Screen status and verification: `docs/implementation-status.md`, `docs/ui-verification.md`.
`node scripts/shoot-all.mjs artifacts/ui 1448 390` regenerates screenshots (server on :3100).

## Structure

- `src/components/home/*` — page sections (server components except `SiteHeader`,
  `BookingSearch`, `Testimonials`).
- `src/components/ui/*` — client islands: dialogs, popovers, date/guest pickers, favorites,
  `MotionController` (scroll reveals, parallax, card tilt, magnetic buttons).
- `src/data/admin/*fixtures*` — legacy fixture-backed admin modules retained for screens not yet migrated; not a source of public catalog data.
- `src/config/site.ts` — preview/production mode and contact channels (all `null` until confirmed).
- `docs/asset-audit.md`, `docs/ui-verification.md` — asset provenance and verification report.

## Runtime and production readiness

Public content and settings come from PostgreSQL through the API; empty/error responses do not
fall back to commercial fixtures. Search indexing stays closed unless both the database setting
and deployment-level HTTPS origin gate are explicitly approved. The checkout currently records
an inquiry, not a confirmed booking or payment. Several legacy admin dashboard, booking and
customer screens are still fixture-backed and are listed as production blockers in
`docs/data-audit/remaining-blockers.md`. Generated fonts are licensed under SIL OFL 1.1; see
`public/fonts/OFL.txt`.
