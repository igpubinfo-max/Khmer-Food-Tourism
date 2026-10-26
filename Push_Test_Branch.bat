@echo off
title Push to GitHub (Android APK/AAB + iOS App Store + Website)
cd /d "%~dp0"

echo ===================================================================
echo     PUSHING TO GITHUB (ANDROID + iOS APP STORE + LIVE WEBSITE)
echo ===================================================================
echo.

echo Step 1: Saving any new code changes...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" add -A
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" diff --cached --quiet || "C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" commit -m "Update release build"

echo.
echo Step 2: Pushing to GitHub (test-ui-apk and main)...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push -u origin test-ui-apk
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push origin HEAD:main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Pushed to GitHub!
    echo 1. Android APK + AAB is building automatically!
    echo 2. iOS IPA is building and uploading to Apple App Store Connect!
    echo 3. Live Website (GitHub Pages) is updating automatically!
    echo.
    echo Download your Android APK / AAB in 2-3 minutes from:
    echo https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions/workflows/build-apk.yml
    echo ===================================================================
) else (
    echo Push failed. If asked, sign in with your GitHub account or Personal Access Token and try again.
)

pause
