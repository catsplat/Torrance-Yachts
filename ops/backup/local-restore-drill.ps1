$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$artifactRoot = Join-Path $workspace ".artifacts\backup-drill"
$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$runDirectory = Join-Path $artifactRoot $stamp
$dumpPath = Join-Path $runDirectory "database.dump"
$resultPath = Join-Path $runDirectory "restore-result.json"
$remoteDump = "/tmp/torrance-restore-$stamp.dump"
$restoreListPath = Join-Path $runDirectory "restore.list"
$remoteRestoreList = "/tmp/torrance-restore-$stamp.list"
$restoreDatabase = "torrance_restore_$($stamp.ToLowerInvariant())"

function Get-Sha256Hex([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($hasher.ComputeHash($stream)) -replace "-", "").ToLowerInvariant()
  }
  finally {
    $hasher.Dispose()
    $stream.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $runDirectory | Out-Null
$databaseContainer = docker ps `
  --filter "label=com.supabase.cli.project=Torrance_Yachts" `
  --format "{{.Names}}" |
  Where-Object { $_ -like "supabase_db_*" } |
  Select-Object -First 1

if (-not $databaseContainer) {
  throw "The local Supabase database is not running."
}

try {
  docker exec $databaseContainer pg_dump `
    -U postgres -d postgres -Fc `
    --schema public --schema auth --schema storage --schema vault `
    -f $remoteDump
  if ($LASTEXITCODE -ne 0) { throw "Database export failed." }

  docker cp "${databaseContainer}:${remoteDump}" $dumpPath
  if ($LASTEXITCODE -ne 0) { throw "Could not copy the database backup." }

  docker exec $databaseContainer createdb -U postgres $restoreDatabase
  if ($LASTEXITCODE -ne 0) { throw "Could not create the isolated restore database." }

  $prepareSql = @"
drop schema public cascade;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists supabase_vault;
alter database $restoreDatabase set search_path to public, extensions;
"@
  docker exec $databaseContainer psql `
    -U postgres -d $restoreDatabase -v ON_ERROR_STOP=1 -c $prepareSql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not prepare the isolated restore database." }

  # Vault is supplied by the extension in the disposable target, while its secret
  # rows are part of the dump. Exclude only the duplicate CREATE SCHEMA entry so
  # that foreign keys and encrypted secret records restore in their original order.
  $restoreList = docker exec $databaseContainer pg_restore -l $remoteDump
  if ($LASTEXITCODE -ne 0) { throw "Could not prepare the database restore list." }
  $restoreListEntries = @($restoreList | Where-Object { $_ -notmatch " SCHEMA - vault " })
  [System.IO.File]::WriteAllLines(
    $restoreListPath,
    [string[]]$restoreListEntries,
    (New-Object System.Text.UTF8Encoding($false))
  )
  docker cp $restoreListPath "${databaseContainer}:${remoteRestoreList}"
  if ($LASTEXITCODE -ne 0) { throw "Could not copy the database restore list." }

  docker exec $databaseContainer pg_restore `
    -U supabase_admin -d $restoreDatabase `
    --exit-on-error --use-list $remoteRestoreList $remoteDump
  if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }

  $verificationSql = @"
select json_build_object(
  'profiles', (select count(*) from public.profiles),
  'yachts', (select count(*) from public.yachts),
  'enquiries', (select count(*) from public.enquiries),
  'bookings', (select count(*) from public.bookings),
  'launch_checks', (select count(*) from public.launch_readiness_checks),
  'storage_metadata', (select count(*) from storage.objects),
  'rls_enabled', (select relrowsecurity from pg_class where oid='public.email_messages'::regclass),
  'authenticated_can_read_emails', has_table_privilege('authenticated','public.email_messages','SELECT'),
  'anon_cannot_read_emails', not has_table_privilege('anon','public.email_messages','SELECT')
)::text;
"@
  $verification = docker exec $databaseContainer psql `
    -U postgres -d $restoreDatabase -At -v ON_ERROR_STOP=1 -c $verificationSql
  if ($LASTEXITCODE -ne 0) { throw "Restored database verification failed." }
  $verified = $verification | ConvertFrom-Json
  if (-not $verified.rls_enabled -or -not $verified.authenticated_can_read_emails -or -not $verified.anon_cannot_read_emails) {
    throw "Restored database did not preserve mailbox RLS and access grants."
  }

  $hash = Get-Sha256Hex $dumpPath
  $result = [ordered]@{
    artifact = "database.dump"
    checksumSha256 = $hash
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    restoreDatabase = $restoreDatabase
    verification = $verified
  }
  $result | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 -LiteralPath $resultPath
  Write-Output "Restore drill passed."
  Write-Output "Artifact: $dumpPath"
  Write-Output "Evidence: $resultPath"
  Write-Output "SHA256: $hash"
}
finally {
  docker exec $databaseContainer dropdb -U postgres --if-exists $restoreDatabase | Out-Null
  docker exec $databaseContainer rm -f $remoteDump | Out-Null
  docker exec $databaseContainer rm -f $remoteRestoreList | Out-Null
}
