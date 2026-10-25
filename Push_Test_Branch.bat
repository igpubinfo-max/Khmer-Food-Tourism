@echo off
title Push TEST branch (test-ui-apk) to GitHub
cd /d "%~dp0"

echo ===================================================================
echo     PUSHING ONLY BRANCH test-ui-apk TO GITHUB (main is NOT touched)
echo ===================================================================
echo.
echo After the push: GitHub repo ^> Actions ^> "Build Android APK" ^> Run workflow
echo ^> choose branch test-ui-apk ^> wait for green ^> download the artifact
echo "Khmer-Food-Tourism-Release-Packages" (zip containing the APK).
echo.

"C:\Users\igpub\AppData\Local\MinGit\cmd\git.exe" push -u origin test-ui-apk

echo.
if %ERRORLEVEL% equ 0 (
    echo SUCCESS! Branch test-ui-apk was pushed.
) else (
    echo Push failed. If asked, sign in with your GitHub account or Personal Access Token and try again.
)

pause
