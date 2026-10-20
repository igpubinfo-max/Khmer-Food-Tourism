@echo off
title Push Khmer Food & Tourism to GitHub
cd /d "%~dp0"

echo ===================================================================
echo     PUSHING KHMER FOOD & TOURISM PROJECT TO GITHUB
echo ===================================================================
echo.
echo Target Repository: https://github.com/igpubinfo-max/Khmer-Food-Tourism.git
echo.
echo Step 1: Pushing code to branch 'main'...
echo (If prompted, please sign in with your GitHub browser window or Personal Access Token)
echo.

"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================================
    echo SUCCESS! Code has been successfully pushed to GitHub!
    echo.
    echo GitHub Actions is now automatically building your Android APK!
    echo Visit your Actions page to watch the build and download APK:
    echo https://github.com/igpubinfo-max/Khmer-Food-Tourism/actions
    echo ===================================================================
) else (
    echo.
    echo If push failed, please make sure you entered your GitHub username 
    echo and Personal Access Token (PAT) correctly.
)

pause
