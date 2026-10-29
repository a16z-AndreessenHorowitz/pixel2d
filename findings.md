# BÁO CÁO CÁC PHÁT HIỆN KỸ THUẬT & RỦI RO (FINDINGS - v3.0)

> **Dự án**: Pixel2D GameFi - Nông Trại 2D Blockchain  
> **Tài liệu**: Tổng hợp các phát hiện thực tế, kiến trúc 3 tầng và giải pháp bảo mật

---

## 1. PHÁT HIỆN VỀ KIẾN TRÚC 3 TẦNG & BẢO MẬT

### 1.1 Vai trò của Backend Signer trong việc chống Hack và Cheating (Security Critical)
- **Vấn đề**: Nếu Frontend gọi thẳng Smart Contract để claim token dựa vào số Coin đang có ở client, bất kỳ người chơi nào cũng có thể sửa biến JavaScript hoặc dùng Postman/MetaMask gọi trực tiếp Smart Contract để mint vô hạn Token `$PIXEL`.
- **Giải pháp v3.0**:
  - Xây dựng tầng **Backend Signer (`backend/`)**:
    - Backend lưu trữ và xác thực logic game (thu hoạch lúa, câu cá được bao nhiêu coin).
    - Khi người chơi yêu cầu rút token, Backend kiểm tra số dư coin trong Database, khấu trừ coin và dùng Private Key của Server ký một thông điệp mã hóa EIP-712/ECDSA (`playerAddress`, `amount`, `nonce`, `deadline`).
    - Smart Contract `PixelFarmToken.sol` chỉ chấp nhận mint/transfer token khi chữ ký giải mã ra đúng địa chỉ của Backend Signer.

---

### 1.2 Nhu cầu Cửa Hàng Hạt Giống (Seed Shop) & Vòng lặp Kinh tế Khép kín (Economic Loop)
- **Vấn đề**: Hiện tại người chơi có sẵn 10 hạt giống của mỗi loại cây và không bị trừ khi gieo. Điều này làm mất đi tính hấp dẫn của gameplay nông trại.
- **Giải pháp v3.0**:
  - Gieo hạt sẽ trừ số lượng hạt trong kho đồ.
  - Xây dựng **Shop Hạt Giống In-Game** kết nối API Backend (`GET /api/shop/items`, `POST /api/shop/buy`):
    - Người chơi dùng chính In-Game Coin thu hoạch được để mua thêm hạt giống (Bắp: 5 coin, Lúa: 8 coin, Dâu: 12 coin,...).
    - Tạo nên vòng lặp kinh tế nông trại chân thực: *Gieo hạt -> Chăm sóc -> Thu hoạch -> Bán lấy Coin -> Mua thêm hạt giống hoặc Đổi sang Token on-chain*.

---

### 1.3 Cơ chế 1-Click Mint NFT (Loại bỏ bước Approve ERC-20)
- **Vấn đề**: Chuẩn ERC-20 bắt buộc 2 giao dịch: Người dùng phải ký `approve(nftContractAddress, price)` rồi mới gọi `mint(itemId)`. Điều này làm gián đoạn trải nghiệm demo đồ án.
- **Giải pháp v3.0**:
  - `PixelFarmToken.sol` trao quyền `BURNER_ROLE` cho `FarmItemNFT.sol`.
  - Trong hàm `mintWithToken(itemType)` trên `FarmItemNFT`, contract NFT sẽ gọi `burnFrom(msg.sender, price)` và đúc NFT ngay trong **1 giao dịch duy nhất**.

---

### 1.4 Cầu nối Buff NFT (React -> Phaser)
- **Vấn đề**: NFT nếu chỉ nằm trong ví sẽ không có giá trị thực tế đối với gameplay.
- **Giải pháp v3.0**:
  - React hook quét trạng thái sở hữu qua `getOwnedItems(address)` trên Smart Contract và bắn event `web3-buff-updated` xuống Phaser.
  - Phaser tự động giảm 20% thời gian cây sinh trưởng (`growDurationMs * 0.8`) khi ví có Bình tưới vàng, và đổi skin công cụ trên Toolbar sang bộ Gold.

---

## 2. PHÁT HIỆN VỀ QUY TRÌNH GIT & MÔI TRƯỜNG BUILD

### 2.1 Quy tắc Git bất biến (Git Safety)
- Nhánh `main` và nhánh remote `origin/Fishing` được bảo vệ nguyên vẹn 100%.
- Toàn bộ quá trình code diễn ra trên nhánh độc lập: `feat/blockchain-gamefi`.

### 2.2 Tách biệt môi trường Hardhat & TypeScript 6.0
- Frontend chạy TypeScript 6.0.3 nghiêm ngặt (`erasableSyntaxOnly`, `noUnusedLocals`).
- Thư mục `contracts/` và `backend/` được tổ chức độc lập ở cấp root, có `package.json` và cấu hình riêng biệt, không xung đột biên dịch với `front_end/`.

### 2.3 Lỗi TypeScript Build hiện tại cản trở lệnh `pnpm build` (`TS6133`)
- `FarmPlot.ts` (dòng 39): `waterRipple`.
- `FarmScene.ts` (dòng 5): `CropId`.
- `GamePage.tsx` (dòng 48): `getToolbarItem`.
- Cần dọn dẹp ngay ở Phase 1 để đảm bảo lệnh `pnpm run build` kết thúc với exit code 0.

### 2.4 Lỗi Routing `App.tsx`
- Cần thêm `<Route path="/game" element={<GamePage />} />` vào `App.tsx` để menu Navbar không bị redirect lặp.

### 2.5 Kích hoạt phím ảo D-pad cho Mobile
- `GamePage.css` đã có style `.game-controls`, `Player.ts` đã có event `farm-control`. Cần render các nút D-pad vào JSX của `GamePage.tsx`.
