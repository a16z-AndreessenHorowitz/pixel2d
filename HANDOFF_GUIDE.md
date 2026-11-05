# 🌾 TÀI LIỆU BÀN GIAO KIẾN TRÚC BLOCKCHAIN & HỆ THỐNG PIXEL2D GAMEFI

> **Dành cho:** Backend Developer, Frontend Developer và Thành viên dự án tiếp quản.  
> **Cập nhật lần cuối:** 05/11/2026.

---

## 📌 1. TỔNG QUAN HỆ THỐNG

Dự án Pixel2D GameFi đã được tái cấu trúc thành công với các đặc điểm cốt lõi:
1. **Duy nhất 1 Smart Contract:** `PixelFarmToken.sol` (Token ERC-20 mã `$PIXEL`).
2. **Không còn NFT:** Toàn bộ code NFT (`FarmItemNFT.sol`, shop NFT, buff NFT...) đã được loại bỏ hoàn toàn để tinh gọn hệ thống.
3. **Deploy đúng 1 lần:** Contract đã được deploy và **Verify tick xanh trên Ethereum Sepolia Etherscan**. Không tự động deploy lại khi khởi động server.
4. **Mô hình kinh tế GameFi (EIP-712 Sign-to-Mint):** 
   - Chủ game **không tốn phí gas** để phân phát token.
   - Khi người chơi đổi điểm cày game (Coins) lấy `$PIXEL`, Backend tự động ký chữ ký điện tử EIP-712.
   - Người chơi tự gửi chữ ký lên Smart Contract và trả phí gas để đúc (`_mint`) token về ví của mình.

---

## 🌐 2. THÔNG TIN SMART CONTRACT ON-CHAIN (SEPOLIA TESTNET)

| Thuộc tính | Giá trị chi tiết |
| :--- | :--- |
| **Mạng Blockchain** | **Ethereum Sepolia Testnet** |
| **Chain ID** | `11155111` |
| **Contract Name** | `PixelFarmToken` |
| **Token Symbol** | `$PIXEL` (18 Decimals) |
| **Địa chỉ Contract** | [`0x8350cac45079a5CA9781e8C8170bA82b54134B2A`](https://sepolia.etherscan.io/address/0x8350cac45079a5CA9781e8C8170bA82b54134B2A#code) *(Đã Verify code ✅)* |
| **Ví Admin (Deployer)** | `0xFB2355C56053A575158EB618834D5e902B49B7DF` |
| **Ví Vault nhận Nạp tiền** | `0xFB2355C56053A575158EB618834D5e902B49B7DF` |
| **Public RPC URL** | `https://ethereum-sepolia-rpc.publicnode.com` |

---

## 🍃 3. CƠ SỞ DỮ LIỆU (MONGODB ATLAS)

Dữ liệu game được lưu trữ trên Cloud **MongoDB Atlas**:
* **Database Name:** `pixel2d`
* **Cluster:** `cluster0.ws4tfvk.mongodb.net`
* **Các Collections đã tạo và hoạt động:**
  - `shopitems`: Danh mục hạt giống và vật phẩm shop (đã seed sẵn 5 loại cây).
  - `users`: Tài khoản định danh theo địa chỉ ví (`wallet_address`).
  - `gamestates`: Dữ liệu nông trại (ô đất đã cuốc, cây đang lớn, năng lượng, xu).
  - `claims`: Lịch sử các lần người chơi yêu cầu đổi điểm rút token (lưu nonce chống hack).
  - `transactions`: Lịch sử giao dịch nạp / rút / mua bán.
  - `siwenonces`: Nonce đăng nhập bảo mật SIWE (Sign-In with Ethereum).

---

## 🛠️ 4. HƯỚNG DẪN DÀNH CHO BACKEND DEVELOPER

Backend chạy bằng **Node.js (TypeScript) + Express + Mongoose + Ethers.js v6**.

### 4.1. Cấu hình file `.env` (`/backend/.env`)
File này đã được tạo sẵn trong thư mục `backend/`:

```env
PORT=4000
JWT_SECRET=pixel2d_gamefi_jwt_super_secret_dev_key_2026
CORS_ORIGIN=http://localhost:5173

# Kết nối Cloud Database
MONGODB_URI=mongodb+srv://ethereumpowethw_db_user:A16za16za16z%40@cluster0.ws4tfvk.mongodb.net/pixel2d?retryWrites=true&w=majority

# Kết nối Blockchain
NETWORK_NAME=sepolia
CHAIN_ID=11155111
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x8350cac45079a5CA9781e8C8170bA82b54134B2A
VAULT_ADDRESS=0xFB2355C56053A575158EB618834D5e902B49B7DF

# Khóa bí mật ví Backend Signer (Dùng ký EIP-712 duyệt thưởng)
SIGNER_PRIVATE_KEY=af13353a31f74c7bfc9908bdf61db407c6718affcc2c5c65a8e52e2d04572ce9

# Giới hạn đổi thưởng
CLAIM_CAP=100
CLAIM_COOLDOWN_SECONDS=300
```

> **Lưu ý về `SIGNER_PRIVATE_KEY`:** 
> - Khóa này chỉ dùng để ký offline trên RAM của Backend server (không mất phí gas). 
> - Khi đổi sang ví mới cho dev khác, hãy dùng ví Admin gọi hàm `grantRole` trên Etherscan để cấp quyền cho ví mới trước khi thay vào `.env`.

### 4.2. Cơ chế phân quyền Smart Contract (OpenZeppelin AccessControl)
* **`DEFAULT_ADMIN_ROLE` (0x00...):** Nắm bởi ví Admin (`0xFB23...`). Có quyền đổi luật và cấp/hủy quyền khác.
* **`SIGNER_ROLE`:** Mã hash định danh:
  ```text
  0xe2f4eaae4a9751e85a3e4a7b9587827a877f29914755229b07a7b2da98285f70
  ```
* **Cách cấp quyền cho ví Backend mới:**
  1. Vào Etherscan: [Write Contract tab](https://sepolia.etherscan.io/address/0x8350cac45079a5CA9781e8C8170bA82b54134B2A#writeContract).
  2. Kết nối ví Admin $\rightarrow$ tìm hàm `grantRole`.
  3. Dán mã hash `SIGNER_ROLE` ở trên vào ô `role` và địa chỉ ví mới vào ô `account` $\rightarrow$ bấm **Write**.

### 4.3. Hai Nghiệp Vụ Blockchain Cốt Lõi Trên Backend

#### A. Ký duyệt Claim thưởng (EIP-712)
Tại file [`backend/src/routes/web3.ts`](file:///Users/tranminhhuy/Documents/git/pixel2d/backend/src/routes/web3.ts):
* **Domain Sepolia:**
  ```javascript
  const domain = {
    name: 'PixelFarmToken',
    version: '1',
    chainId: 11155111,
    verifyingContract: '0x8350cac45079a5CA9781e8C8170bA82b54134B2A'
  };
  ```
* **Types:**
  ```javascript
  const types = {
    ClaimReward: [
      { name: 'player', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };
  ```
* **Quy trình:**
  1. Người chơi yêu cầu đổi $X$ xu sang token.
  2. Backend kiểm tra số dư xu trong DB, trừ xu và tạo `nonce` duy nhất.
  3. Ký `signerWallet.signTypedData(domain, types, value)` và trả chữ ký về cho Frontend.
  4. Nếu giao dịch on-chain bị revert hoặc quá hạn, Backend hỗ trợ API rollback lại số xu cho người chơi.

#### B. Xác minh Nạp Token (Deposit to Vault)
* Người chơi chuyển `$PIXEL` vào địa chỉ `VAULT_ADDRESS` thông qua hàm `depositToVault(...)` trên contract.
* Frontend gửi `transactionHash` lên endpoint `POST /api/web3/verify-deposit`.
* Backend dùng `provider.getTransactionReceipt(txHash)` để:
  1. Xác minh giao dịch đã lên block (`receipt.status === 1`).
  2. Đọc event `TokensDeposited` để lấy số lượng token và ví người gửi.
  3. Kiểm tra tính **duy nhất (Idempotency)** của `txHash` trong bảng `transactions` để ngăn chặn nhận tiền nhiều lần (double spend).
  4. Cộng số dư xu tương ứng vào tài khoản game của người chơi.

---

## 💻 5. HƯỚNG DẪN DÀNH CHO FRONTEND DEVELOPER

Frontend sử dụng **React (Vite) + Phaser 3 + Ethers.js v6**.

1. **Thông tin Contract:** Đã được tự động lưu trong file [`front_end/src/web3/abis/contracts.ts`](file:///Users/tranminhhuy/Documents/git/pixel2d/front_end/src/web3/abis/contracts.ts).
2. **Hook tích hợp Web3:** Đã viết sẵn tại [`front_end/src/web3/useWeb3.ts`](file:///Users/tranminhhuy/Documents/git/pixel2d/front_end/src/web3/useWeb3.ts):
   * `connectWallet()`: Tự động kết nối và chuyển sang mạng Sepolia (ChainId: `11155111`).
   * `claimFaucet()`: Nhận 100 $PIXEL test miễn phí mỗi ngày.
   * `claimFarmingReward(...)`: Gửi chữ ký EIP-712 từ Backend lên contract để nhận token.
   * `depositTokens(...)`: Nạp token từ ví vào kho Vault của game.

---

## 🚀 6. HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG

> ⚠️ **TUYỆT ĐỐI KHÔNG CHẠY LỆNH DEPLOY LẠI CONTRACT.** Contract trên Sepolia đã hoàn thiện và cố định.

### Bước 1: Khởi động Backend
```bash
cd backend
pnpm install
pnpm dev
```
*(Server chạy tại `http://localhost:4000`, tự động kết nối MongoDB Atlas và lắng nghe Sepolia RPC)*.

### Bước 2: Khởi động Frontend
```bash
cd front_end
pnpm install
pnpm dev
```
*(Giao diện game mở tại `http://localhost:5173`)*.

### Bước 3: Chạy Test kiểm thử (Nếu cần kiểm tra hệ thống)
```bash
# Test 8 bài kiểm tra tích hợp Backend + Atlas + EIP-712:
cd backend && pnpm test

# Test 18 bài kiểm tra Smart Contract (Hardhat Local):
cd contracts && pnpm test
```

