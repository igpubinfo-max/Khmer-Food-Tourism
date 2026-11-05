@echo off
setlocal
title Khmer Food ^& Tourism - 1. Create Android APK
set "REPO_DIR=%~dp0"
if not exist "%REPO_DIR%scripts\build-and-download-apk-aab.ps1" set "REPO_DIR=F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\"
cd /d "%REPO_DIR%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\build-and-download-apk-aab.ps1" -ApkOnly %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" goto :build_error
echo ======================================================================
echo   APK BUILD AND DOWNLOAD COMPLETED SUCCESSFULLY
echo ======================================================================
goto :done

:build_error
echo ======================================================================
echo   APK BUILD STOPPED WITH ERROR [Code: %EXIT_CODE%]
echo   If the download was interrupted, run this file again to RESUME.
echo ======================================================================

:done
pause
exit /b %EXIT_CODE%
