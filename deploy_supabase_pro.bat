@echo off
REM ======================================================================================
REM  Cambodia Flavors & Tourism - deploy the secure Supabase Edge Functions (one click)
REM    food-ai       : Gemini (+ optional OpenAI fail-over) gateway, daily quotas, VIP check
REM    places-proxy  : Google Places gateway with server-side cache + daily quotas
REM  Keys are typed here ONCE and stored only as Supabase secrets (never in the app / git).
REM ======================================================================================
setlocal
cd /d "%~dp0"
set PROJECT_REF=ryvltobwuwuulazqjnza
set SB=npx.cmd --yes supabase@latest

echo.
echo [1/5] Login to Supabase (a browser window opens - approve it).
call %SB% login
if errorlevel 1 goto :fail

echo.
echo [2/5] Secrets. Press ENTER to skip any key you do not want to change.
echo       (Use a NEW Google Maps key with billing + restriction to "Places API (New)" only,
echo        and a NEW Gemini key - the old ones were shipped inside earlier app builds.)
set /p GKEY=GOOGLE_MAPS_API_KEY  (new Places key): 
if not "%GKEY%"=="" call %SB% secrets set GOOGLE_MAPS_API_KEY=%GKEY% --project-ref %PROJECT_REF%
set /p AKEY=GEMINI_API_KEY       (new Gemini key): 
if not "%AKEY%"=="" call %SB% secrets set GEMINI_API_KEY=%AKEY% --project-ref %PROJECT_REF%
set /p OKEY=OPENAI_API_KEY      (optional fail-over, ENTER to skip): 
if not "%OKEY%"=="" call %SB% secrets set OPENAI_API_KEY=%OKEY% --project-ref %PROJECT_REF%
set GKEY=
set AKEY=
set OKEY=

echo.
echo [3/5] Deploy functions.
call %SB% functions deploy food-ai --no-verify-jwt --project-ref %PROJECT_REF%
if errorlevel 1 goto :fail
call %SB% functions deploy places-proxy --no-verify-jwt --project-ref %PROJECT_REF%
if errorlevel 1 goto :fail

echo.
echo [4/5] Smoke test (costs a few cents at most).
node scripts\smokeTestEdge.mjs

echo.
echo [5/5] Done. Next: run supabase_pro_platform_v1.sql in the Supabase SQL Editor (once),
echo       then see docs\SUPABASE_PRO_SETUP.md for the optional switches.
goto :end

:fail
echo.
echo *** A step failed - nothing else was changed. Read the message above, fix it and run again. ***
:end
pause
endlocal
