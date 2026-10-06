# ui-demo — fictional demo API for screenshots / UI QA only

ALL data here is fictional demo data (names prefixed "Demo · ", *.invalid emails, 0900… phones) and is never imported by app code.
`data.mjs` = `handle({ method, path, query, persona })`; `settings-registry.json` = snapshot of backend setting defaults (regenerate from `backend/src/settings/settings.registry.ts` if keys change).
`about-page.json` = snapshot of the `about.page` bootstrap copy (regenerate from `backend/src/scripts/data/public-bootstrap.ts` when that copy changes: compile it with `npx tsc` and write `publicBootstrapSettings({ hero: "__HERO__" })["about.page"]`).
`server.mjs` serves `/api/v1/*` as persona `anon` for Next.js SSR; `route.mjs` (`installDemoRoutes(page, 'admin'|'partner'|'anon')`) fulfils browser calls in Playwright.
Mutations return echo bodies / `{ ok: true }` and nothing is persisted.

    DEMO_API_PORT=4100 node scripts/ui-demo/server.mjs &
    INTERNAL_API_BASE_URL=http://127.0.0.1:4100/api/v1 npx next start -p 3199   # or `next dev`; add NEXT_DIST_DIR=.next-base for that build
    DEMO_BASE_URL=http://127.0.0.1:3199 node scripts/ui-demo/check.mjs --shots   # screenshots in /tmp/ui-demo-shots
