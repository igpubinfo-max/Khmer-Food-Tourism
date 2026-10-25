@echo off
title Push TEST branch (test-ui-apk) to GitHub
cd /d "%~dp0"

echo ===================================================================
echo     PUSHING TEST BRANCH (test-ui-apk) TO GITHUB FOR APK BUILD
echo ===================================================================
echo.

echo Step 1: Saving any new code changes...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" add -A
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" diff --cached --quiet || "C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" commit -m "Update test APK build"

echo.
echo Step 2: Pushing branch test-ui-apk to GitHub...
"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push -u origin test-ui-apk

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Branch test-ui-apk was pushed to GitHub!
    echo GitHub Actions is now automatically building your Android APK!
    echo.
    echo Download your APK in 2-3 minutes from:
    echo https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions/workflows/build-apk.yml?query=branch%%3Atest-ui-apk
    echo ===================================================================
) else (
    echo Push failed. If asked, sign in with your GitHub account or Personal Access Token and try again.
)

pause
