@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if errorlevel 1 goto folder_error
set "ASTRO_TELEMETRY_DISABLED=1"
where node.exe >nul 2>nul
if errorlevel 1 goto node_missing
where npm.cmd >nul 2>nul
if errorlevel 1 goto node_missing
if exist "node_modules\astro\astro.js" goto start_preview

echo Installing dependencies. Internet access is required...
call npm.cmd ci
if errorlevel 1 goto install_error

:start_preview
echo.
echo Open the Local URL printed below in your browser.
echo Keep this window open. Press Ctrl+C to stop the preview.
echo.
call npm.cmd run dev
if errorlevel 1 goto preview_error
exit /b 0

:node_missing
echo Node.js or npm was not found.
echo Install Node.js 24 LTS from https://nodejs.org/ and try again.
pause
exit /b 1

:install_error
echo Dependency installation failed. Check your network and try again.
pause
exit /b 1

:preview_error
echo Preview stopped or failed. Check the message above.
pause
exit /b 1

:folder_error
echo Could not open the project folder.
pause
exit /b 1
