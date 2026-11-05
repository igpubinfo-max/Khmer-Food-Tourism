@echo off
setlocal
title Khmer Food ^& Tourism - Build Latest Android APK ^& Play Store AAB
set "REPO_DIR=%~dp0"
if not exist "%REPO_DIR%scripts\build-and-download-apk-aab.ps1" set "REPO_DIR=F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\"
cd /d "%REPO_DIR%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\build-and-download-apk-aab.ps1" %*
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
