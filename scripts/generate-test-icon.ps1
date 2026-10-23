Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$artifactDir = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423"
$outMasterPng = Join-Path $artifactDir "master_new_icon_transparent.png"
$outAdaptiveFg = Join-Path $artifactDir "test_adaptive_foreground_432.png"
$outPreviewIcon = Join-Path $artifactDir "test_launcher_round_preview.png"

$srcBmp = New-Object System.Drawing.Bitmap($srcPath)
$w = $srcBmp.Width
$h = $srcBmp.Height

# Step 1: Create a 1024x1024 32-bit ARGB image with transparent corners
$masterBmp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gMaster = [System.Drawing.Graphics]::FromImage($masterBmp)
$gMaster.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMaster.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gMaster.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gMaster.Clear([System.Drawing.Color]::Transparent)

# Draw source image centered on 1024x1024
$targetY = [int]([Math]::Round((1024 - $h) / 2))
$gMaster.DrawImage($srcBmp, 0, $targetY, 1024, $h)
$gMaster.Dispose()

# Mask out the 4 corner black areas outside the rounded rectangle
# Corner radius is approximately 210px
$radius = 210
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $inCorner = $false
        $cx = 0; $cy = 0

        if ($x -lt $radius -and $y -lt $radius) {
            # Top-Left corner
            $inCorner = $true; $cx = $radius; $cy = $radius
        } elseif ($x -ge (1024 - $radius) -and $y -lt $radius) {
            # Top-Right corner
            $inCorner = $true; $cx = 1024 - $radius - 1; $cy = $radius
        } elseif ($x -lt $radius -and $y -ge (1024 - $radius)) {
            # Bottom-Left corner
            $inCorner = $true; $cx = $radius; $cy = 1024 - $radius - 1
        } elseif ($x -ge (1024 - $radius) -and $y -ge (1024 - $radius)) {
            # Bottom-Right corner
            $inCorner = $true; $cx = 1024 - $radius - 1; $cy = 1024 - $radius - 1
        }

        if ($inCorner) {
            $dist = [Math]::Sqrt([Math]::Pow($x - $cx, 2) + [Math]::Pow($y - $cy, 2))
            if ($dist -gt $radius) {
                # Outside the rounded corner: make transparent
                $masterBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            } elseif ($dist -gt ($radius - 1.5)) {
                # Smooth anti-aliased edge
                $alpha = [int]([Math]::Max(0, [Math]::Min(255, (1.0 - ($dist - ($radius - 1.5)) / 1.5) * 255)))
                $orig = $masterBmp.GetPixel($x, $y)
                $blendedAlpha = [int]([Math]::Round(($orig.A * $alpha) / 255))
                $masterBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($blendedAlpha, $orig.R, $orig.G, $orig.B))
            }
        }
    }
}

$masterBmp.Save($outMasterPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Master transparent icon saved: $outMasterPng"

# Step 2: Create adaptive icon foreground (432x432 for xxxhdpi)
# The safe zone is 72% of 432 = 312px
$fgBmp = New-Object System.Drawing.Bitmap(432, 432, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
$gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gFg.Clear([System.Drawing.Color]::Transparent)

$safeSize = 312
$safeOffset = [int]((432 - $safeSize) / 2)
$gFg.DrawImage($masterBmp, $safeOffset, $safeOffset, $safeSize, $safeSize)
$gFg.Dispose()
$fgBmp.Save($outAdaptiveFg, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Adaptive foreground saved: $outAdaptiveFg"

# Step 3: Create simulated launcher preview (on emerald #064E3B background with circular crop)
$previewBmp = New-Object System.Drawing.Bitmap(432, 432, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gPrev = [System.Drawing.Graphics]::FromImage($previewBmp)
$gPrev.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gPrev.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gPrev.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$emeraldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 6, 78, 59))
$gPrev.FillEllipse($emeraldBrush, 0, 0, 432, 432)
$gPrev.DrawImage($fgBmp, 0, 0, 432, 432)
$emeraldBrush.Dispose()
$gPrev.Dispose()

$previewBmp.Save($outPreviewIcon, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Preview launcher icon saved: $outPreviewIcon"

$srcBmp.Dispose()
$masterBmp.Dispose()
$fgBmp.Dispose()
$previewBmp.Dispose()
