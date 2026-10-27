@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ASTRO_TELEMETRY_DISABLED=1"
where node.exe >nul 2>nul
if errorlevel 1 goto missing
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing
where git.exe >nul 2>nul
if errorlevel 1 goto missing_git
if exist "node_modules\astro\astro.js" goto launch
call npm.cmd ci
if errorlevel 1 goto failed
:launch
call npm.cmd run writer
if errorlevel 1 goto failed
exit /b 0
:missing
echo Install Node.js 24 LTS, then try again.
pause
exit /b 1
:missing_git
echo Git is required. Install Git for Windows, then try again.
pause
exit /b 1
:failed
echo The publisher stopped. Read the message above. Your drafts stay local.
pause
exit /b 1
