#!/usr/bin/env bash
# Wrapper that always loads the project env files in the right order.
# Usage: scripts/compose.sh up -d --build   |   scripts/compose.sh logs -f api
set -euo pipefail
cd "$(dirname "$0")/.."
for f in .env.docker .env.ports; do
  [ -f "$f" ] || { echo "Missing $f — run scripts/prepare-local-secrets.py and preflight-ports.py"; exit 1; }
done
set -a; . ./.env.docker; . ./.env.ports; set +a
exec docker compose --env-file .env.docker --env-file .env.ports "$@"
