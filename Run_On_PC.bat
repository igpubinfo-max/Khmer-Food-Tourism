@echo off
setlocal
title Cambodia Flavors ^& Tourism - PC Launcher

set "APP_DIR=F:\Soft\System Program 2027 kimseng\KhmerFoodTourism"
if not exist "%APP_DIR%\package.json" (
    set "APP_DIR=%~dp0"
)
cd /d "%APP_DIR%"

echo ===================================================================
echo     CAMBODIA FLAVORS ^& TOURISM (v2.7.0) - PC DESKTOP LAUNCHER
echo ===================================================================
echo.

:: 1. Ensure dependencies exist
if not exist "node_modules" (
    echo [Setup] Installing required packages...
    call npm.cmd install
)

:: 2. Check if Vite server is already listening on port 5173
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting Cambodia Flavors ^& Tourism local server on port 5173...
    start "Cambodia Flavors & Tourism Server" /min cmd /k "cd /d ""%APP_DIR%"" && npm.cmd run dev -- --host 127.0.0.1 --port 5173"
    echo [2/3] Waiting for server to become ready...
    for /L %%i in (1,1,15) do (
        netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
        if not errorlevel 1 goto :SERVER_READY
        ping 127.0.0.1 -n 2 >nul
    )
) else (
    echo [1/2] Server is already running on port 5173.
)

:SERVER_READY
echo [3/3] Opening Cambodia Flavors ^& Tourism App on PC...

set "APP_URL=http://127.0.0.1:5173/"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=440,920
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=440,920
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=440,920
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=440,920
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=440,920
) else (
    start "" "%APP_URL%"
)

echo.
echo ===================================================================
echo   Cambodia Flavors ^& Tourism is now running on your PC!
echo   URL: %APP_URL%
echo ===================================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0
