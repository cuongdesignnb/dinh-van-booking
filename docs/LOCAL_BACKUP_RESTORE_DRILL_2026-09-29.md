# Local PostgreSQL + Media Library restore drill (2026-09-29)

This is a **local recovery test**, not a production backup schedule, off-site copy, or permission to deploy.

From the repository root, with the local Compose stack running:

```powershell
pwsh -NoProfile -File scripts/verify-local-backup-restore.ps1 -ConfirmLocal
```

The script takes a custom-format `pg_dump` of the running local PostgreSQL database and a tar archive of the mounted Media Library. It restores the database into a newly named disposable PostgreSQL container with `--network none` and no published ports, and extracts media into a separate temporary directory. It compares row counts for **every public table**, SHA-256 hashes for **every copied file**, and confirms that each restored `media_assets.storage_key` has a restored file. It never restores into the live Compose database or media volume. Temporary archives and the scratch container are removed in `finally` after exact target checks.

Observed result on 2026-09-29: `RESTORE_DRILL=PASS TABLES=71 MEDIA_FILES=27 MEDIA_ASSETS=9`. A first run reported a source/restore row-count difference without identifying a table; the next run passed after the script was extended to report differences. No scratch container, PostgreSQL `/tmp/dvb-restore-*.dump`, or `dvb-local-restore-*` temporary directory remained after the passing run. The live database still contained 11 properties and 5 room types, and the stack remained healthy. The first mismatch is **not** evidence that the backup was valid; the passing rerun is the verified local result.

Limitations before Gate 6 can close:

- The database dump and media copy are sequential, not one atomic cross-system snapshot. Run in a quiet window or implement coordinated snapshots for a busy production system.
- This command deliberately retains no backup. Production still needs encrypted, access-controlled, off-site backups, retention, monitoring, and periodic restore tests using its own host/storage.
- This local drill does not verify point-in-time recovery, staging, production secrets/TLS/cookies/CDN, migration rollback, monitoring alerts, or a signed release/rollback rehearsal.
- `-ConfirmLocal` is an explicit guard; check the workspace and Compose target before running. Never point the script at a production Compose context.
