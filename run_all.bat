@echo off
title Pixel2D GameFi - System Launcher (Sepolia Testnet)
cd /d "%~dp0"
set "ROOT_DIR=%~dp0"

echo ======================================================================
echo    PIXEL2D GAMEFI - SYSTEM LAUNCHER (ETHEREUM SEPOLIA)
echo ======================================================================
echo  * Smart Contract is live & verified on Ethereum Sepolia:
echo    0x8350cac45079a5CA9781e8C8170bA82b54134B2A
echo  * Database is connected to MongoDB Atlas (Cloud)
echo ======================================================================
echo.

echo [1/2] Starting Backend API and Web3 Signer on port 4000...
start "1. Backend API [Port 4000]" /d "%ROOT_DIR%backend" cmd /k "call pnpm dev"

ping -n 3 127.0.0.1 > nul

echo.
echo [2/2] Starting Frontend Game dApp on port 5173...
start "2. Frontend Game [Port 5173]" /d "%ROOT_DIR%front_end" cmd /k "call pnpm dev"

ping -n 3 127.0.0.1 > nul

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
