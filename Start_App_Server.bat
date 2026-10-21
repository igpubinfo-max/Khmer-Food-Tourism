@echo off
title Khmer Food and Tourism - Mobile App Dev Server
cd /d "%~dp0"

echo ===================================================================
echo     KHMER FOOD ^& TOURISM - MOBILE APPLICATION (ANDROID ^& iOS)
echo           អាហារ និងទេសចរណ៍ខ្មែរ - កម្មវិធីទូរស័ព្ទដៃ
echo ===================================================================
echo.
echo [1] Starting Vite Server on local machine and local Wi-Fi network...
echo [2] Web preview: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server anytime.
echo -------------------------------------------------------------------

call npm.cmd run dev -- --host
pause
