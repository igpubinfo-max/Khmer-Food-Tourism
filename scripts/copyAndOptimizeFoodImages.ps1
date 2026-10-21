Add-Type -AssemblyName System.Drawing

$srcDir = "F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\Food"
$dstDir = "F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\public\foods"

if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    Write-Output "Created $dstDir"
}

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]85)

$totalOrig = 0
$totalNew = 0
$count = 0

for ($i = 1; $i -le 100; $i++) {
    $fileName = "food-$i.jpg"
    $srcPath = Join-Path $srcDir $fileName
    $dstPath = Join-Path $dstDir $fileName

    if (-not (Test-Path $srcPath)) {
        Write-Error "Missing source file: $srcPath"
        continue
    }

    $origItem = Get-Item $srcPath
    $totalOrig += $origItem.Length

    # Check if image needs optimization or can be copied directly
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $origWidth = $img.Width
    $origHeight = $img.Height

    $needsResize = ($origWidth -gt 1000) -or ($origItem.Length -gt 350KB)

    if ($needsResize) {
        $targetWidth = [math]::Min(1000, $origWidth)
        $targetHeight = [int](($origHeight * $targetWidth) / $origWidth)

        $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        $graph = [System.Drawing.Graphics]::FromImage($bmp)
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $graph.DrawImage($img, 0, 0, $targetWidth, $targetHeight)

        $img.Dispose()
        $bmp.Save($dstPath, $codec, $encoderParams)
        $bmp.Dispose()
        $graph.Dispose()
    } else {
        $img.Dispose()
        Copy-Item -Path $srcPath -Destination $dstPath -Force
    }

    $newItem = Get-Item $dstPath
    $totalNew += $newItem.Length
    $count++

    if ($i % 20 -eq 0 -or $i -eq 1 -or $i -eq 100) {
        Write-Output ("Processed [$i/100]: $fileName ($origWidth x $origHeight, " + [math]::Round($origItem.Length / 1KB, 1) + " KB -> " + [math]::Round($newItem.Length / 1KB, 1) + " KB)")
    }
}

Write-Output "========================================"
Write-Output "Successfully processed $count/100 food photos!"
Write-Output ("Original Total Size: " + [math]::Round($totalOrig / 1MB, 2) + " MB")
Write-Output ("Optimized Total Size: " + [math]::Round($totalNew / 1MB, 2) + " MB")
Write-Output ("Space Saved: " + [math]::Round(($totalOrig - $totalNew) / 1MB, 2) + " MB (" + [math]::Round((($totalOrig - $totalNew) / $totalOrig) * 100, 1) + "%)")
Write-Output "========================================"
