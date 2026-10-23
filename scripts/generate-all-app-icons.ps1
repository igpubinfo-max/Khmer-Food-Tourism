Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$projectRoot = "F:\Soft\System Program 2027 kimseng\KhmerFoodTourism"
$resDir = Join-Path $projectRoot "android\app\src\main\res"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcBmp = New-Object System.Drawing.Bitmap($srcPath)
$h = $srcBmp.Height

# Step 1: Create master 1024x1024 with transparent corners
$masterBmp = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($masterBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

$targetY = [int]([Math]::Round((1024 - $h) / 2))
$g.DrawImage($srcBmp, 0, $targetY, 1024, $h)
$g.Dispose()

# Mask out the 4 corner black areas outside the rounded rectangle (radius = 210)
$radius = 210
for ($y = 0; $y -lt 1024; $y++) {
    for ($x = 0; $x -lt 1024; $x++) {
        $inCorner = $false
        $cx = 0; $cy = 0

        if ($x -lt $radius -and $y -lt $radius) {
            $inCorner = $true; $cx = $radius; $cy = $radius
        } elseif ($x -ge (1024 - $radius) -and $y -lt $radius) {
            $inCorner = $true; $cx = 1024 - $radius - 1; $cy = $radius
        } elseif ($x -lt $radius -and $y -ge (1024 - $radius)) {
            $inCorner = $true; $cx = $radius; $cy = 1024 - $radius - 1
        } elseif ($x -ge (1024 - $radius) -and $y -ge (1024 - $radius)) {
            $inCorner = $true; $cx = 1024 - $radius - 1; $cy = 1024 - $radius - 1
        }

        if ($inCorner) {
            $dist = [Math]::Sqrt([Math]::Pow($x - $cx, 2) + [Math]::Pow($y - $cy, 2))
            if ($dist -gt $radius) {
                $masterBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            } elseif ($dist -gt ($radius - 1.5)) {
                $alpha = [int]([Math]::Max(0, [Math]::Min(255, (1.0 - ($dist - ($radius - 1.5)) / 1.5) * 255)))
                $orig = $masterBmp.GetPixel($x, $y)
                $blendedAlpha = [int]([Math]::Round(($orig.A * $alpha) / 255))
                $masterBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($blendedAlpha, $orig.R, $orig.G, $orig.B))
            }
        }
    }
}

# Helper: Resize image
function Resize-Image($src, $targetW, $targetH) {
    $dst = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $targetW, $targetH)
    $g.Dispose()
    return $dst
}

# Helper: Create circular icon
function Make-Circular($src, $size) {
    $dst = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()
    return $dst
}

# Helper: Create adaptive foreground (centered in 108dp canvas with safe zone padding)
function Make-AdaptiveForeground($src, $canvasSize, $scaleRatio = 0.72) {
    $dst = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $contentSize = [int]([Math]::Round($canvasSize * $scaleRatio))
    $offset = [int]([Math]::Round(($canvasSize - $contentSize) / 2))

    $g.DrawImage($src, $offset, $offset, $contentSize, $contentSize)
    $g.Dispose()
    return $dst
}

# Density definitions for Android
$densities = @(
    @{ Name = "mipmap-mdpi";    Launcher = 48;  Foreground = 108 },
    @{ Name = "mipmap-hdpi";    Launcher = 72;  Foreground = 162 },
    @{ Name = "mipmap-xhdpi";   Launcher = 96;  Foreground = 216 },
    @{ Name = "mipmap-xxhdpi";  Launcher = 144; Foreground = 324 },
    @{ Name = "mipmap-xxxhdpi"; Launcher = 192; Foreground = 432 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resDir $d.Name
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # 1. ic_launcher.png (legacy squircle)
    $launcherBmp = Resize-Image $masterBmp $d.Launcher $d.Launcher
    $launcherPath = Join-Path $dir "ic_launcher.png"
    $launcherBmp.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $launcherBmp.Dispose()

    # 2. ic_launcher_round.png (legacy round)
    $roundBmp = Make-Circular $masterBmp $d.Launcher
    $roundPath = Join-Path $dir "ic_launcher_round.png"
    $roundBmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    # 3. ic_launcher_foreground.png (adaptive foreground with 72% safe zone padding)
    $fgBmp = Make-AdaptiveForeground $masterBmp $d.Foreground 0.72
    $fgPath = Join-Path $dir "ic_launcher_foreground.png"
    $fgBmp.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Output "Generated icons for $($d.Name): Launcher=$($d.Launcher)x$($d.Launcher), Foreground=$($d.Foreground)x$($d.Foreground)"
}

# Generate 512x512 Play Store & Web Icon
$icon512 = Resize-Image $masterBmp 512 512
$publicIcon = Join-Path $projectRoot "public\icon.png"
$icon512.Save($publicIcon, [System.Drawing.Imaging.ImageFormat]::Png)

$playStoreIcon = Join-Path $projectRoot "android\app\src\main\play_store_assets\icon_512.png"
if (Test-Path (Split-Path $playStoreIcon)) {
    $icon512.Save($playStoreIcon, [System.Drawing.Imaging.ImageFormat]::Png)
}
$icon512.Dispose()

# Generate favicon.png
$favicon = Resize-Image $masterBmp 192 192
$publicFavicon = Join-Path $projectRoot "public\favicon.png"
$favicon.Save($publicFavicon, [System.Drawing.Imaging.ImageFormat]::Png)
$favicon.Dispose()

Write-Output "Successfully updated all Android launcher icons, adaptive assets, and public icons!"

$srcBmp.Dispose()
$masterBmp.Dispose()
