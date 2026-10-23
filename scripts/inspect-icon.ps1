Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

$c00 = $bmp.GetPixel(0, 0)
$cTopMid = $bmp.GetPixel(512, 10)
$cBotMid = $bmp.GetPixel(512, 1000)
$cCenter = $bmp.GetPixel(512, 508)
$cCorner10 = $bmp.GetPixel(10, 10)

Write-Output "Pixel at (0,0): R=$($c00.R), G=$($c00.G), B=$($c00.B)"
Write-Output "Pixel at (10,10): R=$($cCorner10.R), G=$($cCorner10.G), B=$($cCorner10.B)"
Write-Output "Pixel at top-mid (512,10): R=$($cTopMid.R), G=$($cTopMid.G), B=$($cTopMid.B)"
Write-Output "Pixel at bottom-mid (512,1000): R=$($cBotMid.R), G=$($cBotMid.G), B=$($cBotMid.B)"
Write-Output "Pixel at center (512,508): R=$($cCenter.R), G=$($cCenter.G), B=$($cCenter.B)"

$bmp.Dispose()
