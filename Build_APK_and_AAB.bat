@echo off
setlocal
title Khmer Food ^& Tourism - Build Latest Android APK ^& Play Store AAB         
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-and-download-apk-aab.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" goto :build_error
echo ======================================================================
echo   BUILD AND DOWNLOAD COMPLETED SUCCESSFULLY
echo ======================================================================
goto :done
:build_error
echo ======================================================================
echo   BUILD STOPPED WITH ERROR [Code: %EXIT_CODE%]
echo   Please check the red message above.
echo ======================================================================
:done
pause
exit /b %EXIT_CODE%
