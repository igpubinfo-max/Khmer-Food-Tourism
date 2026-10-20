@echo off
title Khmer Food & Tourism - Mobile App Dev Server
cd /d "%~dp0"

echo ===================================================================
echo     KHMER FOOD & TOURISM - MOBILE APPLICATION (ANDROID & iOS)
echo           អាហារ និងទេសចរណ៍ខ្មែរ - កម្មវិធីទូរស័ព្ទដៃ
echo ===================================================================
echo.
echo [1] Starting Vite Server on local machine and local Wi-Fi network...
echo [2] Web preview: http://localhost:5173
echo [3] On Android Phone (Same Wi-Fi): Check displayed IP (e.g. http://192.168.88.28:5173)
echo.
echo Press Ctrl+C to stop the server anytime.
echo -------------------------------------------------------------------

call npm.cmd run dev -- --host
pause
