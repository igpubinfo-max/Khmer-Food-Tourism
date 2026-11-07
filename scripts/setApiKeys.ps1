# Sets the Google Maps (Places) and Gemini keys as Supabase secrets WITHOUT echoing them or putting them in chat / on a command line.
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\setApiKeys.ps1     (press ENTER to skip a key you do not want to change)
$ErrorActionPreference = 'Stop'
$ref = 'ryvltobwuwuulazqjnza'

function Read-Secret([string]$prompt) {
  $s = Read-Host -Prompt $prompt -AsSecureString
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

$maps = Read-Secret 'GOOGLE_MAPS_API_KEY (new Places key, starts with AIza; ENTER to skip)'
$gem  = Read-Secret 'GEMINI_API_KEY (new Gemini key; ENTER to skip)'
if ($maps -and $maps -notmatch '^AIza[0-9A-Za-z_\-]{30,}$') { throw 'That does not look like a Google Maps API key (AIza...).' }
if ($gem -and $gem.Length -lt 20) { throw 'That does not look like a Gemini API key.' }
if (-not $maps -and -not $gem) { Write-Host 'Nothing to set.'; return }

$envFile = Join-Path $env:TEMP ("kft_keys_" + [guid]::NewGuid().ToString('N') + '.env')
try {
  $lines = @()
  if ($maps) { $lines += "GOOGLE_MAPS_API_KEY=$maps" }
  if ($gem)  { $lines += "GEMINI_API_KEY=$gem" }
  [IO.File]::WriteAllText($envFile, ($lines -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
  npx.cmd --yes supabase@latest secrets set --env-file $envFile --project-ref $ref
  if ($LASTEXITCODE -ne 0) { throw 'supabase secrets set failed (run: npx.cmd supabase login)' }
  Write-Host "`nDone. Keys stored as Supabase secrets. Now run:  node scripts\smokeTestEdge.mjs" -ForegroundColor Green
} finally {
  if (Test-Path $envFile) { Remove-Item $envFile -Force }
  $maps = $null; $gem = $null
}
