#!/usr/bin/env bash
# Same smoke test, but through the Nginx gateway instead of straight at the API,
# so the proxy rules for /api/ and /media/ are exercised too.
set -euo pipefail
cd "$(dirname "$0")/.."
NET="${COMPOSE_PROJECT_NAME:-dvb-booking}_default"
MSYS_NO_PATHCONV=1 exec docker run --rm \
  -v "$(pwd)/backend:/app" \
  -v "$(pwd)/.secrets/owner_password:/run/secrets/owner_password:ro" \
  -w /app --network "$NET" \
  -e API_BASE=http://gateway/api/v1 \
  "${NODE_IMAGE:-node:24-bookworm-slim}" node scripts/smoke.mjs
