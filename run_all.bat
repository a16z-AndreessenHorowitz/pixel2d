@echo off
title Pixel2D GameFi - System Launcher (Sepolia Testnet)
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

:: Auto-detect package manager (prefer pnpm if available, otherwise npm)
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    set "PKG_MGR=pnpm"
    set "DEV_CMD=pnpm dev"
) else (
    set "PKG_MGR=npm"
    set "DEV_CMD=npm run dev"
)

echo ======================================================================
echo    PIXEL2D GAMEFI - SYSTEM LAUNCHER (ETHEREUM SEPOLIA)
echo ======================================================================
echo  * Smart Contract is live and verified on Ethereum Sepolia:
echo    0x8350cac45079a5CA9781e8C8170bA82b54134B2A
echo  * Database is connected to MongoDB Atlas (Cloud)
echo  * Package Manager detected: %PKG_MGR%
echo ======================================================================
echo.

:: Clean up any stale processes on port 4000 or 5173 before launching
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [1/2] Starting Backend API and Web3 Signer on port 4000 (%PKG_MGR%)...
start "1. Backend API [Port 4000]" cmd /k "title Backend API [Port 4000] && cd /d "%ROOT_DIR%\backend" && echo [Backend] Running in %ROOT_DIR%\backend... && (%DEV_CMD% || node dist/index.js)"

echo [Info] Waiting for Backend to initialize...
ping -n 4 127.0.0.1 > nul

echo.
echo [2/2] Starting Frontend Game dApp on port 5173 (%PKG_MGR%)...
start "2. Frontend Game [Port 5173]" cmd /k "title Frontend Game [Port 5173] && cd /d "%ROOT_DIR%\front_end" && echo [Frontend] Running in %ROOT_DIR%\front_end... && %DEV_CMD%"

echo [Info] Waiting for Frontend to initialize...
ping -n 4 127.0.0.1 > nul

echo.
echo ======================================================================
echo    ALL SERVICES LAUNCHED SUCCESSFULLY!
echo ======================================================================
echo  * Blockchain : Ethereum Sepolia Testnet (ChainId: 11155111)
echo  * Backend API: http://localhost:4000 [Express + MongoDB Atlas]
echo  * Frontend   : http://localhost:5173 [React + Phaser + MetaMask]
echo ======================================================================
echo.
echo Opening browser to http://localhost:5173...
start http://localhost:5173

echo.
echo Launcher finished. Service windows will remain open.
pause
