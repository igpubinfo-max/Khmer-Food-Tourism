@echo off
title Khmer Food and Tourism App
cd /d "%~dp0"

echo ===================================================================
echo     KHMER FOOD ^& TOURISM - PC LAUNCHER
echo ===================================================================
echo.

:: 1. Check if server is already running on port 5173
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting Khmer Food dev server...
    start "Khmer Food App Server" /min cmd /k "cd /d ""%~dp0"" && npm.cmd run dev"
    echo [2/3] Waiting for server to initialize...
    ping 127.0.0.1 -n 4 >nul
) else (
    echo [1/2] Server is already active on port 5173.
)

:: 2. Launch in Chrome Standalone Mobile App Window or Edge
echo [3/3] Opening App in Mobile Window...

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173/ --window-size=440,920
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173/ --window-size=440,920
) else (
    start http://localhost:5173/
)

echo.
echo ===================================================================
echo   Khmer Food App is ready!
echo ===================================================================
ping 127.0.0.1 -n 3 >nul
exit
