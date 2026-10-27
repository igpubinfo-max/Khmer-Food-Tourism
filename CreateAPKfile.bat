@echo off
title Create & Push APK File to GitHub (Fast APK Only)
cd /d "%~dp0"

echo ===================================================================
echo     PUSHING TO GITHUB TO BUILD ANDROID .APK FILE (FAST APK ONLY)
echo ===================================================================
echo.

echo Step 1: Staging and committing latest code changes...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" add -A
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" diff --cached --quiet || "C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" commit -m "Build fast Android APK release (overheat fix & Google Maps improvements)"

echo.
echo Step 2: Pushing to GitHub to trigger Fast APK-Only Build...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push -u origin test-ui-apk
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push origin HEAD:main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Pushed to GitHub!
    echo.
    echo GitHub Actions is now building ONLY your .APK file (no .AAB bundle)
    echo for fast compilation and fast download!
    echo.
    echo Download KhmerFoodTourism-v2.3.1.apk when the build finishes:
    echo   1. Actions Artifact: https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions/workflows/build-apk.yml
    echo   2. Direct Release:   https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/tag/v2.3.1
    echo ===================================================================
) else (
    echo Push failed. If asked, sign in with your GitHub account or Personal Access Token and try again.
)

pause
