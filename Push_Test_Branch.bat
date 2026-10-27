@echo off
setlocal EnableDelayedExpansion
title Push to GitHub (Android APK/AAB + iOS App Store + Website)
cd /d "%~dp0"

set "GIT_EXE=C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe"
if not exist "%GIT_EXE%" (
    set "GIT_EXE=git"
)

echo ===================================================================
echo     PUSHING TO GITHUB (ANDROID + iOS APP STORE + LIVE WEBSITE)
echo ===================================================================
echo.

echo Step 1: Saving any new code changes...
"%GIT_EXE%" add -A
"%GIT_EXE%" diff --cached --quiet
if %ERRORLEVEL% neq 0 (
    "%GIT_EXE%" commit -m "Update release build"
) else (
    echo No new uncommitted local file changes detected. Creating a build trigger commit...
    "%GIT_EXE%" commit --allow-empty -m "Trigger release APK build"
)

echo.
echo Step 2: Syncing local 'main' branch and pushing to GitHub (test-ui-apk and main)...
"%GIT_EXE%" branch -f main HEAD 2>nul
"%GIT_EXE%" push -u origin test-ui-apk --force-with-lease
"%GIT_EXE%" push origin HEAD:main --force-with-lease

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Pushed to GitHub!
    echo 1. Android APK + AAB is building automatically!
    echo 2. iOS IPA is building and uploading to Apple App Store Connect!
    echo 3. Live Website (GitHub Pages) is updating automatically!
    echo.
    echo Direct APK Download Link (updates when build finishes in ~2 mins):
    echo https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v2.3.1/KhmerFoodTourism-v2.3.1.apk
    echo.
    echo GitHub Actions Build Status Page:
    echo https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions/workflows/build-apk.yml
    echo ===================================================================
) else (
    echo Push failed. If asked, sign in with your GitHub account or Personal Access Token and try again.
)

pause
