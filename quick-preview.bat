@echo off
echo Starting TranslateSutra Web Preview...
echo.
echo This will start a simple web server to preview the landing page.
echo.

REM Check if Python is available
python --version >nul 2>nul
if %errorlevel% equ 0 (
    echo Using Python HTTP server...
    cd web-landing
    echo Opening http://localhost:8000 in your browser...
    start http://localhost:8000
    python -m http.server 8000
    goto end
)

REM Check if Node.js is available
node --version >nul 2>nul
if %errorlevel% equ 0 (
    echo Node.js detected! Installing http-server...
    npm install -g http-server
    cd web-landing
    echo Opening http://localhost:8000 in your browser...
    start http://localhost:8000
    http-server -p 8000
    goto end
)

echo ERROR: Neither Python nor Node.js found.
echo Please install one of the following:
echo.
echo 1. Node.js from https://nodejs.org/ (Recommended)
echo 2. Python from https://python.org/
echo.
echo Then run this script again.
pause

:end