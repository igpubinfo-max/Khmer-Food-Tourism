@echo off
setlocal EnableDelayedExpansion
title Cambodia Flavors ^& Tourism - 4. Emergency Security ^& Recovery Center
set "REPO_DIR=%~dp0"
if not exist "%REPO_DIR%package.json" set "REPO_DIR=F:\Soft\System Program 2027 kimseng\KhmerFoodTourism\"
cd /d "%REPO_DIR%"
set "PATH=C:\Program Files\nodejs;%LOCALAPPDATA%\MinGit\cmd;C:\Program Files\Git\cmd;%PATH%"

:menu
cls
echo ===========================================================================
echo    CAMBODIA FLAVORS ^& TOURISM - EMERGENCY SECURITY ^& RECOVERY CENTER
echo    (Double-click anytime to Audit, Backup, Lock Out Hackers, or Restore)
echo ===========================================================================
echo.
echo   [1] EMERGENCY FULL RESCUE (Recommended if you suspect a Hacker attack)
echo       - Step A: Backup current Cloud Database to your PC (backups\users\)
echo       - Step B: Change Admin PIN (6 digits) ^& Password to lock out hacker
echo       - Step C: Run all 115 Security ^& Anti-Tamper Audit checks
echo.
echo   [2] Change Admin PIN ^& Admin Password Only (Instant Server Token Revoke)
echo   [3] Change Server API Keys (Google Places ^& Gemini AI Keys)
echo   [4] Backup Cloud Database to PC Now (Save Users, VIPs ^& Transactions)
echo   [5] Run Complete 115-Test Security ^& Code Integrity Audit Only
echo   [6] Restore Cloud Users from Snapshot (Copies SQL ^& opens Supabase)
echo   [7] Rebuild ^& Publish Emergency Force-Update APK + Play Store AAB
echo   [0] Exit
echo.
echo ===========================================================================
set "CHOICE="
set /p "CHOICE=Type a number [1-7 or 0] and press ENTER: "

if "%CHOICE%"=="1" goto :full_rescue
if "%CHOICE%"=="2" goto :rotate_admin
if "%CHOICE%"=="3" goto :rotate_apikeys
if "%CHOICE%"=="4" goto :backup_db
if "%CHOICE%"=="5" goto :run_audit
if "%CHOICE%"=="6" goto :restore_sql
if "%CHOICE%"=="7" goto :rebuild_release
if "%CHOICE%"=="0" exit /b 0
goto :menu

:full_rescue
echo.
echo ---------------------------------------------------------------------------
echo [STEP 1/3] Downloading Emergency Backup of Cloud Users, VIPs ^& Payments...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\userDataBackup.mjs" --force --allow-empty
echo.
echo ---------------------------------------------------------------------------
echo [STEP 2/3] Rotating Admin PIN (6 digits) ^& Admin Password on Server...
echo ---------------------------------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\setAdminSecrets.ps1"
echo.
echo ---------------------------------------------------------------------------
echo [STEP 3/3] Running All 115 Security, User-Data Safety ^& Unit Audit Tests...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\securityAuditTest.cjs"
node "%REPO_DIR%scripts\verifyUserDataSafety.mjs"
node "%REPO_DIR%scripts\unitTestSuite.cjs"
echo.
echo ===========================================================================
echo   EMERGENCY FULL RESCUE COMPLETED!
echo   If user data was tampered with, return to menu and choose Option [6].
echo ===========================================================================
pause
goto :menu

:rotate_admin
echo.
echo ---------------------------------------------------------------------------
echo Rotating Admin PIN (6 digits) ^& Admin Password on Supabase Server...
echo ---------------------------------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\setAdminSecrets.ps1"
echo.
echo Testing new Admin login ^& database write protection...
node "%REPO_DIR%scripts\adminSecurityTool.mjs" test
pause
goto :menu

:rotate_apikeys
echo.
echo ---------------------------------------------------------------------------
echo Rotating Server API Keys (Google Places ^& Gemini AI)...
echo ---------------------------------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\setApiKeys.ps1"
pause
goto :menu

:backup_db
echo.
echo ---------------------------------------------------------------------------
echo Backing up Cloud Users, VIP Registry ^& Transactions to backups\users\...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\userDataBackup.mjs" --force --allow-empty
if exist "%REPO_DIR%backups\users" explorer.exe "%REPO_DIR%backups\users"
echo.
echo Backup completed and folder opened in Windows Explorer!
pause
goto :menu

:run_audit
echo.
echo ---------------------------------------------------------------------------
echo [1/4] Running 67-Check Security ^& Integrity Audit...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\securityAuditTest.cjs"
echo.
echo ---------------------------------------------------------------------------
echo [2/4] Running 26-Check User Data Safety ^& Anti-Wipe Guard Audit...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\verifyUserDataSafety.mjs"
echo.
echo ---------------------------------------------------------------------------
echo [3/4] Running 22-Suite Core Application Unit Tests...
echo ---------------------------------------------------------------------------
node "%REPO_DIR%scripts\unitTestSuite.cjs"
echo.
echo ---------------------------------------------------------------------------
echo [4/4] Checking Git Repository Status ^& Recent Commits...
echo ---------------------------------------------------------------------------
git status -s
git log -n 5 --oneline
echo.
echo ===========================================================================
echo   ALL 115 SECURITY ^& QUALITY CHECKS COMPLETED!
echo ===========================================================================
pause
goto :menu

:restore_sql
echo.
echo ---------------------------------------------------------------------------
echo Copying SQL Restore Command to Clipboard ^& Opening Supabase SQL Editor...
echo ---------------------------------------------------------------------------
echo SELECT public.kft_restore_users_from_snapshot();| clip
start "" "https://supabase.com/dashboard/project/ryvltobwuwuulazqjnza/sql/new"
echo.
echo [DONE] The SQL command below has been COPIED to your Clipboard:
echo.
echo     SELECT public.kft_restore_users_from_snapshot();
echo.
echo In the browser tab that just opened:
echo   1. Press Ctrl + V to paste the command into the SQL Editor
echo   2. Click the green "Run" button to restore all user ^& VIP records!
echo.
pause
goto :menu

:rebuild_release
echo.
echo ---------------------------------------------------------------------------
echo Building ^& Downloading Fresh Signed APK ^& Google Play AAB (+ iOS Release)...
echo ---------------------------------------------------------------------------
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REPO_DIR%scripts\build-and-download-apk-aab.ps1"
pause
goto :menu
