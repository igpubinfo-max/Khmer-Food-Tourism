@echo off
title Build Web & Sync to Android Native Project
cd /d "%~dp0"

echo ===================================================================
echo     BUILDING WEB ASSETS AND SYNCING TO NATIVE ANDROID PROJECT
echo ===================================================================
echo.
echo Step 1: Compiling TypeScript and Vite Production Build...
call npm.cmd run build

echo.
echo Step 2: Syncing build assets to android/app/src/main/assets/public...
call npx.cmd cap sync android

echo.
echo ===================================================================
echo SUCCESS! Native Android project is now completely updated!
echo Location: %~dp0android
echo.
echo To build Android APK:
echo Option A: Open folder "%~dp0android" in Android Studio and click Build APK.
echo Option B: Run "cd android && gradlew.bat assembleDebug"
echo ===================================================================
pause
