@echo off
chcp 65001 > nul
title Pixel2D GameFi - Khởi Chạy Toàn Bộ Hệ Thống (3 Tầng)
cd /d "%~dp0"

echo ======================================================================
echo    🌾 PIXEL2D GAMEFI - KHỞI ĐỘNG HỆ SINH THÁI (3 TẦNG HOÀN CHỈNH) 🌾
echo ======================================================================
echo.

:: 1. Xác định lệnh pnpm phù hợp
where corepack >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PNPM_CMD=corepack pnpm
) else (
    set PNPM_CMD=pnpm
)

echo [1/4] Đang khởi động mạng Blockchain Hardhat Localhost (Port 8545)...
start "1. Pixel2D - Hardhat Local Node [Port 8545]" cmd /k "cd /d "%~dp0contracts" && title Hardhat Node [Port 8545] && %PNPM_CMD% exec hardhat node"

echo     Đang chờ Hardhat Node sẵn sàng (5 giây)...
timeout /t 5 /nobreak > nul

echo.
echo [2/4] Đang triển khai Smart Contracts lên mạng Localhost...
cd /d "%~dp0contracts"
call %PNPM_CMD% exec hardhat run scripts/deploy.ts --network localhost
if %ERRORLEVEL% NEQ 0 (
    echo [CẢNH BÁO] Chưa thể deploy contracts tự động.
    echo Vui lòng đảm bảo cửa sổ Hardhat Node đang chạy không có lỗi!
) else (
    echo [THÀNH CÔNG] Smart Contracts đã deploy và tự động xuất ABI sang Frontend!
)
cd /d "%~dp0"

echo.
echo [3/4] Đang khởi động Backend API & Web3 Signer Server (Port 4000)...
start "2. Pixel2D - Backend API & Signer [Port 4000]" cmd /k "cd /d "%~dp0backend" && title Backend API [Port 4000] && %PNPM_CMD% dev"

timeout /t 2 /nobreak > nul

echo.
echo [4/4] Đang khởi động Game Frontend dApp (Port 5173)...
start "3. Pixel2D - Frontend React 19 + Phaser [Port 5173]" cmd /k "cd /d "%~dp0front_end" && title Frontend Game [Port 5173] && %PNPM_CMD% dev"

timeout /t 3 /nobreak > nul

echo.
echo ======================================================================
echo    🎉 ĐÃ KHỞI CHẠY THÀNH CÔNG TOÀN BỘ 3 CỬA SỔ DỊCH VỤ!
echo ======================================================================
echo  1. Blockchain Node : http://127.0.0.1:8545  (ChainId: 31337)
echo  2. Backend API     : http://localhost:4000  (SQLite + Signer)
echo  3. Frontend Game   : http://localhost:5173  (React 19 + Phaser 4)
echo ======================================================================
echo.
echo Đang tự động mở trình duyệt tới Game...
start http://localhost:5173

echo.
echo Bấm phím bất kỳ để đóng cửa sổ khởi chạy này (3 cửa sổ dịch vụ vẫn tiếp tục chạy ngầm).
pause > nul
