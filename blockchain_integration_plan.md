# PHƯƠNG ÁN TÍCH HỢP BLOCKCHAIN, BACKEND & GAMEFI CHO PIXEL2D (v3.0 HOÀN THIỆN)

> **Dự án**: Pixel2D GameFi - Nông Trại 2D Blockchain  
> **Kiến trúc**: 3 Tầng Hoàn Chỉnh (Frontend React 19 + Backend Express/SQLite + Smart Contracts Hardhat EVM)  
> **Phiên bản kế hoạch**: v3.0 (Tích hợp Backend Signer, SIWE, Shop Hạt Giống In-Game, 1-Click Mint, NFT Buff Bridge)

---

## 1. TỔNG QUAN KIẾN TRÚC 3 TẦNG (3-TIER GAMEFI ARCHITECTURE)

```mermaid
flowchart TD
    subgraph Client["Tầng 1: Frontend (React 19 + Phaser 4)"]
        UI[React UI: Navbar, Shop Hạt Giống, Kho Đồ, Modal Claim, NFT Shop]
        Game[Phaser Engine: Nông Trại, Minigame Câu Cá, Event Bus]
        UI <-->|Event: web3-buff-updated & farm-tool-changed| Game
    end

    subgraph Backend_Layer["Tầng 2: Backend API & Signer (Node.js/Express + SQLite)"]
        Auth[Auth Service: JWT + SIWE Chữ Ký Ví]
        StateSync[State Sync: Lưu Coins, Kho Đồ, Tiến Độ Quest]
        ShopAPI[Shop In-Game API: Mua Hạt Giống bằng Coin]
        Signer[Web3 Signer: Ký ECDSA EIP-712 Cấp Token Chống Cheat]
        TxHistory[Lịch Sử Giao Dịch: Log On-chain & Off-chain]
    end

    subgraph Blockchain_Layer["Tầng 3: Smart Contracts (Solidity Hardhat)"]
        Token[PixelFarmToken.sol - ERC-20: Claim qua Chữ Ký Backend, Faucet]
        NFT[FarmItemNFT.sol - ERC-721: 1-Click Mint qua BURNER_ROLE, Đọc 4 Loại NFT]
    end

    Client <-->|REST API + Bearer Token| Backend_Layer
    Client <-->|RPC Provider via MetaMask (ethers v6)| Blockchain_Layer
    Signer -.->|Cung cấp Signature để Client nộp lên| Token
    Token <-->|AccessControl: BURNER_ROLE| NFT
```

---

## 2. THIẾT KẾ CHI TIẾT TỪNG PHÂN TẦNG

### 2.1 Tầng 1: Frontend & Giao Diện Người Chơi (`front_end/`)
- **React 19 + Vite 8**:
  - Giao diện người dùng Pixel Retro đồng bộ.
  - Hook `useWeb3`: Quản lý ví MetaMask, đổi mạng (Sepolia/Amoy/Local), số dư ETH & `$PIXEL`.
  - **Modal Cửa hàng Hạt giống (In-Game Seed Shop)**: Dùng Coin thu hoạch nông sản/cá để mua thêm hạt giống (Bắp, Lúa, Dâu, Bí, Dưa hấu) qua API `POST /api/shop/buy`.
  - **Modal Đồng bộ Coin -> On-chain `$PIXEL`**: Người chơi chọn số coin muốn rút -> Backend kiểm tra và ký chữ ký ECDSA -> MetaMask gọi `claimWithSignature` trên Smart Contract. Có cơ chế Lock Coin chống double-spending.
  - **Modal Web3 NFT Shop**: Duyệt 4 loại NFT (Liềm vàng, Bình tưới vàng, Cuốc vàng, Cá vàng) và nút 1-Click Mint.
  - **Modal Lịch sử Giao dịch**: Xem danh sách giao dịch on-chain và lịch sử mua bán hạt giống.
- **Phaser 4 Engine**:
  - Nhận event `web3-buff-updated` từ React: Khi ví có Bình tưới vàng -> tự động giảm 20% thời gian cây sinh trưởng (`growDurationMs * 0.8`), đổi icon Toolbar sang Gold.

### 2.2 Tầng 2: Backend API & Security Signer (`backend/`)
- **Công nghệ**: Node.js, Express, TypeScript, SQLite (hoặc JSON DB nhẹ không phụ thuộc cài đặt phức tạp), Ethers.js (dành cho Server Signer).
- **Hệ thống API**:
  1. `POST /api/auth/login-wallet`: Xác thực địa chỉ ví qua chữ ký SIWE (Sign-In with Ethereum), cấp JWT Token.
  2. `GET /api/game/state` & `POST /api/game/save`: Lưu và đồng bộ số dư Coin, Inventory và trạng thái Quest vào DB theo địa chỉ ví.
  3. `GET /api/shop/items`: Danh sách hạt giống, nông cụ và giá coin in-game.
  4. `POST /api/shop/buy`: Trừ Coin trong DB và cộng vật phẩm hạt giống vào kho đồ của người chơi.
  5. `POST /api/web3/create-claim-signature`: Backend kiểm tra số dư Coin hợp lệ, trừ coin trong DB và dùng Private Key của Signer ký một thông điệp mã hóa (ECDSA hash) gồm `(playerAddress, amount, nonce, deadline)`.
  6. `GET /api/transactions`: Truy xuất danh sách lịch sử rút token và mua vật phẩm.

### 2.3 Tầng 3: Smart Contracts Độc Lập (`contracts/`)
- **`PixelFarmToken.sol` (ERC-20)**:
  - Khai báo biến `trustedSigner` (địa chỉ ví của Backend).
  - Hàm `claimFarmingReward(uint256 amount, uint256 nonce, uint256 deadline, bytes memory signature)`:
    - Kiểm tra `deadline >= block.timestamp`.
    - Kiểm tra `!usedNonces[nonce]` chống Replay Attack.
    - Dùng `ECDSA.recover` giải mã chữ ký, đảm bảo chữ ký xuất phát từ `trustedSigner`.
    - Giới hạn Cap (tối đa 100 token/lần) và Cooldown (5 phút).
    - Cấp quyền `BURNER_ROLE` cho hợp đồng `FarmItemNFT.sol`.
  - Hàm `dailyFaucet()`: Nhận 100 `$PIXEL` mỗi 24h để phục vụ ban giám khảo chấm điểm.
- **`FarmItemNFT.sol` (ERC-721)**:
  - Nhận `BURNER_ROLE` từ Token `$PIXEL`.
  - Hàm `mintWithToken(uint256 itemType)`: Đốt token trực tiếp từ ví người mua (`pixelToken.burnFrom(msg.sender, price)`) và đúc NFT ngay trong **1 giao dịch duy nhất** (1-Click Mint, không cần người dùng ký `approve` riêng).
  - Hàm `getOwnedItems(address owner)`: Trả về mảng boolean `[hasSickle, hasWateringCan, hasHoe, hasGoldenFish]` để Frontend đọc nhanh chóng trong 1 cuộc gọi view RPC.

---

## 3. CƠ CHẾ BẢO VỆ DỮ LIỆU & CHỐNG GIAN LẬN

1. **Chống Replay Attack & Tự ý Mint**: Người dùng không thể tự bịa số coin để gọi Smart Contract vì không có Private Key của Backend Signer. Mỗi `nonce` chỉ được dùng đúng 1 lần trên blockchain.
2. **Chống Double-Spending**: Khi bấm Claim, Coin trên Frontend bị khóa (`pendingLockedCoins`). Khi backend sinh chữ ký thành công và giao dịch on-chain hoàn tất (`tx.wait()`), coin mới bị trừ vĩnh viễn trong Database. Nếu transaction bị revert hoặc user cancel trên MetaMask, coin được mở khóa hoàn lại.
3. **Phân tách ví chuẩn mực**: Toàn bộ dữ liệu gắn chặt theo `wallet_address`. Đổi ví trên MetaMask -> Game tự động tải đúng phiên chơi của ví đó.
