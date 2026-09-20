#!/bin/bash
# Creates the least-privilege application role. Runs once, on an empty data dir.
set -euo pipefail

APP_USER="${APP_DB_USER:-dvb_app}"
APP_DB="${APP_DB_NAME:-dvb_booking}"
APP_PASSWORD="$(cat /run/secrets/db_app_password)"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$APP_DB" <<SQL
  CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASSWORD}';
  -- The app role owns the schema it migrates, but is not a superuser.
  GRANT CONNECT ON DATABASE ${APP_DB} TO ${APP_USER};
  GRANT USAGE, CREATE ON SCHEMA public TO ${APP_USER};
  ALTER DATABASE ${APP_DB} SET timezone TO 'UTC';
SQL
