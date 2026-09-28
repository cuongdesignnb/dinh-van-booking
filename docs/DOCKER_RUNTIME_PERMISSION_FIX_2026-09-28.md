# Docker runtime permission fix — 2026-09-28

Scope: local source, image builds, and local QA only. No production host, image, database, DNS, secret, or service was changed. The production emergency image remains a separate manual hotfix until a separately authorized rollout.

## Result

```text
START_SHA=e5a84e6105665ae410a80545e1f2eca11182700c
FINAL_SHA=HEAD (resolve after push with git rev-parse HEAD; immutable SHA in task result)
REMOTE_MAIN_AFTER=origin/main (resolve after push with git rev-parse origin/main; must equal HEAD)
WORKTREE_FINAL=CLEAN (verify after push)

ROOT_CAUSE=HOST_UMASK_PERMISSION_PROPAGATED_INTO_DOCKER_COPY
API_RUNTIME_USER=node
WORKER_RUNTIME_USER=node
WEB_RUNTIME_USER=node

SOURCE_0600_REGRESSION_TEST=PASS
API_PACKAGE_JSON_READ=PASS
WORKER_RUNTIME_READ=PASS
WEB_PACKAGE_JSON_READ=PASS
WEB_NEXT_CONFIG_READ=PASS

FRONTEND_LINT=PASS
FRONTEND_TYPECHECK=PASS
FRONTEND_BUILD=PASS
BACKEND_BUILD=PASS
BACKEND_TEST=PASS (26/26)
API_SMOKE=PASS (69/69)
PLAYWRIGHT=PASS (40 passed, 2 opt-in skips)
AUDIT_NO_HARDCODE=PASS (42 findings reported; command exited 0)
AUDIT_ADMIN_RUNTIME=PASS (0 pending/fixture/localStorage/fake KPI findings)
AUDIT_PUBLIC_CONTENT=PASS (all requested hardcode/editor/image metrics 0)

NEW_MIGRATIONS=0
ENV_CHANGES=0
BUSINESS_DATA_CHANGES=0

COMMIT_CREATED=YES
PUSHED_TO_MAIN=YES
PRODUCTION_DEPLOYMENT=NO
SAFE_TO_REBUILD_PRODUCTION=YES (permission-safe image rebuild only, not deploy authorization)
BLOCKERS=NONE for the runtime permission fix; normal production rollout gates remain separate
```

The final commit cannot contain its own SHA or the post-push remote SHA as literal values without changing that SHA. The task result reports both immutable values after push; the refs above are the reproducible values in this committed handoff.

## Diagnosis and change

The production sync had used `umask 077` before Git operations. Newly written checkout files could become `0600 root:root`. Docker `COPY` preserved that mode; the old final runtime stages copied package/config as root-owned, then switched to `USER node` (UID 1000). The API could not read `/app/package.json` and crashed with `ERR_INVALID_PACKAGE_CONFIG`, leaving the gateway at 502. A one-off production image chmod proved the cause but did not fix source.

Both final runtime Docker stages now use `COPY --chown=node:node` for every required runtime artifact. The API image is shared by API and worker. The web `.next` cache remains node-writable; media remains node-writable. The services are not changed to run as root and no `chmod 777` is used.

The repository had no checked-in deployment script that wraps Git sync/build context creation in `umask 077`. The retained Redis-only `umask 077` protects `/tmp/dvb-redis.conf` and does not touch Git. The backup example in `backendapi.md` now creates a `0700` directory and `0600` output files directly; `docs/backend/operations.md` warns against a restrictive source-sync umask. Secret permissions were not loosened.

## Reproduction and verification

`bash scripts/audit-docker-runtime-permissions.sh` creates a temporary tar build context from tracked/non-ignored source, replacing `backend/package.json`, root `package.json`, and `next.config.ts` with explicit mode `0600` tar entries. It does not chmod or overwrite the checkout. It builds API/web runtime images from this fixture and runs read/parse checks with each image's default UID 1000 `node`. The observed runtime files were `600 node:node`; API `dist/main.js`, `dist/worker.js`, `prisma/schema.prisma`, and `scripts/run-with-db-url.mjs` were readable, and web `.next` was writable. It printed all required PASS markers without DB or Redis.

Normal builds also passed:

```text
docker build -f infra/api.Dockerfile --target runtime -t dvb-api-permission-qa .
docker build -f infra/web.Dockerfile -t dvb-web-permission-qa .
```

Default-user `docker run --rm --entrypoint sh` checks on both normal images printed UID 1000 `node`, stat ownership `node:node`, and `API_RUNTIME_PERMISSION=PASS`, `WORKER_RUNTIME_READ=PASS`, `WEB_RUNTIME_PERMISSION=PASS`. The local stack was already healthy; its API smoke and Playwright runs were functional regression checks, not a production deployment. Two opt-in Playwright tests (`restart-persistence`, bootstrap replacement mutation) were skipped by configuration. Audit-generated timestamp-only report changes were returned to their pre-task state.
