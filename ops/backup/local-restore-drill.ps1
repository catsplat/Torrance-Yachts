$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$artifactRoot = Join-Path $workspace ".artifacts\backup-drill"
$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$runDirectory = Join-Path $artifactRoot $stamp
$dumpPath = Join-Path $runDirectory "database.dump"
$resultPath = Join-Path $runDirectory "restore-result.json"
$remoteDump = "/tmp/torrance-restore-$stamp.dump"
$restoreDatabase = "torrance_restore_$($stamp.ToLowerInvariant())"

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
    -U postgres -d postgres -Fc --no-owner --no-privileges `
    --schema public --schema auth --schema storage `
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
alter database $restoreDatabase set search_path to public, extensions;
"@
  docker exec $databaseContainer psql `
    -U postgres -d $restoreDatabase -v ON_ERROR_STOP=1 -c $prepareSql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not prepare the isolated restore database." }

  docker exec $databaseContainer pg_restore `
    -U postgres -d $restoreDatabase --no-owner --no-privileges `
    --exit-on-error $remoteDump
  if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }

  $verificationSql = @"
select json_build_object(
  'profiles', (select count(*) from public.profiles),
  'yachts', (select count(*) from public.yachts),
  'enquiries', (select count(*) from public.enquiries),
  'bookings', (select count(*) from public.bookings),
  'launch_checks', (select count(*) from public.launch_readiness_checks),
  'storage_metadata', (select count(*) from storage.objects)
)::text;
"@
  $verification = docker exec $databaseContainer psql `
    -U postgres -d $restoreDatabase -At -v ON_ERROR_STOP=1 -c $verificationSql
  if ($LASTEXITCODE -ne 0) { throw "Restored database verification failed." }

  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $dumpPath).Hash.ToLowerInvariant()
  $result = [ordered]@{
    artifact = "database.dump"
    checksumSha256 = $hash
    completedAt = (Get-Date).ToUniversalTime().ToString("o")
    restoreDatabase = $restoreDatabase
    verification = $verification | ConvertFrom-Json
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
}
