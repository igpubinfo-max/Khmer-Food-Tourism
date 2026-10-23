Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

$topNonBlackMin = -1
$topNonBlackMax = -1

for ($x = 0; $x -lt $bmp.Width; $x++) {
    $c = $bmp.GetPixel($x, 0)
    if (($c.R + $c.G + $c.B) -gt 25) {
        if ($topNonBlackMin -eq -1) { $topNonBlackMin = $x }
        $topNonBlackMax = $x
    }
}

Write-Output "Top row (y=0) non-black X range: [$topNonBlackMin, $topNonBlackMax]"

$leftNonBlackMin = -1
$leftNonBlackMax = -1
for ($y = 0; $y -lt $bmp.Height; $y++) {
    $c = $bmp.GetPixel(0, $y)
    if (($c.R + $c.G + $c.B) -gt 25) {
        if ($leftNonBlackMin -eq -1) { $leftNonBlackMin = $y }
        $leftNonBlackMax = $y
    }
}
Write-Output "Left column (x=0) non-black Y range: [$leftNonBlackMin, $leftNonBlackMax]"

$bmp.Dispose()
