# Pixel2D GameFi - Backend API & Web3 Signer

Server backend xử lý logic nghiệp vụ, đồng bộ dữ liệu nông trại, cửa hàng hạt giống và bảo mật chữ ký số ECDSA (Web3 Signer) cho dự án **Pixel2D GameFi**.

## 🚀 Công Nghệ
- **Runtime**: Node.js v24 + Express v5 (ES Modules)
- **Language**: TypeScript (v5.9+)
- **Database**: SQLite (qua `better-sqlite3`, lưu trữ local tại `data/pixel_farm.db`)
- **Crypto & Web3**: Ethers.js v6 (SIWE - Sign-In with Ethereum & ECDSA secp256k1 Message Signer)
- **Authentication**: JWT (JSON Web Tokens)

---

## 🛠️ Cài Đặt & Khởi Chạy

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Khởi chạy chế độ phát triển (auto-reload)
pnpm run dev

# 3. Chạy toàn bộ integration tests tự động (8 tests)
pnpm run test

# 4. Build TypeScript ra dist/
pnpm run build

# 5. Chạy bản build production
pnpm run start
```

---

## ⚙️ Biến Môi Trường (`.env`)

| Biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `4000` | Cổng HTTP của server |
| `JWT_SECRET` | `pixel2d_gamefi_jwt_super_secret_dev_key_2026` | Khóa bí mật ký token JWT |
| `SIGNER_PRIVATE_KEY` | Hardhat Account #0 (`0xac09...`) | Private Key của Server dùng ký ECDSA cho Smart Contract |
| `CLAIM_CAP` | `100` | Hạn mức rút tối đa mỗi lần (Coins) |
| `CLAIM_COOLDOWN_SECONDS`| `300` | Thời gian hồi giữa 2 lần rút (giây) |
| `DATABASE_PATH` | `./data/pixel_farm.db` | Đường dẫn file cơ sở dữ liệu SQLite |

---

## 📡 Danh Sách API Endpoints

### 1. Authentication (`/api/auth`)
- `GET /api/auth/nonce?address=0x...`: Lấy nonce ngẫu nhiên phục vụ ký SIWE.
- `POST /api/auth/login-wallet`: Đăng nhập nhanh bằng ví MetaMask (kiểm tra chữ ký SIWE, tự khởi tạo tài khoản & game state).
- `POST /api/auth/register`: Đăng ký tài khoản truyền thống (username / password).
- `POST /api/auth/login`: Đăng nhập truyền thống trả về JWT.
- `GET /api/auth/me`: Lấy thông tin user hiện tại (yêu cầu Bearer JWT).

### 2. Game State Sync (`/api/game`)
- `GET /api/game/state?address=0x...`: Lấy số dư Coin, Toolbar, Kho đồ, Trạng thái ô đất và Nhiệm vụ.
- `POST /api/game/save`: Lưu và đồng bộ trạng thái game (Coins, Inventory, Quests) vào Database SQLite.

### 3. Cửa Hàng In-Game (`/api/shop`)
- `GET /api/shop/items`: Lấy danh mục 5 loại hạt giống và giá Coin.
- `POST /api/shop/buy`: Mua hạt giống server-side (trừ Coin, kiểm tra ô trống/stack trong kho đồ, ghi nhận giao dịch).

### 4. Web3 Signer & Claim (`/api/web3`)
- `GET /api/web3/claim-status?address=0x...`: Kiểm tra thời gian hồi Cooldown, số dư khả dụng và hạn mức Cap.
- `POST /api/web3/create-claim-signature`: 
  - Kiểm tra số dư Coin trong DB.
  - Kiểm tra Hạn mức (Cap: tối đa 100 Coin/lần).
  - Kiểm tra Cooldown (300s).
  - Trừ Coin trong DB.
  - Dùng Server Private Key ký ECDSA `(player, amount, nonce, deadline)`.
  - Trả về chữ ký hex để Frontend gọi `PixelFarmToken.claimFarmingReward(...)`.
- `POST /api/web3/confirm-claim`: Cập nhật trạng thái `claimed` kèm transaction hash on-chain.

### 5. Lịch Sử Giao Dịch (`/api/transactions`)
- `GET /api/transactions?address=0x...`: Xem danh sách biến động số dư, đổi token, mua vật phẩm, mint NFT.
- `POST /api/transactions/log`: Ghi nhận log giao dịch từ frontend.
