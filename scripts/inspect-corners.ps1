Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

$w = $bmp.Width
$h = $bmp.Height

Write-Output "Top-Right corner:"
for ($i = 0; $i -le 80; $i += 10) {
    $c = $bmp.GetPixel($w - 1 - $i, $i)
    Write-Output "($($w-1-$i),$i): R=$($c.R), G=$($c.G), B=$($c.B)"
}

Write-Output "Bottom-Left corner:"
for ($i = 0; $i -le 80; $i += 10) {
    $c = $bmp.GetPixel($i, $h - 1 - $i)
    Write-Output "($i,$($h-1-$i)): R=$($c.R), G=$($c.G), B=$($c.B)"
}

Write-Output "Bottom-Right corner:"
for ($i = 0; $i -le 80; $i += 10) {
    $c = $bmp.GetPixel($w - 1 - $i, $h - 1 - $i)
    Write-Output "($($w-1-$i),$($h-1-$i)): R=$($c.R), G=$($c.G), B=$($c.B)"
}

$bmp.Dispose()
