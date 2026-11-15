@echo off
setlocal enabledelayedexpansion
title Cambodia Flavors ^& Tourism - PC Launcher

:: 1. Locate project root directory
set "PROJECT_DIR=%~dp0"
if exist "%PROJECT_DIR%package.json" goto :FOUND_DIR

set "PROJECT_DIR=F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\"
if exist "%PROJECT_DIR%package.json" goto :FOUND_DIR

echo [ERROR] Cannot locate KhmerFoodTourism project folder!
echo Please ensure package.json exists.
pause
exit /b 1

:FOUND_DIR
cd /d "%PROJECT_DIR%"

echo =========================================================================
echo    CAMBODIA FLAVORS ^& TOURISM (v2.7.0) - PC DESKTOP LAUNCHER
echo    រសជាតិ និងទេសចរណ៍កម្ពុជា - កម្មវិធីសម្រាប់កុំព្យូទ័រ
echo =========================================================================
echo.

:: 2. Check if Node.js & npm are installed
where node.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please install Node.js from https://nodejs.org/ to run this app.
    pause
    exit /b 1
)

:: 3. Check if dependencies are installed
if not exist "node_modules" (
    echo [Setup] First-time setup: Installing required packages...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 4. Check if Vite server is already listening on port 5173
netstat -ano 2>nul | findstr /R ":5173\>" | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/2] Local server is already running on port 5173.
    goto :OPEN_BROWSER
)

echo [1/2] Starting local server on http://127.0.0.1:5173 ...
start "Cambodia Flavors & Tourism Server" /min cmd /k "cd /d "%PROJECT_DIR%" && npm.cmd run dev -- --host 127.0.0.1 --port 5173"

:: Wait up to 12 seconds for the server to become ready
echo       Waiting for server to become ready...
for /L %%i in (1,1,12) do (
    netstat -ano 2>nul | findstr /R ":5173\>" | findstr LISTENING >nul 2>&1
    if !errorlevel! equ 0 goto :OPEN_BROWSER
    ping 127.0.0.1 -n 2 >nul
)

:OPEN_BROWSER
echo [2/2] Opening Cambodia Flavors ^& Tourism App...
set "APP_URL=http://127.0.0.1:5173/"

:: Launch in native standalone app mode (Google Chrome or Microsoft Edge)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=480,960
    goto :DONE
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=480,960
    goto :DONE
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --app=%APP_URL% --window-size=480,960
    goto :DONE
)

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=480,960
    goto :DONE
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%APP_URL% --window-size=480,960
    goto :DONE
)

:: Fallback to default browser
start "" "%APP_URL%"

:DONE
echo.
echo =========================================================================
echo   Cambodia Flavors ^& Tourism is now running on your PC!
echo   App URL: %APP_URL%
echo.
echo   To close the server when finished, run: Stop_App_On_PC.bat
echo =========================================================================
ping 127.0.0.1 -n 3 >nul
exit /b 0