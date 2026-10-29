# Pixel2D GameFi - Smart Contracts

Hệ thống Hợp đồng thông minh phục vụ đồ án **Pixel2D GameFi** trên mạng Ethereum / Polygon Amoy / Hardhat Network.

## 📜 Danh Sách Hợp Đồng

### 1. `PixelFarmToken.sol` (`$PIXEL`)
- **Tiêu chuẩn**: ERC-20, AccessControl, ReentrancyGuard, ECDSA/MessageHashUtils.
- **Tính năng nổi bật**:
  - `claimFarmingReward(uint256 amount, uint256 nonce, uint256 deadline, bytes memory signature)`: Rút coin trong game thành token `$PIXEL` on-chain qua chữ ký số Backend ECDSA. Tích hợp chống Replay Attack (`usedNonces`), Hạn mức Cap (100 token/lần), và Cooldown (300 giây).
  - `claimFaucet()`: Faucet thử nghiệm nhận 100 `$PIXEL`.
  - `burnFromPlayer(address player, uint256 amount)`: Quyền `BURNER_ROLE` cho phép hợp đồng NFT đốt trực tiếp token của người chơi trong giao dịch mint mà không bắt buộc ký lệnh `approve()` riêng biệt (**1-Click Mint**).

### 2. `FarmItemNFT.sol` (`PFARM`)
- **Tiêu chuẩn**: ERC-721, Ownable, ReentrancyGuard.
- **4 Loại Trang Bị Nông Trại**:
  - `0 - Gold Sickle`: Lưỡi liềm vàng (50 $PIXEL)
  - `1 - Gold Watering Can`: Bình tưới vàng (100 $PIXEL) -> Kích hoạt buff -20% thời gian lớn của cây trong `FarmPlot.ts`
  - `2 - Gold Hoe`: Cuốc vàng (75 $PIXEL)
  - `3 - Golden Fish`: Cá vàng thần tài (150 $PIXEL)
- **Tính năng nổi bật**:
  - `mintWithToken(uint256 itemType)`: Mua NFT bằng token `$PIXEL` chỉ với **1 cú click chuột (1 Transaction duy nhất)**.
  - `getOwnedItems(address user)`: Trả về mảng `bool[4]` trạng thái sở hữu 4 món đồ, phục vụ cầu nối **React -> Phaser Buff Bridge**.

---

## 🛠️ Lệnh Kiểm Thử & Triển Khai

```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Biên dịch hợp đồng
pnpm run compile

# 3. Chạy toàn bộ 15 Unit Tests
pnpm run test

# 4. Triển khai Local (tự động xuất ABI sang front_end/src/web3/abis/)
pnpm run deploy:local

# 5. Triển khai Testnet Polygon Amoy
pnpm run deploy:amoy

# 6. Triển khai Testnet Sepolia
pnpm run deploy:sepolia
```

---

## 🧪 Kết Quả Unit Test (15/15 Passed)
```text
  🌾 Pixel2D GameFi Smart Contracts Test Suite
    1️⃣ Deployment & Initial Configuration
      √ Should set proper roles and initial admin supply
      √ Should link FarmItemNFT to PixelFarmToken correctly
    2️⃣ Daily Testnet Faucet
      √ Should allow player to claim 100 $PIXEL faucet
      √ Should prevent claiming faucet twice within cooldown period
    3️⃣ ECDSA Backend Signature Reward Claiming
      √ Should allow player to claim reward with valid backend signature
      √ Should reject claim if nonce has already been used (Anti-Replay Attack)
      √ Should reject claim signed by an unauthorized entity
      √ Should reject claim with expired deadline
      √ Should reject claim exceeding maxClaimCap (100 Coins)
      √ Should enforce 300-second cooldown between claims
    4️⃣ 1-Click NFT Minting & Buff Bridge
      √ Should 1-Click Mint NFT by burning $PIXEL WITHOUT prior approve()
      √ Should correctly report getOwnedItems for React->Phaser buff bridge
      √ Should prevent double purchasing the same item type
      √ Should revert if player has insufficient $PIXEL balance
      √ Should return correct tokenURI metadata link

  15 passing (933ms)
```
