@echo off
setlocal EnableDelayedExpansion
title Push Khmer Food & Tourism to GitHub (Android APK + iOS App Store + Website)
cd /d "%~dp0"

set "GIT_EXE=C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=git"
)

echo ===================================================================
echo     PUSHING KHMER FOOD & TOURISM (ANDROID + iOS + LIVE WEBSITE)
echo ===================================================================
echo.
echo Target Repository: https://github.com/igpubinfo-max/Khmer-Food-Tourism.git
echo.
echo Step 1: Staging and committing any changes...
"%GIT_EXE%" add -A
"%GIT_EXE%" diff --cached --quiet
if %ERRORLEVEL% neq 0 (
    "%GIT_EXE%" commit -m "Update release build (Android APK + iOS App Store)"
) else (
    echo No new uncommitted local file changes detected. Creating a build trigger commit...
    "%GIT_EXE%" commit --allow-empty -m "Trigger Android APK + iOS App Store release build"
)

echo.
echo Step 2: Syncing and pushing code to branch 'main' and 'test-ui-apk'...
"%GIT_EXE%" branch -f main HEAD 2>nul
"%GIT_EXE%" push -u origin test-ui-apk --force-with-lease
"%GIT_EXE%" push -u origin HEAD:main --force-with-lease

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Code has been pushed to GitHub!
    echo.
    echo 1. Android APK is building automatically (~2 mins):
    echo    https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v2.3.1/KhmerFoodTourism-v2.3.1.apk
    echo.
    echo 2. iOS IPA is building on macOS & auto-uploading to Apple App Store Connect / TestFlight!
    echo    https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions/workflows/build-ios.yml
    echo.
    echo 3. Live Website (GitHub Pages) is updating automatically!
    echo ===================================================================
) else (
    echo.
    echo If push failed, please make sure you entered your GitHub username 
    echo and Personal Access Token (PAT) correctly.
)

pause
