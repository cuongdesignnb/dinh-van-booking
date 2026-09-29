param(
  [switch]$ConfirmLocal
)

# A local restore drill, not a production backup or retention policy. Never
# restores into the Compose database or media volume. Temporary copies contain
# real local data and are removed in finally, including on failure.
$ErrorActionPreference = 'Stop'
if (-not $ConfirmLocal) {
  throw 'Chỉ chạy trên Docker local: thêm -ConfirmLocal sau khi kiểm tra đúng workspace.'
}

function Invoke-Docker {
  param([string[]]$Arguments)
  $lines = @(& docker @Arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed (exit $LASTEXITCODE): $($lines -join [Environment]::NewLine)"
  }
  return @($lines | ForEach-Object { [string]$_ })
}

function Read-ContainerCounts {
  param([string[]]$Prefix, [string]$User, [string]$Database, [string]$Sql)
  return @(Invoke-Docker -Arguments ($Prefix + @('psql', '-X', '-q', '-A', '-t', '-F', '|', '-U', $User, '-d', $Database, '-c', $Sql)))
}

function Get-MediaHashes {
  param([string]$Directory)
  $hashes = @{}
  foreach ($file in @(Get-ChildItem -LiteralPath $Directory -File -Recurse)) {
    $relative = [IO.Path]::GetRelativePath($Directory, $file.FullName).Replace('\', '/')
    $hashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
  return $hashes
}

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$drillId = [Guid]::NewGuid().ToString('N')
$scratch = [IO.Path]::GetFullPath((Join-Path $tempRoot "dvb-local-restore-$drillId"))
if (-not $scratch.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or
    (Split-Path $scratch -Leaf) -ne "dvb-local-restore-$drillId") {
  throw 'Temporary target is outside the expected directory.'
}
$containerName = "dvb-restore-drill-$($drillId.Substring(0, 12))"
$dumpName = "dvb-restore-$drillId.dump"
$dumpPath = "/tmp/$dumpName"
$compose = @('compose', '--env-file', '.env.docker', '--env-file', '.env.ports')
$mediaBackup = Join-Path $scratch 'media-backup'
$mediaRestored = Join-Path $scratch 'media-restored'
$archive = Join-Path $scratch 'media.tar'
$databaseCopy = Join-Path $scratch $dumpName
$scratchContainerStarted = $false
$dumpCreated = $false

Push-Location $projectRoot
try {
  foreach ($file in @('compose.yaml', '.env.docker', '.env.ports')) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing local Compose file: $file" }
  }
  if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw 'tar.exe is required for the media restore drill.' }
  $postgresId = @(Invoke-Docker -Arguments ($compose + @('ps', '-q', 'postgres')))[0].Trim()
  $apiId = @(Invoke-Docker -Arguments ($compose + @('ps', '-q', 'api')))[0].Trim()
  if ($postgresId -notmatch '^[a-f0-9]{12,64}$' -or $apiId -notmatch '^[a-f0-9]{12,64}$') {
    throw 'Local PostgreSQL/API containers are not running.'
  }
  $dbUser = @(Invoke-Docker -Arguments ($compose + @('exec', '-T', 'postgres', 'printenv', 'POSTGRES_USER')))[0].Trim()
  $dbName = @(Invoke-Docker -Arguments ($compose + @('exec', '-T', 'postgres', 'printenv', 'POSTGRES_DB')))[0].Trim()
  if ($dbUser -notmatch '^[A-Za-z_][A-Za-z0-9_]*$' -or $dbName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    throw 'Unexpected database identity; refusing the restore drill.'
  }

  New-Item -ItemType Directory -Path $scratch, $mediaBackup, $mediaRestored | Out-Null
  Write-Host 'Creating consistent PostgreSQL dump and media archive from local Docker...'
  Invoke-Docker -Arguments ($compose + @('exec', '-T', 'postgres', 'pg_dump', '-U', $dbUser, '-d', $dbName,
    '--format=custom', '--no-owner', '--no-acl', '--lock-wait-timeout=5000', "--file=$dumpPath")) | Out-Null
  $dumpCreated = $true
  Invoke-Docker -Arguments @('cp', "${postgresId}:$dumpPath", $databaseCopy) | Out-Null
  Invoke-Docker -Arguments @('cp', "${apiId}:/var/lib/dvb/media/.", $mediaBackup) | Out-Null
  & tar.exe -C $mediaBackup -cf $archive .
  if ($LASTEXITCODE -ne 0) { throw 'Media archive creation failed.' }
  & tar.exe -C $mediaRestored -xf $archive
  if ($LASTEXITCODE -ne 0) { throw 'Media archive restore failed.' }

  # A scratch PostgreSQL container has no network interface and no published
  # port. Trust auth is confined to this disposable network-less container.
  Invoke-Docker -Arguments @('run', '-d', '--rm', '--network', 'none', '--name', $containerName,
    '--label', "dvb.restore-drill=$drillId", '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:18-bookworm') | Out-Null
  $scratchContainerStarted = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
    $readyOutput = @(& docker exec $containerName pg_isready -U postgres 2>&1)
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Scratch PostgreSQL did not become ready.' }

  Invoke-Docker -Arguments @('cp', $databaseCopy, "${containerName}:/tmp/$dumpName") | Out-Null
  Invoke-Docker -Arguments @('exec', $containerName, 'createdb', '-U', 'postgres', 'dvb_restore_probe') | Out-Null
  Invoke-Docker -Arguments @('exec', $containerName, 'pg_restore', '-U', 'postgres', '-d', 'dvb_restore_probe',
    '--no-owner', '--no-acl', "/tmp/$dumpName") | Out-Null

  $tables = Read-ContainerCounts -Prefix ($compose + @('exec', '-T', 'postgres')) -User $dbUser -Database $dbName -Sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  if ($tables.Count -eq 0) { throw 'No public tables found in source database.' }
  $fragments = foreach ($table in $tables) {
    if ($table -notmatch '^[a-z_][a-z0-9_]*$') { throw "Unexpected table name: $table" }
    "SELECT '$table' AS table_name, count(*)::bigint AS row_count FROM public.`"$table`""
  }
  $countSql = ($fragments -join ' UNION ALL ') + ' ORDER BY table_name'
  $liveCounts = Read-ContainerCounts -Prefix ($compose + @('exec', '-T', 'postgres')) -User $dbUser -Database $dbName -Sql $countSql
  $restoredCounts = Read-ContainerCounts -Prefix @('exec', $containerName) -User 'postgres' -Database 'dvb_restore_probe' -Sql $countSql
  $countDifferences = @(Compare-Object $liveCounts $restoredCounts)
  if ($countDifferences.Count -ne 0) {
    $sample = ($countDifferences | Select-Object -First 12 | ForEach-Object { "$($_.InputObject) [$($_.SideIndicator)]" }) -join '; '
    throw "Source and restored table row counts differ (a concurrent write may have occurred): $sample"
  }

  $originalHashes = @{}
  $sourceManifest = @(Invoke-Docker -Arguments ($compose + @('exec', '-T', 'api', 'sh', '-c',
    'cd /var/lib/dvb/media && find . -type f -print0 | sort -z | xargs -0 -r sha256sum')))
  foreach ($line in $sourceManifest) {
    if ($line -notmatch '^([0-9a-f]{64})\s+\.?/?(.+)$') { throw 'Invalid media hash manifest from source container.' }
    $originalHashes[$Matches[2]] = $Matches[1]
  }
  $backupHashes = Get-MediaHashes -Directory $mediaBackup
  $restoredHashes = Get-MediaHashes -Directory $mediaRestored
  foreach ($candidate in @($backupHashes, $restoredHashes)) {
    if ($candidate.Count -ne $originalHashes.Count) { throw 'Media file count differs after backup/restore.' }
    foreach ($name in $originalHashes.Keys) {
      if ($candidate[$name] -ne $originalHashes[$name]) { throw "Media hash mismatch: $name" }
    }
  }

  $mediaKeys = Read-ContainerCounts -Prefix @('exec', $containerName) -User 'postgres' -Database 'dvb_restore_probe' -Sql 'SELECT storage_key FROM media_assets ORDER BY storage_key'
  foreach ($key in $mediaKeys) {
    if (-not $restoredHashes.ContainsKey($key)) { throw "Restored media asset is missing its file: $key" }
  }

  Write-Host "RESTORE_DRILL=PASS TABLES=$($tables.Count) MEDIA_FILES=$($restoredHashes.Count) MEDIA_ASSETS=$($mediaKeys.Count)"
  Write-Host 'Scratch database and temporary backup will now be removed. Live Compose volumes were not restored or modified.'
}
finally {
  if ($scratchContainerStarted) {
    try {
      $labels = @(Invoke-Docker -Arguments @('inspect', '--format', '{{json .Config.Labels}}', $containerName))[0] | ConvertFrom-Json
      if ($labels.PSObject.Properties['dvb.restore-drill'].Value -eq $drillId) {
        Invoke-Docker -Arguments @('stop', $containerName) | Out-Null
      } else { Write-Warning 'Scratch container label mismatch; not stopping it automatically.' }
    } catch { Write-Warning "Scratch container cleanup needs inspection: $_" }
  }
  if ($dumpCreated) {
    try { Invoke-Docker -Arguments ($compose + @('exec', '-T', 'postgres', 'rm', '-f', '--', $dumpPath)) | Out-Null }
    catch { Write-Warning "Temporary dump cleanup needs inspection: $_" }
  }
  if (Test-Path -LiteralPath $scratch -PathType Container) {
    $verified = [IO.Path]::GetFullPath($scratch)
    if ($verified.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path $verified -Leaf) -eq "dvb-local-restore-$drillId") {
      Remove-Item -LiteralPath $verified -Recurse -Force
    } else { Write-Warning 'Temporary directory failed target verification; not deleting it.' }
  }
  Pop-Location
}
