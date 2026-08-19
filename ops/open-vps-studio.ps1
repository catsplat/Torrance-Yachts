<#
Starts the optional private Studio profile on a self-hosted VPS and opens a
local-only SSH tunnel. The remote Studio port is bound to 127.0.0.1 only.

Example:
  .\ops\open-vps-studio.ps1 -HostName 100.75.92.123 -IdentityFile "$env:USERPROFILE\.ssh\torrance_yachts_hetzner"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$HostName,
  [Parameter(Mandatory)]
  [string]$IdentityFile,
  [string]$User = "torrance",
  [string]$DeploymentPath = "/opt/torrance-yachts"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $IdentityFile)) {
  throw "SSH identity file was not found: $IdentityFile"
}

$remoteCommand = "cd '$DeploymentPath' && docker compose --env-file .env -f supabase-core.compose.yml --profile studio up -d --wait meta studio"
& ssh -i $IdentityFile "$User@$HostName" $remoteCommand
if ($LASTEXITCODE -ne 0) { throw "The private Studio profile did not start." }

Write-Host "Opening a private SSH tunnel. Keep this window open while using Studio."
Write-Host "Then browse to http://127.0.0.1:54323"
& ssh -N -L "127.0.0.1:54323:127.0.0.1:54323" -i $IdentityFile "$User@$HostName"
