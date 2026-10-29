# 🌾 Pixel2D GameFi - Nông Trại 2D Blockchain (Web 2.5 Hybrid)

Dự án đồ án Blockchain chuyên đề **GameFi Nông Trại 2D** xây dựng trên nền tảng **React 19**, **Phaser 4**, **Node.js/Express 5** và **Solidity 0.8.24 (Hardhat)**.

Dự án kết hợp trải nghiệm gameplay 2D mượt mà (trồng trọt, chăn nuôi, câu cá, làm nhiệm vụ) với các cơ chế kinh tế Web3 an toàn và tối ưu trải nghiệm người dùng (**1-Click Mint NFT**, **ECDSA Backend Signature Claim**, **NFT Buff Bridge**).

---

## 🏛️ Kiến Trúc Hệ Thống (3 Tầng Hoàn Chỉnh)

```mermaid
graph TD
    subgraph Frontend ["Tầng 1: Frontend (React 19 + Phaser 4)"]
        UI["React UI (AppNavbar, Modals, HUD, Quests)"]
        Game["Phaser 4 Game Canvas (FarmScene, FarmPlot, Fishing)"]
        Hook["useWeb3 Hook (Ethers.js v6)"]
        Bridge["NFT Buff Bridge (CustomEvent: web3-buff-updated)"]
        UI <--> Hook
        Hook --> Bridge
        Bridge --> Game
    end

    subgraph Backend ["Tầng 2: Backend API & Signer (Express 5 + SQLite)"]
        AuthAPI["SIWE Auth & JWT (/api/auth)"]
        GameAPI["Game State Sync (/api/game)"]
        ShopAPI["In-Game Seed Shop (/api/shop)"]
        SignerAPI["ECDSA Web3 Signer (/api/web3)"]
        DB[(SQLite WAL Database: pixel_farm.db)]
        AuthAPI --> DB
        GameAPI --> DB
        ShopAPI --> DB
        SignerAPI --> DB
    end

    subgraph Blockchain ["Tầng 3: Smart Contracts (Solidity 0.8.24)"]
        Token["PixelFarmToken.sol ($PIXEL - ERC20)<br/>- ECDSA Verify Signature<br/>- Cooldown 300s & Cap 100<br/>- Daily Faucet (100 $PIXEL)"]
        NFT["FarmItemNFT.sol (PFARM - ERC721)<br/>- 1-Click Mint (BURNER_ROLE)<br/>- Batch View: getOwnedItems()<br/>- 4 Gold Equipment Buffs"]
        Token -.->|Cấp BURNER_ROLE| NFT
    end

    %% Tương tác liên tầng
    UI <-->|HTTP REST / JWT| Backend
    SignerAPI -.->|ECDSA Signature (secp256k1)| UI
    Hook <-->|MetaMask / JSON-RPC| Blockchain
```

---

## 🌟 6 Điểm Sáng Tạo & Đột Phá Kỹ Thuật

1. **Cơ chế 1-Click Mint NFT (`BURNER_ROLE`)**:
   - Khác với quy trình ERC-20 truyền thống bắt buộc người chơi phải ký 2 giao dịch (`approve` rồi mới `mint`), Smart Contract `PixelFarmToken` cấp quyền `BURNER_ROLE` cho `FarmItemNFT`. Người chơi chỉ cần ký **1 giao dịch duy nhất trên MetaMask**, token tự động bị đốt và NFT được đúc ngay lập tức, tiết kiệm 50% phí gas.
2. **Cơ chế Rút Token Bảo Mật Tuyệt Đối (ECDSA Cryptographic Signer)**:
   - Ngăn chặn triệt để lỗ hổng gian lận người chơi tự gọi contract để mint token: Người chơi chỉ rút được `$PIXEL` khi có chữ ký số do Backend Server ký (sau khi đã kiểm tra và trừ Coin trong SQLite Database).
   - Tích hợp chống Replay Attack (`usedNonces`), Hạn mức Cap (100 token/lần), và Cooldown (300 giây).
3. **Cầu Nối Hiệu Ứng NFT Buff Bridge (React -> Phaser)**:
   - Việc sở hữu NFT on-chain mang lại giá trị sử dụng thực tế (In-Game Utility): Sở hữu "Bình tưới vàng" (NFT) tự động kích hoạt sự kiện `web3-buff-updated` giảm ngay **20% thời gian lớn của cây trồng** trong Phaser Engine.
4. **Vòng Lặp Gameplay Đầy Đủ**:
   - Gieo hạt, tưới nước, xới đất, thu hoạch nông sản.
   - Minigame câu cá tương tác với 4 điểm câu ven hồ nước.
   - Bảng nhiệm vụ tương tác nhận thưởng coin trực tiếp.
   - Cửa hàng hạt giống in-game với xác thực số dư phía server.
5. **Cơ Sở Dữ Liệu SQLite Cực Nhẹ (Zero-Config)**:
   - Sử dụng SQLite qua `better-sqlite3` chạy chế độ WAL mode, không cần cài đặt Docker, PostgreSQL hay MySQL cồng kềnh, cực kỳ tiện lợi cho hội đồng chấm bài.
6. **Bộ Unit Test & Integration Test Tự Động 100% Pass**:
   - 15 Unit tests Smart Contracts (Hardhat): **15/15 Passed**.
   - 8 Integration tests Backend API & Signer: **8/8 Passed**.
   - TypeScript build frontend & backend: **0 Errors**.

---

## 🛠️ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt Dependencies cho cả 3 tầng
```bash
# Cài đặt Smart Contracts
cd contracts && pnpm install

# Cài đặt Backend
cd ../backend && pnpm install

# Cài đặt Frontend
cd ../front_end && pnpm install
cd ..
```

---

### 2. Khởi chạy dApp (Mở 3 Terminal)

#### Terminal 1: Khởi động Local Blockchain & Deploy Contracts
```bash
# Bước 1: Khởi động Hardhat node cục bộ (port 8545)
pnpm run contracts:node

# Bước 2 (Mở tab terminal mới): Triển khai hợp đồng lên node vừa chạy
pnpm run contracts:deploy
```
> *Lệnh deploy sẽ tự động trích xuất ABI và Contract Addresses sang `front_end/src/web3/abis/contracts.ts`.*

#### Terminal 2: Khởi động Backend API & Web3 Signer
```bash
pnpm run backend
```
> *Backend chạy tại `http://localhost:4000` (Database SQLite tự khởi tạo tại `backend/data/pixel_farm.db`).*

#### Terminal 3: Khởi động Game Frontend
```bash
pnpm run frontend
```
> *Frontend chạy tại `http://localhost:5173`.*

---

### 3. Cấu hình Ví MetaMask để Test
- Thêm mạng **Hardhat Localhost**:
  - **Network Name**: `Hardhat Localhost`
  - **RPC URL**: `http://127.0.0.1:8545`
  - **Chain ID**: `31337`
  - **Currency Symbol**: `ETH`
- Import Private Key tài khoản test (Hardhat Account #0):
  - `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (Có sẵn 10,000 ETH test).

---

## 🧪 Chạy Kiểm Thử Tự Động

```bash
# 1. Chạy 15 Unit Tests cho Smart Contracts
pnpm run test:contracts

# 2. Chạy 8 Integration Tests cho Backend API & Signer
pnpm run test:backend
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
pixel2d/
├── contracts/                  # Tầng 3: Smart Contracts (Solidity 0.8.24)
│   ├── contracts/
│   │   ├── PixelFarmToken.sol  # Token ERC-20 ($PIXEL) + ECDSA Claim + Faucet + BURNER_ROLE
│   │   └── FarmItemNFT.sol     # NFT ERC-721 + 1-Click Mint + getOwnedItems batch view
│   ├── test/
│   │   └── PixelFarm.test.ts   # Bộ 15 bài unit test kiểm thử hợp đồng
│   ├── scripts/
│   │   └── deploy.ts           # Script deploy & xuất ABI sang front_end
│   └── hardhat.config.ts       # Cấu hình Hardhat (Localhost, Polygon Amoy, Sepolia)
│
├── backend/                    # Tầng 2: Backend API & Signer (Node.js/Express + SQLite)
│   ├── src/
│   │   ├── db/database.ts      # Khởi tạo SQLite WAL, bảng dữ liệu & seed hạt giống
│   │   ├── routes/
│   │   │   ├── auth.ts         # SIWE MetaMask Login & Nonce API
│   │   │   ├── game.ts         # Đồng bộ Coin, Inventory, Quests
│   │   │   ├── shop.ts         # Mua hạt giống server-side bằng In-Game Coin
│   │   │   ├── web3.ts         # ECDSA Cryptographic Signer (Cap 100, Cooldown 300s)
│   │   │   └── transactions.ts # Lịch sử giao dịch
│   │   └── index.ts            # Express App entry point
│   └── test_api.ts             # Bộ 8 bài test tích hợp tự động API & Signer
│
├── front_end/                  # Tầng 1: Frontend (React 19 + Phaser 4 + Ethers v6)
│   ├── src/
│   │   ├── web3/
│   │   │   ├── useWeb3.ts      # Custom hook quản lý MetaMask & tương tác contract
│   │   │   └── abis/           # File ABI và địa chỉ Smart Contract
│   │   ├── components/
│   │   │   ├── AppNavbar.tsx   # HUD Top bar (Connect Wallet, $PIXEL pill, Faucet)
│   │   │   ├── ClaimTokenModal.tsx # Modal quy đổi Coin sang $PIXEL qua chữ ký ECDSA
│   │   │   ├── NftShopModal.tsx    # Modal Web3 NFT Shop (1-Click Mint)
│   │   │   ├── ShopModal.tsx   # Cửa hàng hạt giống mua bằng In-Game Coin
│   │   │   ├── QuestPanel.tsx  # Bảng nhiệm vụ tương tác
│   │   │   └── GameCanvas.tsx  # Canvas hiển thị game Phaser
│   │   ├── game/
│   │   │   ├── scenes/FarmScene.ts # Bản đồ nông trại, hồ câu cá, sự kiện NFT Buff
│   │   │   ├── objects/FarmPlot.ts # Ô đất trồng, áp dụng growDurationMultiplier
│   │   │   └── fishing/        # Module minigame câu cá tích hợp từ origin/Fishing
│   │   └── pages/GamePage.tsx  # Trang game chính kết nối React và Phaser
│
├── demo_script.md              # Kịch bản báo cáo & demo 6 bước chuẩn đạt điểm tối đa
├── progress.md                 # Nhật ký theo dõi tiến độ hoàn thành 6 Phase
└── README.md                   # Hướng dẫn tổng quan đồ án
```

---

## 🎬 Kịch Bản Demo Đồ Án
Xem tài liệu hướng dẫn thuyết trình và trả lời phản biện chi tiết tại: **[`demo_script.md`](./demo_script.md)**.
