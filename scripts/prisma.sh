#!/usr/bin/env bash
# Runs a Prisma command against the project database from a throwaway Node 24
# container on the compose network, so PostgreSQL stays unpublished and the
# host never needs the right Node version.
# Usage: scripts/prisma.sh migrate deploy   |   scripts/prisma.sh studio
set -euo pipefail
cd "$(dirname "$0")/.."
NET="${COMPOSE_PROJECT_NAME:-dvb-booking}_default"
IMAGE="${NODE_IMAGE:-node:24-bookworm-slim}"
MSYS_NO_PATHCONV=1 exec docker run --rm -i \
  -v "$(pwd)/backend:/app" \
  -v "$(pwd)/.secrets/db_app_password:/run/secrets/db_app_password:ro" \
  -w /app --network "$NET" \
  -e DB_HOST=postgres -e DB_PORT=5432 -e DB_NAME=dvb_booking -e DB_USER=dvb_app \
  -e DB_PASSWORD_FILE=/run/secrets/db_app_password \
  "$IMAGE" node scripts/run-with-db-url.mjs npx prisma "$@"
