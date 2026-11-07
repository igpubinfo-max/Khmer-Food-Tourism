# Sets the Admin PIN + password as Supabase secrets WITHOUT echoing them or putting them on a command line.
# Usage (PowerShell, from the project folder):   .\scripts\setAdminSecrets.ps1
$ErrorActionPreference = 'Stop'
$ref = 'ryvltobwuwuulazqjnza'

function Read-Secret([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

$pin = Read-Secret 'NEW Admin PIN (exactly 6 digits)'
if ($pin -notmatch '^\d{6}$') { throw 'The PIN must be exactly 6 digits.' }
if ($pin -match '^(\d)\1{5}$' -or $pin -in @('123456', '654321', '000000', '111111', '123123')) { throw 'Choose a less obvious PIN.' }
$pin2 = Read-Secret 'Repeat the PIN'
if ($pin -ne $pin2) { throw 'The two PINs differ.' }

$pw = Read-Secret 'NEW Admin password (at least 12 characters, not used anywhere else)'
if ($pw.Length -lt 12) { throw 'The password must be at least 12 characters.' }
if ($pw -match 'CheaSavuth|Admin@KhmerFood') { throw 'Do not reuse the old built-in password.' }
$pw2 = Read-Secret 'Repeat the password'
if ($pw -ne $pw2) { throw 'The two passwords differ.' }

$envFile = Join-Path $env:TEMP ("kft_admin_secrets_" + [guid]::NewGuid().ToString('N') + '.env')
try {
  # --env-file keeps special characters intact and keeps the values off the process command line
  [IO.File]::WriteAllText($envFile, "ADMIN_PIN=$pin`nADMIN_PASSWORD=$pw`n", (New-Object Text.UTF8Encoding $false))
  npx.cmd --yes supabase@latest secrets set --env-file $envFile --project-ref $ref
  if ($LASTEXITCODE -ne 0) { throw 'supabase secrets set failed (are you logged in? run: npx.cmd supabase login)' }
  Write-Host "`nDone. ADMIN_PIN and ADMIN_PASSWORD are stored as Supabase secrets." -ForegroundColor Green
} finally {
  if (Test-Path $envFile) { Remove-Item $envFile -Force }
  $pin = $null; $pin2 = $null; $pw = $null; $pw2 = $null
}
