# BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN PIXEL2D GAMEFI (v3.0 - 6 PHASES)

> **Dự án**: Pixel2D GameFi - Nông Trại 2D Blockchain  
> **Cập nhật lần cuối**: 29/10/2026 (Phiên bản v3.0 - Kiến trúc 3 tầng: Frontend + Backend Express + Hardhat Contracts)

---

## 1. TIẾN ĐỘ TỔNG THỂ THEO 6 GIAI ĐOẠN

| Giai đoạn | Nội dung chính | Trạng thái | Tỷ lệ hoàn thành |
| :--- | :--- | :---: | :---: |
| **Giai đoạn 0** | Khảo sát hiện trạng, Cập nhật tài liệu kiến trúc 3 tầng v3.0 | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 1** | Tạo nhánh Git `feat/blockchain-gamefi` & Fix lỗi nền tảng Frontend | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 2** | Hoàn thiện Gameplay & Tích hợp Câu Cá từ `origin/Fishing` | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 3** | Xây dựng Backend API (`backend/`), Shop Hạt Giống & Web3 Signer | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 4** | Xây dựng & Unit Test Smart Contracts (`contracts/`) | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 5** | Tích hợp Frontend: MetaMask, Shop, Claim Token & Buff Phaser | **HOÀN THÀNH** | **100%** |
| **Giai đoạn 6** | Deploy Testnet (Sepolia/Amoy) & Kịch bản Demo Đồ Án | **HOÀN THÀNH** | **100%** |

---

## 2. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 1 (ĐÃ HOÀN THÀNH)

- [x] **TSK-1.0**: Tạo và checkout sang nhánh mới `feat/blockchain-gamefi` từ `main`.
- [x] **TSK-1.1**: Sửa 3 lỗi `TS6133` (unused variables) trong `FarmPlot.ts`, `FarmScene.ts`, `GamePage.tsx`.
- [x] **TSK-1.2**: Sửa lỗi routing trong `App.tsx` (thêm route `/game`, chuyển hướng sạch).
- [x] **TSK-1.3**: Kích hoạt hiển thị cụm nút D-pad ảo cho mobile trong `GamePage.tsx` qua event `farm-control`.
- [x] **TSK-1.4**: Dọn dẹp mã nguồn thừa không dùng (`PlotTile.ts`, `Farmer.ts`).
- [x] **TSK-1.5**: Kiểm chứng lệnh `pnpm run lint` (0 errors, 0 warnings) và `pnpm run build` kết thúc thành công với exit code 0.

---

## 3. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 2 (ĐÃ HOÀN THÀNH)

- [x] **TSK-2.1**: Tích hợp module câu cá từ `origin/Fishing` vào `front_end/src/game/fishing/` và assets cá vào `front_end/public/assets/fishing/`.
- [x] **TSK-2.2**: Cập nhật `FarmScene.ts` với các điểm câu cá quanh hồ nước (`FISHING_SPOTS`), animation câu cá và lắng nghe sự kiện `fishing-catch`.
- [x] **TSK-2.3**: Nâng cấp `FarmPlot.ts`: hỗ trợ gieo hạt kiểm tra số lượng tồn kho (event cancelable `farm-plant-crop`), hỗ trợ công cụ Gold (`gold-watering-can`, `gold-sickle`), hệ số giảm thời gian lớn `growDurationMultiplier`.
- [x] **TSK-2.4**: Tích hợp NFT Buff Bridge trong `FarmScene.ts`: lắng nghe custom event `web3-buff-updated` để giảm 20% thời gian lớn khi sở hữu Bình tưới vàng NFT.
- [x] **TSK-2.5**: Tái cấu trúc kho đồ `inventory.ts`: bổ sung định nghĩa đầy đủ Tools thường + Gold Tools, 5 loại hạt giống, 5 loại nông sản thu hoạch, 5 loại cá. Lưu trữ phân tách theo địa chỉ ví: `pixel-farm-inventory-v3-${account}`.
- [x] **TSK-2.6**: Xây dựng Modal Cửa Hàng Hạt Giống (`ShopModal.tsx`, `ShopModal.css`): hỗ trợ mua gói hạt giống bằng In-Game Coin, tự gộp stack vào Toolbar hoặc Kho đồ.
- [x] **TSK-2.7**: Nâng cấp Modal Nhiệm Vụ Tương Tác (`QuestPanel.tsx`, `QuestPanel.css`): bấm biển gỗ/bảng ghim để mở bảng nhiệm vụ, nhận thưởng Coin trực tiếp.
- [x] **TSK-2.8**: Cập nhật `GamePage.tsx`: bổ sung hàm gộp stack `addItem`, tiêu thụ hạt `consumeSeed`, nút bấm Shop 🛒, xử lý nhận thưởng quest và các sự kiện Phaser -> React.
- [x] **TSK-2.9**: Kiểm thử lint (`oxlint` 0 warnings, 0 errors) và build production (`tsc -b && vite build` 0 errors, 940ms). Đã commit lên nhánh `feat/blockchain-gamefi`.

---

## 4. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 3 (ĐÃ HOÀN THÀNH)

- [x] **TSK-3.1**: Khởi tạo thư mục `backend/` độc lập ở root với Node.js, Express 5, TypeScript, SQLite (`better-sqlite3`), Ethers v6, JWT.
- [x] **TSK-3.2**: Xây dựng Database Schema & Auto-seed 5 loại hạt giống nông trại trong `backend/src/db/database.ts` với chế độ WAL mode.
- [x] **TSK-3.3**: Xây dựng Hệ thống Auth (`backend/src/routes/auth.ts`):
  - `GET /api/auth/nonce`: Cung cấp Nonce chống tấn công Replay Attack.
  - `POST /api/auth/login-wallet`: Xác thực chữ ký ví MetaMask (SIWE - Sign-In with Ethereum) qua `ethers.verifyMessage`, cấp phát JWT Token 7 ngày.
  - `POST /api/auth/register` & `POST /api/auth/login`: Hỗ trợ tài khoản truyền thống song song.
- [x] **TSK-3.4**: Xây dựng API Game State (`backend/src/routes/game.ts`):
  - `GET /api/game/state`: Truy xuất số dư Coin, Toolbar, Kho đồ và Nhiệm vụ theo địa chỉ ví.
  - `POST /api/game/save`: Lưu và đồng bộ trạng thái game vào SQLite.
- [x] **TSK-3.5**: Xây dựng Cửa hàng Hạt giống Server-side (`backend/src/routes/shop.ts`):
  - `GET /api/shop/items`: Trả về danh sách hạt giống và vật phẩm.
  - `POST /api/shop/buy`: Kiểm tra số dư Coin, trừ Coin an toàn, tự động xếp gộp stack vào Toolbar hoặc Kho đồ trong Database.
- [x] **TSK-3.6**: Xây dựng ECDSA Web3 Signer (`backend/src/routes/web3.ts`):
  - `GET /api/web3/claim-status`: Kiểm tra hạn mức Cap (100 Coins) và thời gian hồi Cooldown (300 giây).
  - `POST /api/web3/create-claim-signature`: Kiểm tra số dư Coin, kiểm tra Cap & Cooldown, trừ Coin trong DB và dùng Server Private Key ký ECDSA hash `(player, amount, nonce, deadline)` theo chuẩn `keccak256` OpenZeppelin.
  - `POST /api/web3/confirm-claim`: Cập nhật trạng thái giao dịch on-chain khi có txHash.
- [x] **TSK-3.7**: Xây dựng Lịch sử Giao dịch (`backend/src/routes/transactions.ts`):
  - `GET /api/transactions`: Truy xuất audit log theo địa chỉ ví.
  - `POST /api/transactions/log`: Lưu lịch sử đổi token, mua hạt giống, mint NFT.
- [x] **TSK-3.8**: Viết bộ kịch bản tự động kiểm thử (`backend/test_api.ts`) vượt qua **8/8 bài kiểm tra** với Exit Code 0. Build production `tsc` thành công.

---

## 5. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 4 (ĐÃ HOÀN THÀNH)

- [x] **TSK-4.1**: Khởi tạo môi trường Hardhat độc lập tại thư mục `contracts/` với OpenZeppelin Contracts v5.2, Solidity 0.8.24 (Cancun EVM), TypeScript và Hardhat Toolbox.
- [x] **TSK-4.2**: Viết hợp đồng `PixelFarmToken.sol` ($PIXEL):
  - Chuẩn ERC-20, AccessControl, ReentrancyGuard, ECDSA/MessageHashUtils.
  - Hàm `claimFarmingReward(...)`: Xác thực chữ ký số Backend, kiểm tra chống Replay Attack (`usedNonces`), Hạn mức Cap (100 token/lần), và Cooldown (300s).
  - Hàm Daily Faucet (`claimFaucet()`): Nhận 100 $PIXEL thử nghiệm.
  - Phân quyền `BURNER_ROLE` và hàm `burnFromPlayer(...)`: Cho phép đốt token trực tiếp khi mint NFT mà không cần người chơi phải ký lệnh `approve()`.
- [x] **TSK-4.3**: Viết hợp đồng `FarmItemNFT.sol` (PFARM):
  - Chuẩn ERC-721, Ownable, ReentrancyGuard.
  - Quản lý 4 loại NFT nông cụ: Gold Sickle (50 $PIXEL), Gold Watering Can (100 $PIXEL), Gold Hoe (75 $PIXEL), Golden Fish (150 $PIXEL).
  - Cơ chế **1-Click Mint** (`mintWithToken`): Đốt token và mint NFT chỉ trong 1 giao dịch duy nhất.
  - Hàm Batch View `getOwnedItems(user)`: Trả về mảng `bool[4]` trạng thái sở hữu phục vụ Cầu nối Buff React -> Phaser.
- [x] **TSK-4.4**: Viết bộ Unit Test tự động (`contracts/test/PixelFarm.test.ts`): Vượt qua **15/15 bài kiểm tra** (100% passed) trong 933ms.
- [x] **TSK-4.5**: Viết Script Deploy (`contracts/scripts/deploy.ts`): Tự động triển khai hợp đồng, cấp quyền `BURNER_ROLE`, và tự động xuất Contract Addresses cùng TypeScript ABI ra `front_end/src/web3/abis/contracts.ts`, `PixelFarmToken.json`, `FarmItemNFT.json`.

---

## 6. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 5 (ĐÃ HOÀN THÀNH)

- [x] **TSK-5.1**: Xây dựng Hook `useWeb3.ts` (Ethers v6): quản lý kết nối MetaMask, chuyển mạng Hardhat/Amoy, theo dõi số dư ETH, số dư `$PIXEL`, và batch view trạng thái NFT `getOwnedItems`.
- [x] **TSK-5.2**: Cập nhật thanh điều hướng `AppNavbar.tsx`: Nút "Kết Nối Ví MetaMask", hiển thị địa chỉ ví rút gọn (`0x12...ab`), pill số dư `$PIXEL` on-chain, nút Faucet 100 `$PIXEL`, cùng các nút tắt mở NFT Shop & Quy đổi Token.
- [x] **TSK-5.3**: Xây dựng Modal Quy Đổi Token `ClaimTokenModal.tsx` ("Sync Coins to $PIXEL"): cho phép nhập/chọn nhanh số lượng Coin, gọi Backend lấy chữ ký số ECDSA kèm Cap (100) & Cooldown (300s), gọi smart contract `claimFarmingReward(...)` trên ví MetaMask, và tự động khóa coin chống double-spending.
- [x] **TSK-5.4**: Xây dựng Modal Web3 NFT Shop `NftShopModal.tsx`: hiển thị 4 loại NFT nông cụ, hỗ trợ cơ chế **1-Click Mint** (`mintWithToken`) tự động đốt token và mint NFT chỉ trong 1 giao dịch duy nhất không cần lệnh `approve()`.
- [x] **TSK-5.5**: Hoàn thiện Cầu nối NFT Buff Bridge (React -> Phaser): khi ví kết nối hoặc sau khi mint thành công, hook phát Custom Event `web3-buff-updated` kích hoạt giảm ngay 20% thời gian lớn của cây trong `FarmPlot.ts` khi sở hữu "Bình tưới vàng".
- [x] **TSK-5.6**: Kiểm thử chất lượng mã nguồn: `oxlint` 0 lỗi 0 cảnh báo, `tsc -b && vite build` hoàn thành với exit code 0 trong 1.89s.

---

## 7. NHẬT KÝ THỰC HIỆN GIAI ĐOẠN 6 (ĐÃ HOÀN THÀNH)

- [x] **TSK-6.1**: Cấu hình mạng Hardhat Localhost (ChainId: 31337) và Testnet công khai (Polygon Amoy ChainId: 80002, Ethereum Sepolia ChainId: 11155111) trong `contracts/hardhat.config.ts`.
- [x] **TSK-6.2**: Thiết lập root `package.json` tự động điều phối khởi chạy và kiểm thử cả 3 tầng (`frontend`, `backend`, `contracts:node`, `contracts:deploy`, `test:contracts`, `test:backend`).
- [x] **TSK-6.3**: Viết tài liệu hướng dẫn tổng quan `README.md` tại thư mục gốc với sơ đồ kiến trúc hệ thống 3 tầng (Mermaid), thông số kỹ thuật, hướng dẫn cài đặt và khởi chạy.
- [x] **TSK-6.4**: Biên soạn kịch bản báo cáo và demo đồ án chi tiết `demo_script.md` chuẩn 6 bước dành cho sinh viên trình bày trước hội đồng chấm thi, kèm bộ câu hỏi phản biện chuyên sâu.
- [x] **TSK-6.5**: Kiểm chứng 100% các bài test tự động (15/15 unit test hợp đồng, 8/8 test tích hợp backend) và xác nhận toàn bộ mã nguồn nằm trên nhánh độc lập `feat/blockchain-gamefi`, giữ nguyên vẹn 100% nhánh `main` và `origin/Fishing`.
