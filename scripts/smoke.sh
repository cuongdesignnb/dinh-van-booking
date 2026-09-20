#!/usr/bin/env bash
# Runs the API smoke test against the running stack, from inside the network.
set -euo pipefail
cd "$(dirname "$0")/.."
NET="${COMPOSE_PROJECT_NAME:-dvb-booking}_default"
MSYS_NO_PATHCONV=1 exec docker run --rm \
  -v "$(pwd)/backend:/app" \
  -v "$(pwd)/.secrets/owner_password:/run/secrets/owner_password:ro" \
  -w /app --network "$NET" \
  "${NODE_IMAGE:-node:24-bookworm-slim}" node scripts/smoke.mjs
