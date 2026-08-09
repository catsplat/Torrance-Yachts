param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("LoginClientId", "LoginClientSecret", "WorkspaceClientId", "WorkspaceClientSecret")]
  [string]$Field
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env.local"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw ".env.local does not exist. Create it from .env.example first."
}

$value = (Get-Clipboard -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($value)) {
  throw "The clipboard is empty. Copy the Google credential and try again."
}

$mapping = @{
  LoginClientId         = "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID"
  LoginClientSecret     = "SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET"
  WorkspaceClientId     = "GOOGLE_OAUTH_CLIENT_ID"
  WorkspaceClientSecret = "GOOGLE_OAUTH_CLIENT_SECRET"
}

$isClientId = $Field.EndsWith("ClientId")
if ($isClientId -and $value -notmatch "^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$") {
  throw "The clipboard does not contain a Google OAuth client ID."
}

if (-not $isClientId -and $value -notmatch "^GOCSPX-[A-Za-z0-9_-]+$") {
  throw "The clipboard does not contain a Google OAuth client secret."
}

$key = $mapping[$Field]
$content = [System.IO.File]::ReadAllText($envPath)
$escapedKey = [Regex]::Escape($key)
$replacement = "$key=$value"

if ($content -match "(?m)^$escapedKey=.*$") {
  $content = [Regex]::Replace($content, "(?m)^$escapedKey=.*$", $replacement)
} else {
  $content = $content.TrimEnd() + [Environment]::NewLine + $replacement + [Environment]::NewLine
}

if ($Field -eq "LoginClientSecret") {
  if ($content -match "(?m)^GOOGLE_SIGN_IN_ENABLED=.*$") {
    $content = [Regex]::Replace($content, "(?m)^GOOGLE_SIGN_IN_ENABLED=.*$", "GOOGLE_SIGN_IN_ENABLED=true")
  } else {
    $content = $content.TrimEnd() + [Environment]::NewLine + "GOOGLE_SIGN_IN_ENABLED=true" + [Environment]::NewLine
  }
}

[System.IO.File]::WriteAllText($envPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Host "Stored $key in the ignored local environment file."

