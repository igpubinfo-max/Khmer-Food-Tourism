Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\igpub\.gemini\antigravity\brain\99e5a75e-66d8-483b-8911-48b6490d4423\.user_uploaded\media_1792741934240_9946a8cf.jpg"
$bmp = New-Object System.Drawing.Bitmap($srcPath)

for ($i = 0; $i -le 180; $i += 10) {
    $c = $bmp.GetPixel($i, $i)
    Write-Output "Diagonal ($i,$i): R=$($c.R), G=$($c.G), B=$($c.B)"
}

$bmp.Dispose()
