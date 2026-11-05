@echo off
setlocal
title Khmer Food ^& Tourism - Build Latest Android APK (APK only, faster)
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-and-download-apk-aab.ps1" -ApkOnly %*
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" goto :build_error
echo ======================================================================
echo   APK BUILD AND DOWNLOAD COMPLETED SUCCESSFULLY
echo ======================================================================
goto :done
:build_error
echo ======================================================================
echo   BUILD STOPPED WITH ERROR [Code: %EXIT_CODE%]
echo   If the download was interrupted, just run this file again - it RESUMES.
echo ======================================================================
:done
pause
exit /b %EXIT_CODE%
