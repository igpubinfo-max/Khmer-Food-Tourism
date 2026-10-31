@echo off
setlocal
title Khmer Food ^& Tourism - Build Latest APK ^& Play Store AAB
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-and-download-apk-aab.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if %EXIT_CODE% neq 0 (
    echo ======================================================================
    echo   BUILD STOPPED WITH ERROR (Code: %EXIT_CODE%)
    echo   Please check the red message above.
    echo ======================================================================
)
pause
exit /b %EXIT_CODE%
