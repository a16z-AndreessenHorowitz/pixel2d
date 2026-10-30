@echo off
title Pixel2D GameFi - System Launcher
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"

echo ======================================================================
echo    PIXEL2D GAMEFI - 3-TIER SYSTEM LAUNCHER
echo ======================================================================
echo.

echo [1/4] Starting Hardhat Localhost Blockchain Node on port 8545...
start "1. Hardhat Node [Port 8545]" /d "%ROOT_DIR%contracts" cmd /k "call corepack pnpm exec hardhat node"

echo Waiting for Hardhat Node to initialize...
ping -n 6 127.0.0.1 > nul

echo.
echo [2/4] Deploying Smart Contracts to Localhost...
cd /d "%ROOT_DIR%contracts"
call corepack pnpm exec hardhat run scripts/deploy.ts --network localhost
cd /d "%ROOT_DIR%"

echo.
echo [3/4] Starting Backend API and Web3 Signer on port 4000...
start "2. Backend API [Port 4000]" /d "%ROOT_DIR%backend" cmd /k "call corepack pnpm dev"

ping -n 3 127.0.0.1 > nul

echo.
echo [4/4] Starting Frontend Game dApp on port 5173...
start "3. Frontend Game [Port 5173]" /d "%ROOT_DIR%front_end" cmd /k "call corepack pnpm dev"

ping -n 4 127.0.0.1 > nul

echo.
echo ======================================================================
echo    ALL 3 TIERS LAUNCHED SUCCESSFULLY!
echo ======================================================================
echo  1. Blockchain Node : http://127.0.0.1:8545  [ChainId: 31337]
echo  2. Backend API     : http://localhost:4000  [SQLite + Signer]
echo  3. Frontend Game   : http://localhost:5173  [React 19 + Phaser 4]
echo ======================================================================
echo.
echo Opening browser to http://localhost:5173...
start http://localhost:5173

echo.
echo Launcher finished. Three service windows will remain open.
pause
