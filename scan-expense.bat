@echo off
cd /d "%~dp0"

set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe" set "NODE=%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe"

if not defined NODE (
  echo Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

"%NODE%" scripts\patch-expense-config.mjs
if errorlevel 1 (
  echo patch-expense-config failed.
  pause
  exit /b 1
)

"%NODE%" scripts\scan-expense-accounts.mjs
pause
exit /b %ERRORLEVEL%
