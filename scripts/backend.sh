#!/usr/bin/env bash
# Runs a backend npm script inside a throwaway Node 24 container. Source files
# are mounted read-only and copied into the container so builds can freely
# recreate dist/ and generated Prisma files without touching the Windows host.
# Database-backed scripts also join the Compose network.
# Usage: scripts/backend.sh seed | create-owner [args...] | build | test
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/backend.sh <npm-script> [args...]" >&2
  exit 2
fi
NET="${COMPOSE_PROJECT_NAME:-dvb-booking}_default"
IMAGE="${NODE_IMAGE:-node:24-bookworm-slim}"
TTY_FLAGS=()
if [ -t 0 ] && [ -t 1 ]; then TTY_FLAGS=(-it); else TTY_FLAGS=(-i); fi
DOCKER_ARGS=(run --rm "${TTY_FLAGS[@]}"
  -v "$(pwd)/backend:/src:ro"
  -w /app
)

case "$1" in
  build|test) ;;
  *)
    DOCKER_ARGS+=(--network "$NET"
      -v "$(pwd)/.secrets/db_app_password:/run/secrets/db_app_password:ro"
      -v "$(pwd)/.secrets/session_secret:/run/secrets/session_secret:ro"
      -e DB_HOST=postgres -e DB_PORT=5432 -e DB_NAME=dvb_booking -e DB_USER=dvb_app
      -e DB_PASSWORD_FILE=/run/secrets/db_app_password
      -e SESSION_SECRET_FILE=/run/secrets/session_secret
    )
    ;;
esac

if [ "$1" = "seed:public-bootstrap" ]; then
  MEDIA_VOLUME="${COMPOSE_PROJECT_NAME:-dvb-booking}_media-data"
  docker volume inspect "$MEDIA_VOLUME" >/dev/null
  MEDIA_MODE=ro
  for arg in "$@"; do
    if [ "$arg" = "--apply" ]; then MEDIA_MODE=rw; fi
  done
  DOCKER_ARGS+=(
    -v "${MEDIA_VOLUME}:/var/lib/dvb/media:${MEDIA_MODE}"
    -v "$(pwd)/public/images/dinh-van-booking:/bootstrap-assets:ro"
    -e DVB_BOOTSTRAP_ASSETS_DIR=/bootstrap-assets
  )
  if [ -n "${DVB_BOOTSTRAP_ACTOR_EMAIL:-}" ]; then
    DOCKER_ARGS+=(-e "DVB_BOOTSTRAP_ACTOR_EMAIL=${DVB_BOOTSTRAP_ACTOR_EMAIL}")
  fi
fi

MSYS_NO_PATHCONV=1 exec docker "${DOCKER_ARGS[@]}" "$IMAGE" sh -ec '
    mkdir -p /app/src
    cp /src/package.json /src/package-lock.json /src/nest-cli.json /src/prisma.config.ts /src/tsconfig.json /app/
    cp -a /src/prisma /src/scripts /app/
    cp -a /src/src/. /app/src/
    # The host-generated client is platform-specific and is regenerated below.
    if [ -d /app/src/generated/prisma ]; then rm -rf /app/src/generated/prisma; fi
    npm ci
    npx prisma generate
    npm run build
    if [ "$1" = "build" ]; then exit 0; fi
    npm run "$@"
  ' backend "$@"
