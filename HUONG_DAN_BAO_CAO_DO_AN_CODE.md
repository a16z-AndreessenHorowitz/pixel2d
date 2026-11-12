# 🌾 BÍ KÍP BẢO VỆ ĐỒ ÁN & TÀI LIỆU ĐẶC TẢ TOÀN BỘ CHỨC NĂNG MÃ NGUỒN (PIXEL2D GAMEFI)

> **Dành cho**: Nhóm phát triển dự án `Pixel2D`  
> **Mục đích**: Nắm vững 100% luồng hoạt động của mã nguồn, tự tin giải trình và phản biện mọi câu hỏi của giáo viên / hội đồng chấm đồ án mà không sợ bị hỏi bất ngờ.  
> **Môi trường**: Sepolia Testnet (Blockchain) | MongoDB Atlas (Database Cloud) | Node.js Express (Backend) | React + Vite + Phaser 3 (Frontend)

---

## MỤC LỤC
1. [Tổng quan Kiến trúc Hệ thống (Architecture Overview)](#1-t%E1%BB%95ng-quan-ki%E1%BA%BFn-tr%C3%BAc-h%E1%BB%87-th%E1%BB%91ng)
2. [Chi tiết Chức năng 1: Xác thực người dùng (SIWE Web3 & Tài khoản truyền thống)](#ch%E1%BB%A9c-n%C4%83ng-1-x%C3%A1c-th%E1%BB%B1c-ng%C6%B0%E1%BB%9Di-d%C3%B9ng-authentication)
3. [Chi tiết Chức năng 2: Nông trại & Trồng trọt (Farming & Plot Grid)](#ch%E1%BB%A9c-n%C4%83ng-2-n%C3%B4ng-tr%E1%BA%A1i--tr%E1%BB%93ng-tr%E1%BB%8Dt-farming-system)
4. [Chi tiết Chức năng 3: Quản lý Kho đồ & Kéo thả (Inventory & Toolbar Drag-Drop)](#ch%E1%BB%A9c-n%C4%83ng-3-kho-%C4%91%E1%BB%93--thanh-c%C3%B4ng-c%E1%BB%A5-inventory-system)
5. [Chi tiết Chức năng 4: Thể lực, Cấp độ & Ăn hồi phục (Energy & XP Progression)](#ch%E1%BB%A9c-n%C4%83ng-4-th%E1%BB%83-l%E1%BB%B1c-c%E1%BA%A5p-%C4%91%E1%BB%99--h%E1%BB%93i-ph%E1%BB%A5c)
6. [Chi tiết Chức năng 5: Cửa hàng Nông sản & Mua bán Hạt giống (Shop System)](#ch%E1%BB%A9c-n%C4%83ng-5-c%E1%BB%ADa-h%C3%A0ng-n%C3%B4ng-nghi%E1%BB%87p-shop)
7. [Chi tiết Chức năng 6: Minigame Câu cá (Fishing Minigame)](#ch%E1%BB%A9c-n%C4%83ng-6-minigame-c%C3%A2u-c%C3%A1-fishing)
8. [Chi tiết Chức năng 7: Nhiệm vụ & Đối thoại NPC (Quests & NPCs)](#ch%E1%BB%A9c-n%C4%83ng-7-nhi%E1%BB%87m-v%E1%BB%A5--npc-%C4%91%E1%BB%91i-tho%E1%BA%A1i)
9. [Chi tiết Chức năng 8: Lớp học Trắc nghiệm Blockchain (Learn-to-Earn Quiz)](#ch%E1%BB%A9c-n%C4%83ng-8-tr%E1%BA%AFc-nghi%E1%BB%87m-blockchain-quiz)
10. [Chi tiết Chức năng 9: Rút Token & Ký số EIP-712 (Web3 & Token Exchange)](#ch%E1%BB%A9c-n%C4%83ng-9-r%C3%BAt-token--k%C3%BD-s%E1%BB%91-eip-712-web3)
11. [Chi tiết Chức năng 10: Âm thanh Retro 8-bit bằng Web Audio API](#ch%E1%BB%A9c-n%C4%83ng-10-%C3%A2m-thanh-8-bit-retro-sound-engine)
12. [Bộ 15 Câu hỏi Giáo viên hay hỏi nhất & Câu trả lời mẫu (FAQ Phản Biện)](#12-b%E1%BB%99-c%C3%A2u-h%E1%BB%8Fi-gi%C3%A1o-vi%C3%AAn-hay-h%E1%BB%8Fi-nh%E1%BA%A5t--c%C3%A2u-tr%E1%BA%A3-l%E1%BB%9Di-m%E1%BA%ABu)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

### Sơ đồ luồng dữ liệu toàn cảnh (Data Flow)
```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         NGƯỜI DÙNG (TRÌNH DUYỆT WEB)                           │
│  ┌───────────────────────────────┐     ┌────────────────────────────────────┐  │
│  │   Giao diện UI (React 19)     │     │      Engine Game (Phaser 3)        │  │
│  │  HUD, Kho đồ, 7 Modal Popups  │◄───►│  24 Ô đất, Động vật AI, NPC, Hồ cá │  │
│  └──────────────┬────────────────┘     └────────────────────────────────────┘  │
│                 │ (Custom Events Bridge: farm-harvest, farm-action-energy...)  │
└─────────────────┼───────────────────────────────────────────────┬──────────────┘
                  │                                               │
           (REST API HTTP/JSON)                           (Ethers.js RPC)
                  │                                               │
                  ▼                                               ▼
┌─────────────────────────────────────┐         ┌────────────────────────────────┐
│         BACKEND EXPRESS.JS          │         │      BLOCKCHAIN SEPOLIA        │
│  ┌───────────────────────────────┐  │         │  ┌──────────────────────────┐  │
│  │ Routes (Controllers)          │  │         │  │ Smart Contract           │  │
│  ├───────────────────────────────┤  │         │  │ PixelFarmToken (ERC-20)  │  │
│  │ Services (Business Logic)     │──┼────────►│  │                          │  │
│  │ EIP-712 Signer, SIWE, Quiz... │  │(Sign EIP│  │ • claimFaucet()          │  │
│  └──────────────┬────────────────┘  │  712)   │  │ • claimFarmingReward()   │  │
│                 │                   │         │  └──────────────────────────┘  │
│                 ▼                   │         └────────────────────────────────┘
│  ┌───────────────────────────────┐  │
│  │ Database: MongoDB Atlas       │  │
│  │ Users, GameStates, TxHistory  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Tại sao lại chọn mô hình GameFi Lai (Hybrid On-chain & Off-chain)?
* **Vấn đề của On-chain 100%**: Nếu mỗi lần cuốc đất, gieo hạt, tưới nước đều bắt người chơi ký ví và trả phí gas thì game sẽ cực kỳ lag (phải chờ xác nhận block 12s) và tốn hàng chục USD tiền gas mỗi ngày.
* **Giải pháp Hybrid của dự án**:
  - **Off-chain**: Các hoạt động trồng trọt, tưới cây, câu cá, di chuyển, thể lực diễn ra tức thì (0ms, 0 đồng phí gas) và được lưu vào cơ sở dữ liệu MongoDB Atlas.
  - **On-chain**: Khi người chơi tích lũy đủ Coin và muốn quy đổi thành giá trị thực, họ rút thành **$PIXEL Token (ERC-20)** về ví cá nhân thông qua chữ ký số mã hóa **EIP-712**.

---

## CHỨC NĂNG 1: XÁC THỰC NGƯỜI DÙNG (AUTHENTICATION)

### 1. Mục đích chức năng
Cho phép người chơi đăng nhập bằng 2 hình thức:
1. **Ví Web3 MetaMask (SIWE - Sign-In with Ethereum)**: Đăng nhập bảo mật cao, không cần mật khẩu, định danh bằng địa chỉ ví on-chain.
2. **Tài khoản truyền thống (Username/Password)**: Dành cho người chơi chưa có ví Web3, có hỗ trợ liên kết ví sau này.

### 2. Các file code phụ trách
- **Frontend UI & Tabs**:
  - `front_end/src/components/AuthModal.tsx`: Modal điều phối chính chứa 4 tab.
  - `front_end/src/components/auth/SiweTab.tsx`: Giao diện & logic ký số ví MetaMask.
  - `front_end/src/components/auth/LoginTab.tsx`: Form đăng nhập mật khẩu.
  - `front_end/src/components/auth/RegisterTab.tsx`: Form đăng ký tài khoản.
  - `front_end/src/components/auth/ProfileTab.tsx`: Xem profile & Đăng xuất.
- **Backend API & Service**:
  - `backend/src/routes/auth.ts`: Route nhận request `/api/auth/...`
  - `backend/src/services/siweAuthService.ts`: Sinh Nonce, xác thực chữ ký ví bằng `ethers.verifyMessage`.
  - `backend/src/services/userAuthService.ts`: Băm mật khẩu SHA-256 + Salt, tạo User, cấp JWT 7 ngày.

### 3. Luồng hoạt động chi tiết (Flow SIWE)
1. Người chơi bấm **"Ký Số Đăng Nhập Bằng MetaMask"**.
2. Frontend gửi request `GET /api/auth/nonce?address=0x...` lên backend.
3. Backend tạo ra một chuỗi ngẫu nhiên `nonce = pixel2d-${Date.now()}-${randomBytes}` và lưu vào MongoDB collection `siwenonces`.
4. Frontend nhận nonce và gọi ví MetaMask bật popup yêu cầu ký chuỗi thông điệp:
   ```text
   Pixel2D GameFi Authentication
   Address: 0x...
   Nonce: pixel2d-1731...
   ```
5. Người chơi bấm "Sign" (Ký) trên MetaMask ➔ Trình duyệt nhận được chuỗi chữ ký `signature` (0x...).
6. Frontend gửi `POST /api/auth/login-wallet` kèm `{ address, signature, message }`.
7. Backend dùng hàm `verifyMessage(message, signature)` để khôi phục địa chỉ ví công khai từ chữ ký.
8. So khớp: Nếu địa chỉ khôi phục khớp với `address` gửi lên ➔ Xác thực thành công 100%!
9. Backend tự động khởi tạo bản ghi `GameStateModel` (tặng 100 Coins khởi nghiệp nếu là tài khoản mới) và cấp JWT token có hạn 7 ngày.

---

## CHỨC NĂNG 2: NÔNG TRẠI & TRỒNG TRỌT (FARMING SYSTEM)

### 1. Mục đích chức năng
Trái tim gameplay của trò chơi. Người chơi chăm sóc 24 ô đất, gieo hạt, tưới nước, chờ cây lớn và thu hoạch để lấy nông sản và Coin/EXP.

### 2. Các file code phụ trách
- `front_end/src/game/objects/FarmPlot.ts`: Đối tượng ô đất trong Phaser (kế thừa `Phaser.GameObjects.Container`).
- `front_end/src/game/managers/PlotGridManager.ts`: Khởi tạo và định vị ma trận 24 ô đất (chia 2 luống đất, mỗi luống 4 cột x 6 hàng).
- `front_end/src/game/data/crops.ts`: Danh mục 5 loại cây: Bắp, Lúa, Dâu tây, Bí đỏ, Dưa hấu.
- `front_end/src/hooks/usePhaserGameBridge.ts`: Nhận event `farm-harvest` từ Phaser để cộng Coin & EXP cho React state.

### 3. Vòng đời của 1 ô đất (State Machine)
```
[empty] (Đất nứt thô) 
   │
   ▼ (Dùng Cuốc 'hoe' - Tốn 2⚡)
[tilled] (Đất đã xới) 
   │
   ▼ (Dùng Hạt giống '*-seed' - Trừ 1 hạt giống trong kho)
[planted] (Đã gieo hạt) 
   │
   ▼ (Dùng Bình tưới 'watering-can' - Tốn 2⚡)
[watered] (Đất sẫm màu nước - Kích hoạt Timer & Progress Bar cây lớn)
   │
   ▼ (Chờ cây sinh trưởng qua 3 giai đoạn frame 1 -> frame 2 -> frame 3)
[mature] (Cây trổ quả chín vàng)
   │
   ▼ (Dùng Liềm 'sickle' hoặc Bàn tay thu hoạch)
[Cộng Nông Sản vào Kho đồ] ➔ [Cộng Coin & EXP] ➔ [Trở về trạng thái 'empty']
```

---

## CHỨC NĂNG 3: KHO ĐỒ & THANH CÔNG CỤ (INVENTORY SYSTEM)

### 1. Mục đích chức năng
Quản lý trang bị công cụ (Cuốc, Bình tưới, Liềm), các loại hạt giống và nông sản thu hoạch được. Hỗ trợ thao tác kéo thả (Drag and Drop) trực quan.

### 2. Các file code phụ trách
- `front_end/src/hooks/useInventoryManager.ts`: Quản lý toàn bộ State kho đồ và logic kéo thả.
- `front_end/src/game/inventory/inventory.ts`: Định nghĩa kích thước kho đồ (24 ô), thanh công cụ (8 ô), lưu trữ vào `localStorage`.
- `front_end/src/pages/GamePage.tsx`: Render thanh Toolbar dưới đáy màn hình và Modal kho đồ (Phím tắt `I`).

### 3. Cơ chế kỹ thuật nổi bật
- **HTML5 Drag & Drop chuẩn**: Sử dụng `event.dataTransfer.setData('application/x-inventory')` để truyền chỉ số slot nguồn sang slot đích mà không cần cài thêm thư viện ngoài nặng nề.
- **Hỗ trợ Stackable thông minh**: Khi kéo thả hạt giống hoặc nông sản cùng loại vào nhau, hệ thống tự động gộp số lượng (`quantity += newQuantity`).
- **Namespace LocalStorage theo ví**: Dữ liệu kho đồ được lưu theo key `pixel_farm_inventory_${address}`. Khi người chơi đổi ví MetaMask hoặc đăng nhập tài khoản khác, kho đồ sẽ chuyển sang đúng người đó, không bị lẫn lộn dữ liệu.

---

## CHỨC NĂNG 4: THỂ LỰC, CẤP ĐỘ & HỒI PHỤC (ENERGY & XP)

### 1. Mục đích chức năng
Tạo tính thử thách (resource management) tương tự tựa game nổi tiếng Pixels.xyz. Người chơi không thể cày cuốc vô hạn mà phải tính toán sử dụng thể lực và ăn nông sản để hồi sức.

### 2. Các file code phụ trách
- `front_end/src/hooks/usePhaserGameBridge.ts`: Lắng nghe event `farm-action-energy`, tính toán Level Up.
- `front_end/src/hooks/useInventoryManager.ts`: Hàm `handleEatItem`.
- `front_end/src/components/TopLeftHUD.tsx`: Thanh hiển thị % Energy (xanh lá/vàng/đỏ) và Level/XP.

### 3. Quy tắc tính toán
- **Tiêu hao**: Mỗi lần cuốc đất hoặc tưới nước tốn **2 điểm Năng lượng (⚡)**.
- **Cơ chế kiệt sức (Exhaustion)**: Khi Năng lượng < 2, hành động bị chặn (`event.preventDefault()`), phát âm thanh kiệt sức `soundEngine.playExhausted()` và hiện popup cảnh báo màu đỏ.
- **Cơ chế Ăn (Eating)**: Người chơi có thể ăn trực tiếp nông sản (Bắp +15⚡, Lúa +10⚡, Dâu +20⚡, Bí đỏ +30⚡, Dưa hấu +40⚡, Cá các loại +18~60⚡).
- **Thăng cấp (Level Up)**:
  $$\text{XP cần lên cấp} = \text{Level hiện tại} \times 100$$
  Khi Level Up: Tự động hồi đầy **100% Năng lượng**, đồng thời **tăng vĩnh viễn +5 Năng lượng tối đa** (Max Energy tăng từ 100 ➔ 105 ➔ 110...).

---

## CHỨC NĂNG 5: CỬA HÀNG NÔNG NGHIỆP (SHOP)

### 1. Mục đích chức năng
Chu chuyển dòng tiền trong game. Người chơi dùng Coin mua hạt giống từ Hazel, trồng trọt và bán lại nông sản thu hoạch để thu lợi nhuận Coin.

### 2. Các file code phụ trách
- `front_end/src/components/ShopModal.tsx`: Giao diện 2 tab (Tab Mua Hạt Giống & Tab Bán Nông Sản).
- `backend/src/routes/shop.ts`: API `/api/shop/items`, `/api/shop/buy`, `/api/shop/sell`.

### 3. Bảng kinh tế hạt giống & thu hoạch
| Loại cây | Giá mua hạt giống | Thời gian lớn | Bán lại nông sản | Lợi nhuận ròng |
|---|:---:|:---:|:---:|:---:|
| **Bắp (Corn)** | 10 Coins | 15 giây | 18 Coins | **+8 Coins** |
| **Lúa (Rice)** | 15 Coins | 25 giây | 28 Coins | **+13 Coins** |
| **Dâu tây (Strawberry)** | 25 Coins | 40 giây | 45 Coins | **+20 Coins** |
| **Bí đỏ (Pumpkin)** | 40 Coins | 60 giây | 75 Coins | **+35 Coins** |
| **Dưa hấu (Watermelon)**| 60 Coins | 90 giây | 115 Coins | **+55 Coins** |

---

## CHỨC NĂNG 6: MINIGAME CÂU CÁ (FISHING)

### 1. Mục đích chức năng
Hoạt động giải trí phụ bên bờ hồ nước (Zone 2). Giúp người chơi kiếm cá để ăn hồi năng lượng hoặc kiếm thêm tiền Coin và EXP.

### 2. Các file code phụ trách
- `front_end/src/game/fishing/fishingSystem.ts`: Máy trạng thái câu cá (`idle` ➔ `casting` ➔ `waiting` ➔ `biting` ➔ `minigame` ➔ `caught`).
- `front_end/src/game/fishing/FishingMinigame.ts`: Vẽ thanh Tension Bar. Người chơi nhấn giữ phím Space / Chuột để giữ thanh cuộn khớp với biểu tượng con cá đang nhảy.
- `front_end/src/game/fishing/FishingPrompt.ts`: Tự động phát hiện khi Player bước vào vùng câu cá và hiện tooltip `[E] Câu cá`.

---

## CHỨC NĂNG 7: NHIỆM VỤ & NPC ĐỐI THOẠI

### 1. Mục đích chức năng
Tạo cốt truyện và hướng dẫn người chơi mới làm quen với nông trại.

### 2. Các file code phụ trách
- `front_end/src/components/DialogueModal.tsx`: Hộp thoại NPC phong cách JRPG đối thoại từng bước.
- `front_end/src/data/dialogues.ts`: Kịch bản đối thoại của **Bác Barney** (Tặng 50 Coins, tặng hạt giống, bí quyết hồi năng lượng) và **Cô Hazel** (Mở shop nông sản).
- `front_end/src/components/QuestPanel.tsx` & `backend/src/routes/quests.ts`: Bảng nhiệm vụ hàng ngày. Có cơ chế **Anti-Replay Claim**: kiểm tra danh sách `completedQuestIds` trong Database để chống nhận đúp phần thưởng.

---

## CHỨC NĂNG 8: TRẮC NGHIỆM BLOCKCHAIN (QUIZ)

### 1. Mục đích chức năng
Chức năng **"Learn-to-Earn"**: Giúp người chơi vừa giải trí vừa trang bị kiến thức bảo mật Web3 (chống lừa đảo phishing, hiểu Seed Phrase, Gas Fee, EIP-712).

### 2. Các file code phụ trách
- `front_end/src/components/QuizModal.tsx`: Giao diện làm bài trắc nghiệm, hiển thị giải thích đáp án.
- `backend/src/constants/quizQuestions.ts`: Ngân hàng 10 câu hỏi chuẩn hóa.
- `backend/src/services/quizService.ts`: Logic chấm điểm.
- `backend/src/routes/quiz.ts`: API `/api/quiz/questions` và `/api/quiz/submit`.

### 3. Cơ chế bảo mật chống gian lận
- Khi client gọi `GET /api/quiz/questions`, Backend **chủ động giấu trường `correctIndex`** của những câu hỏi người chơi chưa làm. Do đó người chơi không thể "Inspect Element / F12" để xem trước đáp án.
- Khi người chơi gửi câu trả lời lên `POST /api/quiz/submit`, Backend mới so khớp:
  - Nếu **Đúng**: Cộng Coin/EXP vào MongoDB Atlas, đánh dấu ID câu hỏi vào mảng `quiz_answered` và trả về lời giải thích chi tiết.
  - Nếu **Sai**: Không trừ tiền, cho phép đọc giải thích để làm lại.
  - Nếu **Đã nhận thưởng trước đó**: Từ chối trả thưởng thêm lần nữa (chống gian lận spam thưởng).

---

## CHỨC NĂNG 9: RÚT TOKEN & KÝ SỐ EIP-712 (WEB3)

### 1. Mục đích chức năng
Trọng tâm công nghệ Blockchain của đồ án. Cho phép quy đổi Coin trong game sang đồng tiền số thật trên mạng thử nghiệm Ethereum Sepolia (`$PIXEL Token`).

### 2. Các file code phụ trách
- **Smart Contract**: `contracts/contracts/PixelFarmToken.sol` (Hợp đồng ERC-20 chuẩn OpenZeppelin có cơ chế Faucet và Claim bằng chữ ký Backend).
- **Backend Signer Service**:
  - `backend/src/services/web3SignerService.ts`: Thuật toán ký EIP-712 Typed Data.
  - `backend/src/services/transactionService.ts`: Xác minh receipt on-chain, Rollback khi hủy và kiểm tra Idempotency khi nạp.
  - `backend/src/constants/exchangePackages.ts`: Các gói đổi thưởng.
- **Frontend Hook & UI**:
  - `front_end/src/web3/useWeb3.ts`: Tương tác ví MetaMask, gọi hàm Smart Contract bằng `ethers.BrowserProvider`.
  - `front_end/src/components/ClaimTokenModal.tsx`: Giao diện chọn gói và rút $PIXEL.
  - `front_end/src/components/GameFiHubModal.tsx`: Bảng điều khiển tài chính Web3.

### 3. Tỷ lệ quy đổi & Các gói nạp/rút
* **Tỷ lệ quy ước chuẩn**: **100 Coins = 1 $PIXEL** (hay **1,000 Coins = 10 $PIXEL**).
* **Các gói nạp rút**:
  - Gói Cơ Bản: 1,000 Coins ➔ 10 $PIXEL
  - Gói Tiêu Chuẩn: 10,000 Coins ➔ 100 $PIXEL
  - Gói Nông Dân Chăm Chỉ: 50,000 Coins ➔ 500 $PIXEL
  - Gói Đại Gia: 100,000 Coins ➔ 1,000 $PIXEL

### 4. Quy trình Rút Token bảo mật bằng Chữ ký số EIP-712
```
NGƯỜI CHƠI                      BACKEND SERVER                      BLOCKCHAIN SEPOLIA
    │                                 │                                      │
    │── 1. Gửi yêu cầu rút coin ────►│                                      │
    │   (POST /create-claim-signature)│                                      │
    │                                 │── 2. Kiểm tra Cooldown (300s)        │
    │                                 │── 3. Kiểm tra số dư Coin trên DB    │
    │                                 │── 4. Tạo Nonce & Deadline (1h)       │
    │                                 │── 5. Ký EIP-712 bằng Private Key     │
    │                                 │── 6. Tạm trừ Coin trong GameState    │
    │◄─ 7. Trả về Signature & Nonce ──│                                      │
    │                                                                        │
    │── 8. Gửi Transaction lên Smart Contract ──────────────────────────────►│
    │      claimFarmingReward(amount, nonce, deadline, signature)            │
    │                                                                        │── 9. Contract giải mã chữ ký
    │                                                                        │      bằng ECDSA.recover
    │                                                                        │── 10. Xác nhận đúng Signer
    │                                                                        │── 11. Mint $PIXEL vào ví
    │◄─ 12. MetaMask báo Giao dịch Thành công (TxHash) ─────────────────────│
    │                                                                        │
    │── 13. Gửi TxHash lên Backend xác nhận (POST /confirm-claim) ──────────►│
    │                                                                        │── 14. Backend query RPC
    │                                                                        │       kiểm tra status == 1
    │                                                                        │── 15. Chuyển trạng thái 'claimed'
    │                                                                        │       Lưu TxHash vào DB
```

> **Cơ chế Rollback an toàn**: Nếu ở Bước 8, người chơi bấm **"Reject" (Từ chối)** trên ví MetaMask, Frontend tự động gửi request `POST /api/web3/claim-reward-rollback`. Backend sẽ ngay lập tức hủy phiên pending và **hoàn trả 100% số Coin về tài khoản game**, đảm bảo người chơi không bao giờ bị mất oan Coin khi lỗi mạng.

---

## CHỨC NĂNG 10: ÂM THANH 8-BIT RETRO (SOUND ENGINE)

### 1. Mục đích chức năng
Tạo trải nghiệm âm thanh chiptune hoài niệm cổ điển (Pixels.xyz / GameBoy) mà **không cần tải bất kỳ file mp3/wav nào từ bên ngoài**, giúp game khởi động cực nhanh và tiết kiệm băng thông mạng.

### 2. File code phụ trách
- `front_end/src/audio/SoundEngine.ts` (Web Audio API Synthesizer).

### 3. Kỹ thuật lập trình
- Sử dụng trực tiếp `AudioContext` của trình duyệt.
- Dùng `OscillatorNode` với các dạng sóng âm thanh retro:
  - `square` (sóng vuông): Tiếng chiptune cổ điển, nốt nhạc BGM.
  - `triangle` (sóng tam giác): Tiếng trầm ấm, bước chân đi dạo.
  - `sine` (sóng sin): Tiếng leng keng nhận tiền xu Coin (`playCoin`).
  - `sawtooth` (sóng răng cưa): Tiếng cắn câu, cuốc đất.
- Điều khiển âm lượng bằng `GainNode.exponentialRampToValueAtTime` để tạo độ vang và tắt âm mượt mà.

---

## 12. BỘ CÂU HỎI GIÁO VIÊN HAY HỎI NHẤT & CÂU TRẢ LỜI MẪU

Dưới đây là 15 câu hỏi điển hình nhất mà giáo viên và hội đồng bảo vệ thường xuyên đặt ra, kèm theo câu trả lời kỹ thuật chuẩn xác:

### ❓ Câu 1: Tại sao nhóm không lưu số dư Coin trực tiếp trên Blockchain mà lại lưu trong MongoDB?
* **Trả lời**: "Dạ thưa thầy/cô, trong thiết kế GameFi hiện đại (như tựa game Pixels.xyz hay Axie Infinity), việc đưa mọi thao tác trong game lên On-chain là bất khả thi vì 2 lý do:
  1. **Tốc độ (Latency)**: Mỗi block trên Ethereum mất 12 giây để xác nhận. Nếu trồng một cây bắp mất 15 giây mà tưới nước cũng phải đợi block thì trải nghiệm chơi game sẽ rất tệ.
  2. **Chi phí (Gas Fee)**: Mỗi giao dịch blockchain đều tốn phí gas (kể cả mạng testnet cũng có giới hạn faucet).
  Do đó, nhóm áp dụng mô hình **Hybrid GameFi**: Gameplay diễn ra tức thì Off-chain trên cơ sở dữ liệu MongoDB Atlas với tốc độ dưới 50ms, và người chơi chỉ đưa tài sản lên On-chain khi muốn rút token $PIXEL về ví cá nhân."

---

### ❓ Câu 2: EIP-712 là gì? Tại sao lại dùng EIP-712 mà không ký một chuỗi text thông thường?
* **Trả lời**: "Dạ thưa thầy/cô:
  - **Ký thông thường (Personal Sign)**: Chỉ ký một chuỗi ký tự thô vô nghĩa (ví dụ `0xabcd...`). Người dùng khi nhìn vào MetaMask không biết mình đang ký cái gì, rất dễ bị tấn công Blind Signing (lừa đảo ký lệnh rút hết tiền ví).
  - **EIP-712 (Typed Structured Data)**: Cho phép ký dữ liệu có cấu trúc định kiểu rõ ràng. Khi popup MetaMask hiện lên, người chơi sẽ nhìn thấy minh bạch từng trường dữ liệu: Số lượng token rút (`amount`), địa chỉ người nhận (`player`), mã giao dịch (`nonce`), và thời hạn hiệu lực (`deadline`). Đồng thời, EIP-712 có cơ chế **Domain Separator** (gắn chặt với `chainId: 11155111` và `contractAddress`), giúp ngăn chặn triệt để tấn công đánh cắp chữ ký để mang sang mạng khác sử dụng."

---

### ❓ Câu 3: Làm thế nào Backend và Smart Contract chống được việc người chơi dùng lại chữ ký cũ để rút tiền nhiều lần (Replay Attack)?
* **Trả lời**: "Dạ thưa thầy/cô, hệ thống có 2 lớp bảo vệ chống Replay Attack:
  1. **Ở Backend**: Mỗi lần tạo chữ ký, backend sinh một mã `nonce` duy nhất dựa trên timestamp và số ngẫu nhiên: `nonce = Date.now() * 1000 + random`. Bản ghi này được lưu trong bảng `ClaimModel` với trạng thái `pending`.
  2. **Ở Smart Contract (`PixelFarmToken.sol`)**: Hợp đồng lưu một `mapping(uint256 => bool) public usedNonces;`. Khi hàm `claimFarmingReward` được gọi, hợp đồng kiểm tra `require(!usedNonces[nonce], "Nonce already used")`. Sau khi mint token xong, hợp đồng lập tức gán `usedNonces[nonce] = true`. Vì vậy, dù hacker có bắt được gói tin chữ ký cũ thì cũng không bao giờ gọi lại được lần thứ hai."

---

### ❓ Câu 4: Nếu người chơi tạo yêu cầu rút token trên web nhưng khi MetaMask hiện lên lại bấm 'Cancel' (Từ chối) thì số Coin trong game có bị mất không?
* **Trả lời**: "Dạ hoàn toàn không bị mất thưa thầy/cô. Nhóm đã thiết kế cơ chế **Transaction Rollback**:
  - Khi tạo chữ ký, Backend chỉ chuyển Coin sang trạng thái tạm khóa (`pending`).
  - Nếu người dùng bấm từ chối trên MetaMask, Frontend sẽ bắt sự kiện từ chối và tự động gửi API `POST /api/web3/claim-reward-rollback`.
  - Backend lập tức chuyển trạng thái claim thành `cancelled` và cộng trả lại 100% số Coin về tài khoản game cho người chơi."

---

### ❓ Câu 5: Cơ chế nạp tiền ($PIXEL Token ➔ Coins game) chống nạp trùng (Idempotency) như thế nào?
* **Trả lời**: "Dạ, ở endpoint `POST /api/web3/verify-deposit`, Backend kiểm tra biến `txHash`:
  1. Tìm trong bảng `TransactionModel`: Nếu `txHash` này đã từng tồn tại trong hệ thống thì từ chối ngay lập tức với lỗi `Giao dịch đã được xử lý trước đó`.
  2. Đọc trực tiếp receipt từ RPC Node Sepolia để kiểm tra `status === 1` (đã đào thành công), kiểm tra `transferLog` xem có đúng gửi tới địa chỉ Vault của game hay không, rồi mới cộng Coin. Điều này ngăn chặn việc người chơi làm giả giao dịch hoặc gửi mã tx rác."

---

### ❓ Câu 6: Làm thế nào game React giao tiếp được với Engine 2D Phaser 3 khi 2 công nghệ này chạy song song?
* **Trả lời**: "Dạ, nhóm xây dựng tầng cầu nối **Phaser-React Event Bridge** thông qua hệ thống sự kiện chuẩn của trình duyệt (`window.dispatchEvent` và `CustomEvent`):
  - Khi trong Phaser người chơi cuốc đất hoặc gieo hạt: Phaser bắn ra `new CustomEvent('farm-action-energy', { detail: { cost: 2 } })`.
  - Ở phía React, Custom Hook `usePhaserGameBridge.ts` lắng nghe sự kiện này để trừ thể lực trên thanh HUD.
  - Ngược lại, khi người chơi chọn công cụ số 1, 2, 3 trên Toolbar React: React bắn ra `farm-tool-changed` để thông báo cho Scene Phaser chuyển đổi dụng cụ cầm trên tay."

---

### ❓ Câu 7: Tại sao nhóm lại chia Backend thành Routes và Services thay vì viết chung trong 1 file như trước?
* **Trả lời**: "Dạ, ban đầu khi viết chung, file route dài gần 500 dòng và vi phạm nguyên lý **Single Responsibility (Đơn trách nhiệm)**. Nhóm đã tái cấu trúc theo mô hình **3-Layer Architecture**:
  - **Routes**: Đóng vai trò Controller, chỉ làm nhiệm vụ nhận Request, kiểm tra tham số đầu vào và trả Response HTTP.
  - **Services** (`web3SignerService`, `siweAuthService`, `transactionService`): Đóng gói toàn bộ thuật toán nghiệp vụ. Nhờ vậy code rất sáng sủa, dễ viết Unit Test độc lập và khi báo cáo đồ án có thể trình bày từng thuật toán rất rõ ràng."

---

### ❓ Câu 8: Mật khẩu người dùng trong cơ sở dữ liệu được bảo mật như thế nào?
* **Trả lời**: "Dạ, mật khẩu tuyệt đối không bao giờ lưu dưới dạng văn bản thô (plain-text). Backend sử dụng thuật toán băm mật mã **SHA-256 kết hợp Khóa bí mật Salt** (`CONFIG.JWT_SECRET`):
  ```ts
  crypto.createHash('sha256').update(password + CONFIG.JWT_SECRET).digest('hex')
  ```
  Dù kẻ tấn công có truy cập được vào cơ sở dữ liệu MongoDB thì cũng không thể giải mã ngược lại được mật khẩu gốc của người dùng."

---

### ❓ Câu 9: Cơ chế xác thực SIWE (Sign-In with Ethereum) hoạt động ra sao và Nonce có tác dụng gì?
* **Trả lời**: "Dạ thưa thầy/cô, SIWE là tiêu chuẩn EIP-4361:
  - Khác với web thông thường phải nhập mật khẩu, SIWE chứng minh bạn sở hữu ví bằng cách ký một thông điệp bằng Private Key.
  - **Vai trò của Nonce**: Nonce là một chuỗi ngẫu nhiên dùng một lần (ví dụ `pixel2d-1731...`). Nếu không có Nonce, một kẻ nghe lén trên đường truyền mạng có thể lấy cắp chuỗi chữ ký cũ của bạn và gửi lại lên server để đăng nhập trái phép vào tài khoản (Replay Attack). Có Nonce, mỗi chữ ký chỉ có hiệu lực đúng 1 lần duy nhất."

---

### ❓ Câu 10: Phần Quiz Blockchain làm sao chống gian lận F12 xem trước đáp án?
* **Trả lời**: "Dạ, trong file `backend/src/services/quizService.ts`, khi gửi danh sách câu hỏi về cho trình duyệt, Backend chạy qua hàm `safeQuestions` và **chủ động xóa bỏ trường `correctIndex`** của những câu người chơi chưa trả lời. Chỉ khi người chơi chọn đáp án và bấm Nộp bài, Backend mới so khớp đáp án trên server. Vì vậy xem code mạng hay F12 đều không thể biết trước đáp án."

---

### ❓ Câu 11: Nếu người chơi tắt trình duyệt hoặc mất kết nối mạng thì dữ liệu game có bị mất không?
* **Trả lời**: "Dạ không bị mất thưa thầy/cô, vì hệ thống có **Cơ chế lưu trữ đa tầng (Multi-tier Persistence)**:
  - Tầng 1: Tự động lưu tức thì vào `localStorage` của trình duyệt theo namespace ví của người đó.
  - Tầng 2: Đồng bộ định kỳ lên cơ sở dữ liệu đám mây **MongoDB Atlas**. Khi người chơi mở lại trình duyệt hoặc đăng nhập từ máy tính khác, hệ thống sẽ tự động tải lại chính xác số Coin, Năng lượng, Cấp độ và Danh sách ô đất."

---

### ❓ Câu 12: Động vật trong game (Gà, Bò) di chuyển như thế nào? Có dùng thư viện AI bên ngoài không?
* **Trả lời**: "Dạ không cần thư viện ngoài thưa thầy/cô. Nhóm tự xây dựng module `front_end/src/game/managers/AnimalManager.ts` sử dụng thuật toán **Wandering AI (Di chuyển ngẫu nhiên có kiểm soát)**:
  - Cứ mỗi 3.5 giây, hệ thống random tọa độ đích $(X_{target}, Y_{target})$ nằm gọn bên trong phạm vi hàng rào đồng cỏ (`minX`, `maxX`, `minY`, `maxY`).
  - Sử dụng Phaser Tween nội suy hàm `Sine.easeInOut` trong khoảng thời gian từ 1.5s - 2.6s để tạo chuyển động bước đi mượt mà, tự động lật mặt sprite (`setFlipX`) theo hướng đi và tự động gán trục sâu `depth` theo tọa độ $Y$ để nhân vật đi sau con bò sẽ bị che khuất đúng theo luật phối cảnh không gian 2D isometric."

---

### ❓ Câu 13: Tại sao lại tự tổng hợp âm thanh bằng Web Audio API thay vì dùng file MP3?
* **Trả lời**: "Dạ thưa thầy/cô:
  1. **Tối ưu dung lượng**: Một file MP3 nhạc nền thường nặng 3 - 5 MB. Bằng cách dùng `SoundEngine.ts` viết bằng Web Audio API thuần, toàn bộ hệ thống âm thanh (nhạc nền và 12 hiệu ứng tiếng cuốc, tiếng gặt, tiếng cá quẫy) chỉ tốn **0 KB dung lượng tải về**.
  2. **Zero Latency**: Các hiệu ứng âm thanh được tạo trực tiếp từ bộ dao động phần cứng (Oscillator) của máy tính người chơi nên phát ra ngay lập tức, không có độ trễ tải mạng."

---

### ❓ Câu 14: Nhóm đã dọn dẹp dung lượng mã nguồn như thế nào và giảm được bao nhiêu?
* **Trả lời**: "Dạ, nhóm đã thực hiện kiểm toán toàn bộ mã nguồn:
  - Phát hiện thư mục `src/assets` cũ chứa 232 file ảnh thô (~8.87 MB) không hề được mã nguồn import (game chạy bằng tài nguyên trong `public/assets`).
  - Loại bỏ các ảnh prototype cỏ độ phân giải cao và sheet hạt giống chưa cắt (~3.8 MB).
  - Loại bỏ các tệp SQLite cũ sau khi đã chuyển hẳn sang MongoDB Atlas (~340 KB).
  - **Tổng kết quả**: Đã giải phóng an toàn **~13.5 MB** dung lượng source code, đưa dung lượng dự án về trạng thái rất nhẹ và thời gian build Vite chỉ còn **dưới 1 giây**."

---

### ❓ Câu 15: Nếu dự án muốn mở rộng cho hàng nghìn người chơi đồng thời (Scale Up) thì cần nâng cấp những gì?
* **Trả lời**: "Dạ thưa thầy/cô, kiến trúc hiện tại của nhóm đã được thiết kế sẵn sàng cho việc mở rộng:
  1. **Về Backend**: Do Backend tuân thủ nguyên lý **Stateless** (dùng JWT và xác thực chữ ký off-chain, không lưu session bộ nhớ), nhóm có thể dễ dàng gắn **Load Balancer (Nginx)** và nhân bản nhiều node Express chạy song song.
  2. **Về Database**: MongoDB Atlas hỗ trợ sharding và clustering tự động.
  3. **Về Blockchain**: Có thể chuyển đổi địa chỉ hợp đồng từ Sepolia sang các mạng **Layer 2 (Arbitrum, Base, Polygon)** chỉ bằng cách sửa đổi cấu hình `CHAIN_ID` và `RPC_URL` trong file `backend/src/config/index.ts` mà không cần phải sửa bất kỳ dòng code logic nào."

---

## 🎯 LỜI KHUYÊN DÀNH CHO NHÓM KHI THUYẾT TRÌNH BẢO VỆ
1. **Phân chia vai trò rõ ràng**:
   - Thành viên 1: Trình bày phần Tổng quan, Kiến trúc GameFi và Gameplay nông trại (Phaser 3).
   - Thành viên 2: Trình bày phần Backend Node.js, Database MongoDB và các thuật toán chấm điểm Quiz.
   - Thành viên 3: Trình bày phần Web3, Smart Contract Sepolia, cơ chế ký số EIP-712 và bảo mật chống tấn công.
2. **Luôn mở sẵn code ở các file đã module hóa**: Khi giáo viên hỏi phần nào, mở ngay đúng file chuyên trách tương ứng (ví dụ hỏi chữ ký mở ngay `web3SignerService.ts`, hỏi kho đồ mở ngay `useInventoryManager.ts`), giáo viên sẽ đánh giá rất cao tính chuyên nghiệp và tính tổ chức mã nguồn của nhóm!
