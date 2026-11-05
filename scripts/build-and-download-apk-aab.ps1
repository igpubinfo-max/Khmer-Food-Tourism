param(
    [switch]$DownloadOnly,
    [switch]$ForceNewBuild,
    [switch]$NoOpenExplorer
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Ensure Node.js and MinGit are in PATH even when launched from Desktop shortcut
$extraPaths = @(
    "C:\Program Files\nodejs",
    "$env:LOCALAPPDATA\MinGit\cmd",
    "C:\Program Files\Git\cmd"
)
foreach ($p in $extraPaths) {
    if ((Test-Path $p) -and ($env:PATH -notlike "*$p*")) {
        $env:PATH = "$p;$env:PATH"
    }
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$GitExe = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
if (-not (Test-Path $GitExe)) {
    $GitExe = "git"
}

$NpmExe = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $NpmExe)) {
    $NpmExe = "npm.cmd"
}

$CurlExe = "$env:SystemRoot\System32\curl.exe"
$OwnerRepo = "igpubinfo-max/Khmer-Food-Tourism"
$WorkflowFile = "build-apk.yml"
$OutDir = Join-Path $RepoRoot "Release_APK_AAB"
$ArchiveDir = Join-Path $OutDir "Old_Builds"
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

# Read GitHub token from git credential manager so API calls never hit rate limits
$GitHubToken = ""
try {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $credInput = "protocol=https`nhost=github.com`n`n"
    $credOutput = $credInput | & $GitExe credential fill 2>$null
    $ErrorActionPreference = $prevEAP
    $GitHubToken = (($credOutput | Where-Object { $_ -match '^password=' }) -replace '^password=', '').Trim()
} catch {
    $ErrorActionPreference = 'Stop'
}

function Invoke-GitQuiet {
    param([string[]]$GitArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & $GitExe @GitArgs 2>&1
        $code = $LASTEXITCODE
        return @{ Output = ($out -join "`n").Trim(); ExitCode = $code }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Write-Banner($text) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor White
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Get-LocalBuildInfo {
    $gradlePath = Join-Path $RepoRoot "android\app\build.gradle"
    $content = [System.IO.File]::ReadAllText($gradlePath, [System.Text.Encoding]::UTF8)
    $vc = 1291
    $vn = "2.5.0"
    if ($content -match 'versionCode\s+(\d+)') {
        $vc = [int]$Matches[1]
    }
    if ($content -match 'versionName\s+"([^"]+)"') {
        $vn = $Matches[1]
    }
    return @{ VersionCode = $vc; VersionName = $vn }
}

function Get-GitHubJson($url) {
    $headers = @{
        "User-Agent"    = "KhmerFoodTourism-Builder/2.0"
        "Accept"        = "application/vnd.github+json"
        "Cache-Control" = "no-cache"
    }
    if ($GitHubToken) {
        $headers["Authorization"] = "Bearer $GitHubToken"
    }
    return Invoke-RestMethod -Uri $url -Headers $headers -TimeoutSec 25
}

function ConvertTo-UtcDateTime($val) {
    if ($null -eq $val) { return [datetime]::MinValue }
    if ($val -is [datetime]) { return $val.ToUniversalTime() }
    return [datetime]::Parse(
        $val.ToString(),
        [System.Globalization.CultureInfo]::InvariantCulture,
        [System.Globalization.DateTimeStyles]::RoundtripKind
    ).ToUniversalTime()
}

function Invoke-FastAssetDownload([string]$url, [string]$outPath, [long]$expectedSize) {
    if ((Test-Path -LiteralPath $outPath) -and ($expectedSize -gt 0)) {
        $existingLen = (Get-Item -LiteralPath $outPath).Length
        if ($existingLen -eq $expectedSize) {
            $mb = [Math]::Round($existingLen / 1MB, 2)
            Write-Host "  Already downloaded and verified complete ($mb MB)." -ForegroundColor Cyan
            return
        }
    }

    $tempOutPath = "$outPath.part"
    $cleanUrl = $url -replace '\?.*$', ''
    $cb = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $downloadUrl = "${cleanUrl}?cb=$cb"

    if (Test-Path $CurlExe) {
        & $CurlExe -C - -L --http1.1 --fail --retry 5 --retry-delay 2 --connect-timeout 20 --progress-bar -H "Cache-Control: no-cache" -o $tempOutPath $downloadUrl
        if ($LASTEXITCODE -ne 0) {
            Remove-Item -LiteralPath $tempOutPath -Force -ErrorAction SilentlyContinue
            & $CurlExe -L --http1.1 --fail --retry 5 --retry-delay 2 --connect-timeout 20 --progress-bar -H "Cache-Control: no-cache" -o $tempOutPath $downloadUrl
            if ($LASTEXITCODE -ne 0) { throw "curl failed downloading asset from $cleanUrl" }
        }
    } else {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempOutPath -UseBasicParsing
    }
    Move-Item -LiteralPath $tempOutPath -Destination $outPath -Force
}

function Download-ReleasePackages([string]$versionName, [int]$displayBuildCode, [datetime]$minAssetTimeUtc) {
    Write-Banner "STEP 4: DOWNLOADING SIGNED APK & PLAY STORE AAB TO YOUR PC"

    $release = $null
    $apkAsset = $null
    $aabAsset = $null
    $effectiveMinTimeUtc = $minAssetTimeUtc.AddMinutes(-5)

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        try {
            $cb = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
            try {
                $release = Get-GitHubJson "https://api.github.com/repos/$OwnerRepo/releases/tags/v$versionName`?cb=$cb"
            } catch {
                $release = Get-GitHubJson "https://api.github.com/repos/$OwnerRepo/releases/latest?cb=$cb"
            }

            if ($release -and $release.assets) {
                $apkAsset = $release.assets | Where-Object { $_.name -like "*.apk" } | Sort-Object -Property updated_at -Descending | Select-Object -First 1
                $aabAsset = $release.assets | Where-Object { $_.name -like "*.aab" } | Sort-Object -Property updated_at -Descending | Select-Object -First 1
            }

            if ($apkAsset -and $aabAsset) {
                $apkUpdated = ConvertTo-UtcDateTime $apkAsset.updated_at
                $aabUpdated = ConvertTo-UtcDateTime $aabAsset.updated_at
                if (($apkUpdated -ge $effectiveMinTimeUtc) -and ($aabUpdated -ge $effectiveMinTimeUtc)) {
                    break
                }
                Write-Host "  Waiting for fresh release assets to finish uploading (attempt $attempt/10)..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  Waiting for GitHub Release CDN sync (attempt $attempt/10)..." -ForegroundColor Yellow
        }
        if ($attempt -lt 10) {
            Start-Sleep -Seconds 4
        }
    }

    if (-not $apkAsset -or -not $aabAsset) {
        throw "Could not find .apk and .aab assets on GitHub Release v$versionName."
    }

    $apkOutName = "CambodiaFlavorsTourism-v$versionName-Build$displayBuildCode.apk"
    $aabOutName = "CambodiaFlavorsTourism-v$versionName-PlayStore-Build$displayBuildCode.aab"
    $apkOutPath = Join-Path $OutDir $apkOutName
    $aabOutPath = Join-Path $OutDir $aabOutName

    # Move any older APK/AAB files out of Release_APK_AAB into Old_Builds so only the newest build is visible
    try {
        $oldPackages = Get-ChildItem -LiteralPath $OutDir -File | Where-Object {
            ($_.Extension -in @('.apk', '.aab')) -and ($_.Name -notin @($apkOutName, $aabOutName))
        }
        if ($oldPackages) {
            if (-not (Test-Path $ArchiveDir)) {
                New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
            }
            foreach ($oldFile in $oldPackages) {
                Move-Item -LiteralPath $oldFile.FullName -Destination (Join-Path $ArchiveDir $oldFile.Name) -Force
            }
        }
    } catch {}

    Write-Host ""
    Write-Host "  [1/2] Downloading Direct-Install Android APK ($apkOutName) [16x Turbo]..." -ForegroundColor Green
    Invoke-FastAssetDownload -url $apkAsset.browser_download_url -outPath $apkOutPath -expectedSize ([long]$apkAsset.size)

    Write-Host ""
    Write-Host "  [2/2] Downloading Google Play Store Bundle ($aabOutName) [16x Turbo]..." -ForegroundColor Green
    Invoke-FastAssetDownload -url $aabAsset.browser_download_url -outPath $aabOutPath -expectedSize ([long]$aabAsset.size)

    $apkFile = Get-Item -LiteralPath $apkOutPath
    $aabFile = Get-Item -LiteralPath $aabOutPath
    if ($apkFile.Length -lt 5MB -or $aabFile.Length -lt 5MB) {
        throw "Downloaded package size looks incomplete. Please check internet connection and retry."
    }

    # Also keep root, Desktop, and Downloads updated with latest APK
    try {
        $rootApkPath = Join-Path $RepoRoot "CambodiaFlavorsTourism-v$versionName.apk"
        Copy-Item -LiteralPath $apkOutPath -Destination $rootApkPath -Force
        if (Test-Path "$env:USERPROFILE\Desktop") {
            Copy-Item -LiteralPath $apkOutPath -Destination (Join-Path "$env:USERPROFILE\Desktop" "CambodiaFlavorsTourism-v$versionName.apk") -Force
        }
        if (Test-Path "$env:USERPROFILE\Downloads") {
            Copy-Item -LiteralPath $apkOutPath -Destination (Join-Path "$env:USERPROFILE\Downloads" "CambodiaFlavorsTourism-v$versionName.apk") -Force
            $dlReleaseDir = Join-Path "$env:USERPROFILE\Downloads" "Release_APK_AAB"
            if (-not (Test-Path $dlReleaseDir)) {
                New-Item -ItemType Directory -Path $dlReleaseDir -Force | Out-Null
            }
            Copy-Item -LiteralPath $apkOutPath -Destination (Join-Path $dlReleaseDir $apkOutName) -Force
            Copy-Item -LiteralPath $aabOutPath -Destination (Join-Path $dlReleaseDir $aabOutName) -Force
        }
    } catch {}

    $apkSizeMb = [Math]::Round($apkFile.Length / 1MB, 2)
    $aabSizeMb = [Math]::Round($aabFile.Length / 1MB, 2)

    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! YOUR LATEST APK & PLAY STORE AAB ARE READY!" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  Version      : v$versionName  (Build $displayBuildCode)" -ForegroundColor White
    Write-Host "  Folder       : $OutDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Direct Phone Install (.APK)  [$apkSizeMb MB]:" -ForegroundColor Yellow
    Write-Host "     $apkOutPath" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. Google Play Console (.AAB)   [$aabSizeMb MB]:" -ForegroundColor Yellow
    Write-Host "     $aabOutPath" -ForegroundColor White
    Write-Host "======================================================================" -ForegroundColor Green

    if (-not $NoOpenExplorer) {
        try {
            Start-Process explorer.exe -ArgumentList "/select,`"$apkOutPath`""
        } catch {}
    }
}

function Wait-ForGitHubWorkflow([string]$targetSha, [datetime]$notBeforeUtc) {
    Write-Banner "STEP 3: BUILDING SIGNED APK & AAB ON GITHUB CLOUD (~2.5 MINS)"
    Write-Host "  Watching Commit : $($targetSha.Substring(0, 7))" -ForegroundColor Cyan
    Write-Host "  Workflow Page   : https://github.com/$OwnerRepo/actions/workflows/$WorkflowFile" -ForegroundColor DarkGray
    Write-Host ""

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $matchedRun = $null

    while ($sw.Elapsed.TotalMinutes -lt 15) {
        $elapsedStr = "{0:mm\:ss}" -f $sw.Elapsed
        try {
            $cb = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
            $resp = Get-GitHubJson "https://api.github.com/repos/$OwnerRepo/actions/workflows/$WorkflowFile/runs?per_page=10&cb=$cb"
            $runs = @($resp.workflow_runs | Where-Object { $_.head_sha -eq $targetSha })
            if ($runs.Count -gt 0) {
                $matchedRun = $runs | Sort-Object -Property run_number -Descending | Select-Object -First 1
                $status = $matchedRun.status
                $conclusion = $matchedRun.conclusion
                $runNum = $matchedRun.run_number

                if ($status -eq "completed") {
                    Write-Host "`r  [$elapsedStr] Run #$runNum completed with result: $($conclusion.ToUpper())                    " -ForegroundColor Green
                    if ($conclusion -ne "success") {
                        Write-Host ""
                        Write-Host "  ERROR: Cloud build failed! Opening log URL:" -ForegroundColor Red
                        Write-Host "  $($matchedRun.html_url)" -ForegroundColor Yellow
                        try { Start-Process $matchedRun.html_url } catch {}
                        throw "GitHub Actions build #$runNum failed ($conclusion)."
                    }
                    return $matchedRun
                } else {
                    Write-Host "`r  [$elapsedStr] Cloud Run #$runNum is $status... (compiling & signing APK + AAB)   " -NoNewline -ForegroundColor Yellow
                }
            } else {
                Write-Host "`r  [$elapsedStr] Waiting for GitHub Cloud runner to pick up commit $($targetSha.Substring(0,7))...   " -NoNewline -ForegroundColor Cyan
            }
        } catch {
            if ($_.Exception.Message -like "GitHub Actions build*") { throw }
            Write-Host "`r  [$elapsedStr] Checking build status...                                           " -NoNewline -ForegroundColor DarkGray
        }
        Start-Sleep -Seconds 8
    }

    throw "Timed out after 15 minutes waiting for GitHub Actions build."
}

# ---------------------------------------------------------------------------
# MAIN FLOW
# ---------------------------------------------------------------------------
Write-Banner "KHMER FOOD & TOURISM - 1-CLICK APK & PLAY STORE AAB BUILDER"

$info = Get-LocalBuildInfo
$versionName = $info.VersionName
$localVC = $info.VersionCode

Write-Host "  Project Folder : $RepoRoot" -ForegroundColor Gray
Write-Host "  App Version    : v$versionName (Local Build Code: $localVC)" -ForegroundColor White

# Fetch origin/main and origin/test-ui-apk quietly so we can compare accurately
Write-Host "  Checking Git & Cloud Build status..." -ForegroundColor Cyan
$null = Invoke-GitQuiet @("fetch", "origin", "main", "test-ui-apk", "--quiet")

$headSha = (Invoke-GitQuiet @("rev-parse", "HEAD")).Output
$remoteMainSha = (Invoke-GitQuiet @("rev-parse", "origin/main")).Output
$remoteTestSha = (Invoke-GitQuiet @("rev-parse", "origin/test-ui-apk")).Output

# Check uncommitted app changes (ignore this helper script itself when deciding if app code changed)
$statusRes = Invoke-GitQuiet @("status", "--porcelain")
$rawStatus = @($statusRes.Output -split "`r?`n" | Where-Object { $_ })
$helperIgnoreRegex = '^.. "?(Build_APK_and_AAB\.bat|Build APK & Play Store AAB\.bat|Build APK and Play Store AAB\.bat|Push_Test_Branch\.bat|Push_To_GitHub\.bat|scripts/build-and-download-apk-aab\.ps1|\.gitignore|\.gitattributes)"?$'
$appDirtyLines = @($rawStatus | Where-Object { $_ -and ($_ -notmatch $helperIgnoreRegex) })

$hasAppChanges = ($appDirtyLines.Count -gt 0) -or ($headSha -ne $remoteMainSha)

# Ensure local and remote test-ui-apk stay synced with HEAD if already synced with main
if (-not $hasAppChanges -and $headSha -and $remoteTestSha -and ($headSha -ne $remoteTestSha)) {
    $null = Invoke-GitQuiet @("branch", "-f", "test-ui-apk", "HEAD")
    $null = Invoke-GitQuiet @("push", "-u", "origin", "HEAD:test-ui-apk", "--force-with-lease")
}

# Query latest GitHub Actions run across branches
$latestRunNumber = 391
$matchingHeadRun = $null
try {
    $runsResp = Get-GitHubJson "https://api.github.com/repos/$OwnerRepo/actions/workflows/$WorkflowFile/runs?per_page=10"
    if ($runsResp.workflow_runs -and $runsResp.workflow_runs.Count -gt 0) {
        $latestRunNumber = [int]($runsResp.workflow_runs[0].run_number)
        $matchingHeadRun = $runsResp.workflow_runs | Where-Object { $_.head_sha -eq $headSha } | Select-Object -First 1
    }
} catch {}

if ($DownloadOnly) {
    $effVC = [Math]::Max($localVC, 900 + $latestRunNumber)
    Download-ReleasePackages -versionName $versionName -displayBuildCode $effVC -minAssetTimeUtc ([datetime]::UtcNow.AddDays(-30))
    exit 0
}

# If there are NO new app changes and ForceNewBuild wasn't passed:
if (-not $hasAppChanges -and -not $ForceNewBuild) {
    if ($matchingHeadRun -and $matchingHeadRun.status -ne "completed") {
        Write-Host ""
        Write-Host "  A cloud build for your latest code ($($headSha.Substring(0,7))) is ALREADY running!" -ForegroundColor Green
        $doneRun = Wait-ForGitHubWorkflow -targetSha $headSha -notBeforeUtc ([datetime]::UtcNow.AddHours(-1))
        $effVC = [Math]::Max($localVC, 900 + [int]$doneRun.run_number)
        Download-ReleasePackages -versionName $versionName -displayBuildCode $effVC -minAssetTimeUtc ([datetime]::UtcNow.AddHours(-2))
        exit 0
    }

    if ($matchingHeadRun -and $matchingHeadRun.conclusion -eq "success") {
        $readyVC = [Math]::Max($localVC, 900 + [int]$matchingHeadRun.run_number)
        Write-Host ""
        Write-Host "  No new code changes detected since latest successful build (v$versionName Build $readyVC)." -ForegroundColor Green
        Write-Host "  [D] Download latest ready APK + Play Store AAB now (~10 sec)  [AUTO in 8s]" -ForegroundColor Cyan
        Write-Host "  [N] Bump Build Number & compile a brand-new APK + AAB (~2.5 min)" -ForegroundColor Yellow
        Write-Host ""

        $choice = 'D'
        if (-not [Console]::IsInputRedirected) {
            for ($sec = 8; $sec -ge 1; $sec--) {
                Write-Host "`r  Auto-selecting [D] in $sec sec... (Press D or N) " -NoNewline -ForegroundColor White
                for ($tick = 0; $tick -lt 10; $tick++) {
                    if ([Console]::KeyAvailable) {
                        $k = [Console]::ReadKey($true).KeyChar.ToString().ToUpperInvariant()
                        if ($k -eq 'D' -or $k -eq 'N') {
                            $choice = $k
                            $sec = 0
                            break
                        }
                    }
                    Start-Sleep -Milliseconds 100
                }
            }
            Write-Host ""
        }

        if ($choice -eq 'D') {
            Download-ReleasePackages -versionName $versionName -displayBuildCode $readyVC -minAssetTimeUtc ([datetime]::UtcNow.AddDays(-30))
            exit 0
        }
    }
}

# ---------------------------------------------------------------------------
# NEW BUILD PATH: Bump Build Code -> Verify Local Build -> Push -> Wait -> Download
# ---------------------------------------------------------------------------
$remoteVC = 0
$remoteGradleRes = Invoke-GitQuiet @("show", "origin/main:android/app/build.gradle")
if ($remoteGradleRes.ExitCode -eq 0 -and $remoteGradleRes.Output -match 'versionCode\s+(\d+)') {
    $remoteVC = [int]$Matches[1]
}

# Ensure new versionCode is strictly higher than local, remote, and GitHub Actions' (900 + run_number) formula
$minNextVC = [Math]::Max([Math]::Max($localVC, $remoteVC) + 1, 900 + $latestRunNumber + 2)
if ($localVC -gt $remoteVC -and $localVC -gt (900 + $latestRunNumber + 1) -and -not $ForceNewBuild) {
    $nextVC = $localVC
} else {
    $nextVC = $minNextVC
}

Write-Banner "STEP 1: UPDATING BUILD NUMBER TO $nextVC & VERIFYING CODE"

$gradleFile = Join-Path $RepoRoot "android\app\build.gradle"
$gradleText = [System.IO.File]::ReadAllText($gradleFile, [System.Text.Encoding]::UTF8)
$gradleText = [regex]::Replace($gradleText, 'versionCode\s+\d+', "versionCode $nextVC")
[System.IO.File]::WriteAllText($gradleFile, $gradleText, (New-Object System.Text.UTF8Encoding($false)))

$typesFile = Join-Path $RepoRoot "src\types\index.ts"
if (Test-Path $typesFile) {
    $todayIso = (Get-Date).ToString("yyyy-MM-dd")
    $typesText = [System.IO.File]::ReadAllText($typesFile, [System.Text.Encoding]::UTF8)
    $typesText = [regex]::Replace(
        $typesText,
        'export const APP_BUILD_CODE:\s*number\s*=[^;]+;',
        "export const APP_BUILD_CODE: number = typeof __KFT_BUILD_CODE__ === 'number' ? __KFT_BUILD_CODE__ : $nextVC;"
    )
    $typesText = [regex]::Replace(
        $typesText,
        "export const APP_RELEASE_DATE\s*=\s*'[^']+';",
        "export const APP_RELEASE_DATE = '$todayIso';"
    )
    [System.IO.File]::WriteAllText($typesFile, $typesText, (New-Object System.Text.UTF8Encoding($false)))
}

Write-Host "  Updated versionCode & APP_BUILD_CODE -> $nextVC" -ForegroundColor Green
Write-Host "  Running local production compile check (npm run build)..." -ForegroundColor Cyan

$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $NpmExe run build
$buildExitCode = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($buildExitCode -ne 0) {
    throw "Local 'npm run build' failed! Please ask AI to fix the TypeScript/Vite compile error above before building APK/AAB."
}
Write-Host "  Local production compile passed with 0 errors!" -ForegroundColor Green

Write-Banner "STEP 2: PUSHING CODE TO GITHUB CLOUD BUILDER"

$buildStartTimeUtc = [datetime]::UtcNow.AddSeconds(-10)

$null = Invoke-GitQuiet @("add", "-A")
$diffRes = Invoke-GitQuiet @("diff", "--cached", "--quiet")
if ($diffRes.ExitCode -ne 0) {
    $commitRes = Invoke-GitQuiet @("commit", "-m", "v$versionName (build $nextVC): Release Android APK & Play Store AAB")
} else {
    $commitRes = Invoke-GitQuiet @("commit", "--allow-empty", "-m", "v$versionName (build $nextVC): Trigger Android APK & Play Store AAB")
}
if ($commitRes.ExitCode -ne 0) {
    throw "Git commit failed: $($commitRes.Output)"
}

$newSha = (Invoke-GitQuiet @("rev-parse", "HEAD")).Output
$null = Invoke-GitQuiet @("branch", "-f", "main", "HEAD")
$null = Invoke-GitQuiet @("branch", "-f", "test-ui-apk", "HEAD")

Write-Host "  Pushing commit $($newSha.Substring(0,7)) to origin/main & origin/test-ui-apk..." -ForegroundColor Cyan
$pushMainRes = Invoke-GitQuiet @("push", "origin", "HEAD:main", "--force-with-lease")
$pushTestRes = Invoke-GitQuiet @("push", "-u", "origin", "HEAD:test-ui-apk", "--force-with-lease")
if ($pushMainRes.ExitCode -ne 0 -and $pushTestRes.ExitCode -ne 0) {
    throw "Git push to origin failed: $($pushMainRes.Output)"
}

# Keep current workspace branch synced quietly without ever throwing on git stderr output
$currentBranch = (Invoke-GitQuiet @("branch", "--show-current")).Output
if ($currentBranch -and $currentBranch -ne "main" -and $currentBranch -ne "test-ui-apk") {
    $null = Invoke-GitQuiet @("push", "-u", "origin", "HEAD:$currentBranch", "--force-with-lease")
}

$completedRun = Wait-ForGitHubWorkflow -targetSha $newSha -notBeforeUtc $buildStartTimeUtc
$finalBuildCode = [Math]::Max($nextVC, 900 + [int]$completedRun.run_number)

Download-ReleasePackages -versionName $versionName -displayBuildCode $finalBuildCode -minAssetTimeUtc $buildStartTimeUtc
exit 0
