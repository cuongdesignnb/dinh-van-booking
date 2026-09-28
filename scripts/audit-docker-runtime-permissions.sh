#!/usr/bin/env bash
# Build both runtime images from a tar context whose package/config source files
# are mode 0600. This reproduces a restrictive checkout without touching it.
set -euo pipefail
cd "$(dirname "$0")/.."
tar_bin="$(command -v tar)"
# Windows puts BSD tar.exe on PATH ahead of Git Bash's GNU tar unless launched
# as a login shell. GNU tar is required for --mode on appended context entries.
if [[ -x /usr/bin/tar ]]; then
  tar_bin=/usr/bin/tar
fi
if ! "$tar_bin" --version | grep -q 'GNU tar'; then
  echo 'GNU tar is required for the 0600 Docker context fixture' >&2
  exit 1
fi

archive="$(mktemp "${TMPDIR:-/tmp}/dvb-runtime-permissions.XXXXXXXX.tar")"
trap 'rm -f -- "$archive"' EXIT

# Include tracked and non-ignored new source files, but replace the three
# permission-sensitive files with 0600 tar entries. Docker reads the tar header
# modes, so this works even on a Windows checkout without POSIX chmod support.
git ls-files -z --cached --others --exclude-standard |
  grep -zEv '^(package\.json|backend/package\.json|next\.config\.ts)$' |
  "$tar_bin" --create --file "$archive" --null --files-from -
"$tar_bin" --append --file "$archive" --mode=600 \
  package.json backend/package.json next.config.ts

for source in package.json backend/package.json next.config.ts; do
  mode="$("$tar_bin" --list --verbose --file "$archive" "$source" | awk 'NR == 1 { print $1 }')"
  if [[ "$mode" != '-rw-------' ]]; then
    echo "Expected mode 0600 in Docker source context for $source, got $mode" >&2
    exit 1
  fi
done
echo 'SOURCE_CONTEXT_0600=PASS'

docker build --progress=plain -f infra/api.Dockerfile --target runtime \
  -t dvb-api-permission-0600-qa - < "$archive"
docker build --progress=plain -f infra/web.Dockerfile --target runtime \
  -t dvb-web-permission-0600-qa - < "$archive"

docker run --rm --entrypoint sh dvb-api-permission-0600-qa -ec '
  test "$(id -u)" = 1000
  test "$(id -un)" = node
  test -r /app/package.json
  node -e '\''JSON.parse(require("fs").readFileSync("/app/package.json", "utf8"))'\''
  node -e '\''require.resolve("@nestjs/core")'\''
  test -r /app/dist/main.js
  test -r /app/dist/worker.js
  test -r /app/prisma/schema.prisma
  test -r /app/scripts/run-with-db-url.mjs
  test -w /var/lib/dvb/media
  stat -c "%a %U:%G %n" /app/package.json /app/dist/main.js /app/prisma/schema.prisma /app/scripts/run-with-db-url.mjs
  echo API_RUNTIME_USER=node
  echo API_PACKAGE_JSON_READ=PASS
  echo API_RUNTIME_PERMISSION=PASS
  echo WORKER_RUNTIME_USER=node
  echo WORKER_RUNTIME_READ=PASS
'

docker run --rm --entrypoint sh dvb-web-permission-0600-qa -ec '
  test "$(id -u)" = 1000
  test "$(id -un)" = node
  test -r /app/package.json
  test -r /app/next.config.ts
  node -e '\''JSON.parse(require("fs").readFileSync("/app/package.json", "utf8"))'\''
  node -e '\''require.resolve("next/package.json")'\''
  test -r /app/.next/BUILD_ID
  test -w /app/.next
  test -r /app/public/file.svg
  stat -c "%a %U:%G %n" /app/package.json /app/next.config.ts /app/.next/BUILD_ID
  echo WEB_RUNTIME_USER=node
  echo WEB_PACKAGE_JSON_READ=PASS
  echo WEB_NEXT_CONFIG_READ=PASS
  echo WEB_RUNTIME_PERMISSION=PASS
'

echo 'SOURCE_0600_REGRESSION_TEST=PASS'
