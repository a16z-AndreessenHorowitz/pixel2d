# 🎬 KỊCH BẢN BÁO CÁO & DEMO ĐỒ ÁN PIXEL2D GAMEFI

> **Đề tài**: Xây dựng Game Nông Trại 2D Kết Hợp Công Nghệ Blockchain (Pixel2D GameFi)
> **Kiến trúc**: 3 Tầng hoàn chỉnh (Frontend React 19 + Phaser 4 | Backend Express 5 + SQLite | Smart Contracts Solidity 0.8.24)
> **Phiên bản**: v3.1 (Đã bổ sung chuẩn hóa môi trường, xử lý dependencies và cấu hình ví MetaMask chi tiết)

---

## 📌 PHẦN 1: CHUẨN BỊ MÔI TRƯỜNG & KHỞI CHẠY HỆ THỐNG (5 - 7 PHÚT)

### ⚠️ Bước 0: Yêu cầu môi trường & Cài đặt thư viện (BẮT BUỘC KHI MỚI PULL CODE)

1. **Phiên bản Node.js yêu cầu**:
* Bắt buộc sử dụng **Node.js LTS (v20.x hoặc v22.x)** (khuyến nghị `v22.23.4`).
* *Lưu ý*: Không dùng Node.js quá mới (v24+) vì thư viện SQLite C++ native (`better-sqlite3`) sẽ không tương thích prebuilt binary trên Windows.


2. **Cài đặt dependencies cho từng module**:
```bash
# 1. Cài đặt thư mục gốc và smart contracts
pnpm install

# 2. Cài đặt Backend (dùng cờ --ignore-scripts để bỏ qua build native C++ nếu chưa cài VS Build Tools)
cd backend
pnpm install --ignore-scripts
cd ..

# 3. Cài đặt Frontend (đảm bảo đã có ethers.js v6)
cd front_end
pnpm install
cd ..

```



---

### 🦊 Bước 0.1: Cấu hình ví MetaMask (Chuẩn bị trước khi bật game)

1. **Thêm mạng Hardhat Localhost vào MetaMask**:
* Mở MetaMask > Bấm vào bộ chọn mạng > **Add network** > **Add a network manually**:


* **Network Name**: `Hardhat Localhost`


* **RPC URL**: `[http://127.0.0.1:8545](http://127.0.0.1:8545)`


* **Chain ID**: `31337`


* **Currency Symbol**: `ETH`




* Bấm **Save**.




2. **Import ví thử nghiệm Hardhat (Có sẵn 10,000 ETH test)**:
* Trên MetaMask > Bấm vào danh sách tài khoản > Bấm **Add wallet** > **Import account**.


* Dán chuỗi Private Key của **Account #0** mặc định:
```text
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

```


* Bấm **Import** để hoàn tất.





---

### Cách Khởi Chạy Nhanh (Khuyên Dùng):

Nhấp đúp chuột vào file **[`run_all.bat`](https://www.google.com/search?q=./run_all.bat)** tại thư mục gốc!

File batch sẽ tự động bật 3 cửa sổ: Hardhat Node (port 8545), Backend API (port 4000), Frontend (port 5173), đồng thời tự động deploy Smart Contracts và mở trình duyệt tới `http://localhost:5173`.

*(Nếu cần khởi chạy thủ công từng terminal: xem hướng dẫn 3 terminal bên dưới)*

### Terminal 1: Khởi động Local Blockchain & Deploy Smart Contracts

```bash
# 1. Chạy mạng blockchain cục bộ (tạo 20 tài khoản test với 10,000 ETH)
# Giữ nguyên terminal này, KHÔNG được tắt trong suốt quá trình demo
pnpm run contracts:node

# 2. Mở một tab terminal khác để deploy contracts lên localhost:
pnpm run contracts:deploy

```

> *Ghi chú*: Khi chạy `pnpm run contracts:node`, chọn `n` (hoặc `y`) khi được hỏi về telemetry. Lệnh deploy sẽ tự động biên dịch hợp đồng và xuất địa chỉ + ABI TypeScript trực tiếp sang `front_end/src/web3/abis/contracts.ts`.
> 
> 

### Terminal 2: Khởi động Backend Server & Web3 Signer

```bash
pnpm run backend
# hoặc: cd backend && pnpm dev

```

> *Ghi chú*: Server chạy tại `http://localhost:4000`, tự động kết nối cơ sở dữ liệu SQLite (`backend/data/pixel_farm.db`), tự seed 5 loại hạt giống mặc định và nạp Private Key signer.
> 
> 

### Terminal 3: Khởi động Game Frontend

```bash
pnpm run frontend
# hoặc: cd front_end && pnpm run dev

```

> *Ghi chú*: Mở trình duyệt tại `http://localhost:5173`.
> 
> 

---

## 🚀 PHẦN 2: KỊCH BẢN DEMO 6 BƯỚC CHUẨN CHẤM ĐIỂM (10 - 15 PHÚT)

### 🌾 BƯỚC 1: GIỚI THIỆU GAMEPLAY NÔNG TRẠI & CÂU CÁ (IN-GAME LOOP)

* **Hành động**:
1. Điều khiển nhân vật di chuyển bằng phím `W, A, S, D` (hoặc cụm phím ảo D-pad trên mobile/cảm ứng).


2. Chọn công cụ **Cuốc đất (Hoe)** -> Click ô đất để xới đất.


3. Chọn **Hạt giống Bắp (Corn Seed)** -> Gieo hạt xuống luống đất.


4. Chọn **Bình tưới nước (Watering Can)** -> Tưới nước cho đất ẩm. Quan sát cây bắp lớn qua các giai đoạn trong 15 giây.


5. Dùng **Lưỡi liềm (Sickle)** thu hoạch -> Điểm Coin tăng lên, nông sản thu hoạch được cộng dồn vào Kho đồ (bấm phím `I` để mở kho đồ).


6. Di chuyển sang bờ hồ nước phía đông, chọn **Cần câu cá (Fishing Rod)** và click vào mặt nước. Minigame câu cá xuất hiện -> Giật cần câu trúng cá -> Nhận Coin và cá vào kho đồ.


7. Click vào biển gỗ nhiệm vụ -> Mở **Bảng Nhiệm Vụ Tương Tác (Quest Modal)** -> Bấm "Nhận thưởng" để nhận thêm Coin.




* **Lời thoại giải thích**:
> *"Kính thưa thầy cô, gameplay của Pixel2D đã được hoàn thiện mượt mà với đầy đủ vòng lặp kinh tế nông trại: Gieo hạt, Tưới nước, Thu hoạch nông sản, Minigame câu cá, và Hệ thống nhiệm vụ. Mọi tài nguyên như hạt giống, nông sản và cá đều được quản lý theo mô hình phân loại vật phẩm có thể gộp stack."*
> 
> 



---

### 🛒 BƯỚC 2: CỬA HÀNG HẠT GIỐNG & KIỂM CHỨNG BẢO MẬT SERVER-SIDE

* **Hành động**:
1. Trên thanh công cụ dưới đáy màn hình, click vào nút `🛒 Cửa hàng`.


2. Modal hiển thị 5 loại hạt giống: Bắp, Lúa, Dâu Tây, Bí Ngô, Dưa Hấu.


3. Chọn mua gói Hạt giống Dâu Tây (giá 25 Coins) -> Bấm "Mua Gói (5 Hạt)".


4. Quan sát số Coin bị trừ chính xác và 5 hạt giống được tự động đưa vào Toolbar hoặc Inventory.




* **Lời thoại giải thích**:
> *"Để đảm bảo tính toàn vẹn và chống hack số dư ở tầng client, toàn bộ logic mua sắm hạt giống được xác thực Server-side tại API `POST /api/shop/buy`. Server kiểm tra số dư Coin trong SQLite, trừ tiền an toàn và tự động tính toán vị trí còn trống trong kho đồ trước khi phản hồi."*
> 
> 



---

### 🦊 BƯỚC 3: KẾT NỐI VÍ METAMASK & NHẬN FAUCET THỬ NGHIỆM

* **Hành động**:
1. Tại thanh điều hướng Navbar trên cùng, bấm nút **"Kết Nối Ví MetaMask"**.


2. Cửa sổ MetaMask bật lên:
* Nhập mật khẩu để **Unlock** ví (nếu đang khóa)[cite: 8].
* Chọn tài khoản test vừa import (`Imported Account 1 - 0xf39Fd...`) và bấm **Connect**[cite: 10, 12].
* **Lưu ý quan trọng**: Đảm bảo tab `localhost:5173` đang chọn đúng mạng **Hardhat Localhost**[cite: 7, 12] (nếu ở góc dưới MetaMask hiện icon mạng khác như Sepolia thì bấm chuyển sang Hardhat)[cite: 13, 15].


3. Sau khi kết nối thành công, Navbar cập nhật hiển thị:


* Địa chỉ ví rút gọn: `0xf3...2266`.


* Số dư token on-chain ban đầu: `💎 0 $PIXEL`[cite: 7, 9].


4. Bấm nút **`💧 Faucet`** trên Navbar -> Cửa sổ MetaMask hiện ra yêu cầu gọi hàm `claimFaucet()`[cite: 7, 9].
5. Bấm **Confirm** trên MetaMask.


6. Sau khi giao dịch hoàn tất, số dư token trên thanh Navbar lập tức nhảy lên **`💎 100 $PIXEL`**!




* **Lời thoại giải thích**:
> *"Hệ thống tích hợp chuẩn SIWE (Sign-In with Ethereum) qua Ethers.js v6. Đồng thời, Smart Contract `PixelFarmToken.sol` tích hợp sẵn hàm `claimFaucet()` cấp phát 100 $PIXEL thử nghiệm để hội đồng dễ dàng kiểm thử các tính năng Web3 mà không cần nạp tiền thật."*
> 
> 



---

### 🪙 BƯỚC 4: QUY ĐỔI COIN TRONG GAME THÀNH TOKEN ON-CHAIN (ECDSA SIGNER)

* **Hành động**:
1. Bấm nút `🔄 Rút $PIXEL` trên Navbar (hoặc biểu tượng `🪙` trên Toolbar).


2. Modal **"Đổi In-Game Coin sang $PIXEL"** xuất hiện.


3. Chọn nút nhanh `50 Coins`. Tỷ lệ quy đổi hiển thị rõ ràng: 1 Coin = 1 $PIXEL.


4. Bấm **"Xác Nhận Rút 50 $PIXEL"**:


* Bước 1/3: Frontend gửi yêu cầu đến Backend (`POST /api/web3/create-claim-signature`).


* Bước 2/3: Backend kiểm tra số dư DB, kiểm tra hạn mức Cap (tối đa 100), kiểm tra Cooldown (300s), trừ 50 Coin trong DB và ký chữ ký số ECDSA secp256k1 bằng Private Key của Server.


* Bước 3/3: MetaMask mở lên với hàm `claimFarmingReward(...)`. Người chơi xác nhận.




5. Giao dịch thành công: Số dư In-Game Coin giảm đi 50, số dư on-chain tăng thêm 50 `$PIXEL`.


6. Hệ thống chặn lại và thông báo: *"Thời gian hồi: Còn lại 300s!"*.




* **Lời thoại giải thích**:
> *"Đây là một trong những điểm sáng tạo cốt lõi của đồ án. Để giải quyết triệt để lỗi bảo mật người chơi tự gọi Smart Contract rút token tùy tiện, chúng em áp dụng kiến trúc **ECDSA Cryptographic Signer**. Smart Contract chỉ mint token khi có chữ ký số hợp lệ từ Backend Server, kết hợp lưu trữ Nonce chống tấn công Replay Attack và áp dụng Cooldown 300 giây."*
> 
> 



---

### ✨ BƯỚC 5: CƠ CHẾ 1-CLICK MINT NFT NÔNG CỤ (KHÔNG CẦN APPROVE)

* **Hành động**:
1. Bấm nút `✨ NFT Shop` trên Navbar.


2. Modal xuất hiện 4 vật phẩm NFT nông cụ cấp Gold:


* Lưỡi Liềm Vàng (50 $PIXEL)


* **Bình Tưới Vàng (100 $PIXEL)** -> Có tag hiệu ứng: *"-20% Thời Gian Lớn Của Cây"*


* Cuốc Đất Vàng (75 $PIXEL)


* Cá Vàng May Mắn (150 $PIXEL)




3. Tại thẻ **Bình Tưới Vàng**, bấm nút **"1-Click Mint (100 $PIXEL)"**.


4. Cửa sổ MetaMask hiện lên **chỉ đúng 1 transaction duy nhất**.


5. Bấm Xác nhận -> Giao dịch hoàn tất trong 1 giây! Thẻ chuyển sang trạng thái xanh lá: **"✓ ĐÃ SỞ HỮU (Buff ON)"**.




* **Lời thoại giải thích**:
> *"Trong các dApp thông thường, người chơi phải thực hiện 2 giao dịch riêng biệt: giao dịch 1 là `approve()` token, giao dịch 2 mới là `mint()`, gây tốn phí gas gấp đôi và làm đứt đoạn trải nghiệm game. Trong đồ án này, chúng em đã tối ưu kiến trúc bằng cách cấp quyền `BURNER_ROLE` cho hợp đồng `FarmItemNFT.sol`. Nhờ đó, người chơi chỉ cần ký đúng **1 cú click chuột duy nhất (1-Click Mint)**, hợp đồng sẽ tự động đốt $PIXEL và mint NFT ngay lập tức!"*
> 
> 



---

### ⚡ BƯỚC 6: KIỂM CHỨNG CẦU NỐI BUFF NFT TRỰC TIẾP XUỐNG PHASER (REACT -> PHASER)

* **Hành động**:
1. Đóng modal NFT Shop, quay lại màn hình nông trại.


2. Mở Console trình duyệt (F12) để hội đồng quan sát sự kiện `web3-buff-updated` được kích hoạt với `{ hasGoldWateringCan: true }`.


3. Gieo một hạt giống bắp mới xuống đất đã xới và tưới nước.


4. Quan sát bộ đếm thời gian: Thời gian lớn của cây bắp rút ngắn từ 15 giây xuống chỉ còn **12 giây** (-20% Grow Duration)!


5. Cây chín sớm hơn rõ rệt ngay trước mắt người xem.




* **Lời thoại giải thích**:
> *"Sự kết hợp giữa Web3 và Game Engine được đồng bộ hóa hoàn hảo qua Cầu nối sự kiện thời gian thực. Bất cứ khi nào người chơi sở hữu NFT on-chain, React hook sẽ đồng bộ xuống Phaser Engine để kích hoạt chỉ số Buff gia tốc sinh trưởng. Đây là minh chứng rõ nhất cho giá trị sử dụng thực tế (In-Game Utility) của tài sản NFT trong GameFi chứ không chỉ mang tính đầu cơ."*
> 
> 



---

## ❓ PHẦN 3: BỘ CÂU HỎI PHẢN BIỆN THƯỜNG GẶP (FAQ & DEFENSE)

### Câu 1: Làm thế nào hệ thống ngăn chặn người chơi gian lận tự gọi hàm `claimFarmingReward` trên Blockchain để lấy token miễn phí?

**Trả lời**:

> Trong hợp đồng `PixelFarmToken.sol`, hàm `claimFarmingReward` sử dụng thư viện `ECDSA` và `MessageHashUtils` của OpenZeppelin. Nó giải mã chữ ký số được truyền vào và so khớp với địa chỉ `backendSigner` (có quyền `SIGNER_ROLE`). Vì chỉ có Backend Server nắm giữ Private Key bí mật để tạo chữ ký sau khi đã kiểm tra và trừ coin trong Database, nên dù người chơi có lấy mã nguồn contract gọi trực tiếp qua MetaMask hay Etherscan cũng không thể qua mặt được bước kiểm tra chữ ký này.
> 
> 

### Câu 2: Nếu hacker bắt gói tin HTTP chứa chữ ký số của server, họ có thể gọi lại nhiều lần để rút tiền liên tục (Replay Attack) không?

**Trả lời**:

> Hoàn toàn không thể. Mỗi chữ ký số được gắn với một số `nonce` ngẫu nhiên duy nhất và thời hạn `deadline` (1 giờ). Trong Smart Contract, chúng em duy trì `mapping(uint256 => bool) public usedNonces`. Ngay khi giao dịch claim đầu tiên thành công, `usedNonces[nonce]` lập tức được set thành `true`. Nếu hacker gửi lại chữ ký cũ, giao dịch thứ hai sẽ lập tức bị revert với lỗi `"Nonce already used"`. Ngoài ra, contract còn có ràng buộc Cooldown 300 giây giữa 2 lần rút liên tiếp.
> 
> 

### Câu 3: Tại sao lại chọn cơ chế 1-Click Mint thay vì luồng `approve` + `transferFrom` truyền thống của ERC-20?

**Trả lời**:

> Chuẩn `approve` truyền thống yêu cầu 2 lần xác nhận trên ví, tạo ra rào cản UX rất lớn đối với game thủ phổ thông và làm tăng gấp đôi chi phí gas. Bằng cách triển khai mô hình phân quyền `AccessControl` (`BURNER_ROLE`), hợp đồng NFT được ủy quyền đốt token của chính người gọi hàm mint mà không cần cấp quyền allowance riêng. Điều này vừa tối ưu 50% chi phí gas, vừa mang lại trải nghiệm mượt mà đúng chuẩn Web 2.5 cho GameFi.
> 
> 

### Câu 4: Dữ liệu nào được lưu On-Chain và dữ liệu nào lưu Off-Chain (Database)?

**Trả lời**:

> Đồ án tuân thủ nghiêm ngặt nguyên tắc thiết kế Hybrid Web 2.5:
> 
> 
> * **Off-Chain (SQLite Database)**: Lưu trữ các thao tác diễn ra liên tục với tần suất cao như tọa độ di chuyển nhân vật, gieo hạt, tưới nước, số dư Coin thường, và tiến độ quest để đảm bảo game chạy đạt 60 FPS không có độ trễ và không tốn phí gas.
> 
> 
> * **On-Chain (Blockchain)**: Chỉ lưu trữ các tài sản có giá trị thanh khoản cao như Token thưởng `$PIXEL` (chuẩn ERC-20) và các Nông cụ NFT (chuẩn ERC-721) để đảm bảo tính minh bạch, quyền sở hữu thực sự và khả năng giao dịch tự do cho người chơi.
> 
> 
> 
>