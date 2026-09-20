#!/usr/bin/env bash
# Runs a backend npm script inside a throwaway Node 24 container attached to the
# compose network. Keeps PostgreSQL unpublished and the host Node untouched.
# Usage: scripts/backend.sh seed   |   scripts/backend.sh build
set -euo pipefail
cd "$(dirname "$0")/.."
NET="${COMPOSE_PROJECT_NAME:-dvb-booking}_default"
IMAGE="${NODE_IMAGE:-node:24-bookworm-slim}"
MSYS_NO_PATHCONV=1 exec docker run --rm -it \
  -v "$(pwd)/backend:/app" \
  -v "$(pwd)/.secrets/db_app_password:/run/secrets/db_app_password:ro" \
  -v "$(pwd)/.secrets/session_secret:/run/secrets/session_secret:ro" \
  -w /app --network "$NET" \
  -e DB_HOST=postgres -e DB_PORT=5432 -e DB_NAME=dvb_booking -e DB_USER=dvb_app \
  -e DB_PASSWORD_FILE=/run/secrets/db_app_password \
  -e SESSION_SECRET_FILE=/run/secrets/session_secret \
  "$IMAGE" npm run "$@"
