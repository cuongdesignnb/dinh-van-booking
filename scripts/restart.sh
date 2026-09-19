#!/usr/bin/env bash
# Rebuild and restart the local production server on :3100 (Windows / Git Bash).
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" >/dev/null 2>&1
npm run build 2>&1 | grep -E "rror|✓ Compiled" || true
(npm run start -- -p 3100 > /tmp/dvb-server.log 2>&1 &)
sleep 4
