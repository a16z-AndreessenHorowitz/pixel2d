@echo off
chcp 65001 > nul
title Pixel2D GameFi - Dừng Toàn Bộ Dịch Vụ
cd /d "%~dp0"

echo ======================================================================
echo    🛑 PIXEL2D GAMEFI - DỪNG TẤT CẢ DỊCH VỤ (PORTS 8545, 4000, 5173) 🛑
echo ======================================================================
echo.

echo Đang đóng các tiến trình đang lắng nghe trên các cổng...

:: Port 8545 (Hardhat)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING') do (
    echo - Đang tắt Hardhat Node (PID: %%a)...
    taskkill /f /pid %%a >nul 2>nul
)

:: Port 4000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do (
    echo - Đang tắt Backend API (PID: %%a)...
    taskkill /f /pid %%a >nul 2>nul
)

:: Port 5173 (Frontend Vite)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo - Đang tắt Frontend Vite (PID: %%a)...
    taskkill /f /pid %%a >nul 2>nul
)

echo.
echo ======================================================================
echo    ✅ ĐÃ DỪNG TOÀN BỘ CÁC TIẾN TRÌNH THÀNH CÔNG!
echo ======================================================================
echo.
pause
