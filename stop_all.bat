@echo off
title Pixel2D GameFi - Stop All Services
cd /d "%~dp0"

echo ======================================================================
echo    STOPPING ALL PIXEL2D SERVICES ON PORTS 8545, 4000, 5173
echo ======================================================================
echo.

echo Terminating processes on port 8545, 4000, 5173...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING') do (
    echo - Stopping Hardhat Node [PID: %%a]
    taskkill /f /pid %%a >nul 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do (
    echo - Stopping Backend API [PID: %%a]
    taskkill /f /pid %%a >nul 2>nul
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo - Stopping Frontend Vite [PID: %%a]
    taskkill /f /pid %%a >nul 2>nul
)

echo.
echo ======================================================================
echo    ALL SERVICES STOPPED SUCCESSFULLY!
echo ======================================================================
echo.
pause
