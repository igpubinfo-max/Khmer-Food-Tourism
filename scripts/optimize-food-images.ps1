param(
    [int]$MaxSide = 720,
    [int]$Quality = 72,
    [string]$Folder = "public\foods"
)
# Shrinks bundled food photos so the Android APK/AAB stays small and downloads fast.
# Originals are backed up once to backups\foods_original (git-ignored).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$RepoRoot = Split-Path -Parent $PSScriptRoot
$src = Join-Path $RepoRoot $Folder
$backup = Join-Path $RepoRoot "backups\foods_original"
if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Path $backup -Force | Out-Null }

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)

$before = 0L; $after = 0L; $changed = 0
foreach ($file in Get-ChildItem -LiteralPath $src -File -Include *.jpg, *.jpeg -Recurse) {
    $before += $file.Length
    $bk = Join-Path $backup $file.Name
    if (-not (Test-Path -LiteralPath $bk)) { Copy-Item -LiteralPath $file.FullName -Destination $bk }

    # Always re-encode from the untouched original to avoid repeated JPEG quality loss
    $bytes = [System.IO.File]::ReadAllBytes($bk)
    $ms = New-Object System.IO.MemoryStream(, $bytes)
    $img = [System.Drawing.Image]::FromStream($ms)
    try {
        $scale = [Math]::Min(1.0, $MaxSide / [double][Math]::Max($img.Width, $img.Height))
        $w = [int][Math]::Round($img.Width * $scale)
        $h = [int][Math]::Round($img.Height * $scale)
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $outMs = New-Object System.IO.MemoryStream
        $bmp.Save($outMs, $codec, $encParams)
        $bmp.Dispose()
        $newBytes = $outMs.ToArray()
    } finally {
        $img.Dispose(); $ms.Dispose()
    }

    if ($newBytes.Length -lt ($file.Length * 0.9)) {
        [System.IO.File]::WriteAllBytes($file.FullName, $newBytes)
        $after += $newBytes.Length
        $changed++
    } else {
        $after += $file.Length
    }
}
"{0} images optimized. {1:N1} MB -> {2:N1} MB" -f $changed, ($before / 1MB), ($after / 1MB)
