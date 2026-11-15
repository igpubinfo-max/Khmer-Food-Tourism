@echo off
setlocal enabledelayedexpansion
title Stop Cambodia Flavors ^& Tourism Server

echo =========================================================================
echo    STOPPING CAMBODIA FLAVORS ^& TOURISM SERVER (Port 5173)
echo =========================================================================
echo.

set "FOUND=0"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /R ":5173\>" ^| findstr LISTENING') do (
    echo Stopping server process (PID %%p)...
    taskkill /F /PID %%p >nul 2>&1
    set "FOUND=1"
)

if "%FOUND%"=="0" (
    echo No server is currently running on port 5173.
) else (
    echo Server on port 5173 has been stopped successfully.
)
ping 127.0.0.1 -n 3 >nul
exit /b 0