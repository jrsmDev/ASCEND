@echo off
setlocal
title ASCEND - Evolve Beyond Your Limits

set "ROOT=%~dp0"
if not exist "%ROOT%data" mkdir "%ROOT%data"

echo.
echo  =====================================================================
echo        /\      ASCEND
echo       /  \     Evolve Beyond Your Limits
echo      / /\ \    
echo     /_/  \_\   Self-Hosted Fitness Tracker
echo  =====================================================================
echo.

if not exist "%ROOT%api\node_modules" (
    echo [*] Installing API dependencies...
    call npm --prefix "%ROOT%api" install
)

if not exist "%ROOT%frontend\node_modules" (
    echo [*] Installing Frontend dependencies...
    call npm --prefix "%ROOT%frontend" install
)

echo [*] Starting ASCEND API, app and website...
echo [*] App:     http://localhost:5173
echo [*] Website: http://localhost:5174
echo [*] Press Ctrl+C at any time to stop all three.
echo.

node "%ROOT%run-local.mjs"

endlocal
