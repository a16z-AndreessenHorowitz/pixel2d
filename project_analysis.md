# BÁO CÁO PHÂN TÍCH TOÀN DIỆN DỰ ÁN PIXEL2D GAMEFI

> **Dự án**: Pixel2D GameFi - Nông Trại 2D Blockchain  
> **Người thực hiện**: Senior Full-stack Developer / Game Developer / Blockchain Engineer  
> **Ngày lập báo cáo**: 29/10/2026 (Local time: 28/10/2026)  
> **Trạng thái**: Giai đoạn Tiếp nhận & Đánh giá hiện trạng (Không chỉnh sửa source code)

---

## 1. TỔNG QUAN DỰ ÁN & CẤU TRÚC THƯ MỤC

### 1.1 Cấu trúc tổng thể
Workspace hiện tại gồm một thư mục duy nhất chứa mã nguồn là `front_end/`, cùng cấu hình Git (`.git`) và tệp hệ thống `.DS_Store`. Không có thư mục `backend/` hay thư mục chứa Smart Contract (`contracts/`).

```
pixel2d/
├── .git/                      # Git repository (nhánh chính: main, nhánh phụ: origin/Fishing)
├── .DS_Store                  # Tệp hệ thống macOS (metadata)
└── front_end/                 # Toàn bộ mã nguồn hiện tại của dự án
    ├── .gitignore
    ├── .oxlintrc.json         # Cấu hình Oxlint linter
    ├── index.html             # Tệp HTML entrypoint Vite
    ├── package.json           # Khai báo dependencies và scripts
    ├── pnpm-lock.yaml         # Lockfile pnpm v11
    ├── README.md              # Template Vite mặc định
    ├── tsconfig.json          # Root TS config (references)
    ├── tsconfig.app.json      # Cấu hình TS cho ứng dụng client
    ├── tsconfig.node.json     # Cấu hình TS cho Vite config
    ├── vite.config.ts         # Cấu hình bundler Vite + React plugin
    ├── public/                # Tài nguyên tĩnh phục vụ Phaser tải runtime (/assets/...)
    │   ├── assets/            # Spritesheet nhân vật, cây trồng, động vật, nhà, công cụ
    │   ├── favicon.svg
    │   └── icons.svg
    └── src/                   # Mã nguồn ứng dụng TypeScript + React
        ├── assets/            # Thư mục chứa asset nội bộ (gồm gói tài nguyên Bloomseed rất lớn)
        ├── components/        # Các React UI Component (GameCanvas, AppNavbar, StatsPanel, QuestPanel)
        ├── game/              # Khối mã nguồn logic game Phaser
        │   ├── config.ts      # Khởi tạo game canvas Phaser
        │   ├── data/          # Dữ liệu định nghĩa các giống cây trồng (crops.ts)
        │   ├── inventory/     # Hệ thống logic kho đồ & thanh công cụ (inventory.ts)
        │   ├── objects/       # Đối tượng game (Player, FarmPlot, PlotTile, Farmer)
        │   └── scenes/        # Màn hình game (FarmScene.ts)
        ├── mock-data/         # Dữ liệu giả lập (player.ts, quests.ts, rewards.ts)
        ├── pages/             # Trang chính (GamePage.tsx, GamePage.css)
        ├── App.tsx            # Component điều hướng chính
        ├── main.tsx           # Entry React 19 mount
        ├── App.css & index.css
```

---

## 2. STACK CÔNG NGHỆ ĐANG SỬ DỤNG (XÁC THỰC TỪ SOURCE)

| Phân tầng | Công nghệ | Phiên bản | Ghi chú & Đánh giá |
| :--- | :--- | :--- | :--- |
| **Runtime & Bundler** | Node.js, Vite | Node v24.22.1, Vite 8.2.2 | Tốc độ dev server cực nhanh, HMR hoạt động tốt |
| **Package Manager** | pnpm | 12.16.1 (Lockfile format v11) | Đã kiểm chứng: cài đặt hoàn tất trong 42s |
| **Ngôn ngữ** | TypeScript | 6.0.3 | Cấu hình rất khắt khe (`erasableSyntaxOnly`, `noUnusedLocals`) |
| **UI Framework** | React | 19.2.8 | Phiên bản React mới nhất (React 19) |
| **UI Kit / Styles** | React-Bootstrap, Bootstrap | 2.10.10 & 5.3.8 | Sử dụng kết hợp CSS tùy biến (pixel-art theme) |
| **Routing** | React Router DOM | 7.18.3 | Điều hướng SPA |
| **Game Engine** | Phaser | 4.2.1 | Sử dụng Phaser 4 với Canvas renderer & Arcade Physics |
| **Linter** | Oxlint | 1.81.0 | Linter hiệu năng cao viết bằng Rust |
| **State Management** | React State + LocalStorage | N/A | Chưa có Redux/Zustand; lưu kho đồ qua key `pixel-farm-inventory-v2` |
| **Backend** | **Chưa có** | N/A | Không có backend server, REST API hay WebSocket |
| **Blockchain / Web3** | **Chưa có** | N/A | Không có ethers, viem, wagmi, web3.js, không có smart contract |

---

## 3. PHÂN TÍCH KIẾN TRÚC HIỆN TẠI

### 3.1 Kiến trúc kết hợp Hybrid (React UI + Phaser Canvas)
Dự án áp dụng mô hình kiến trúc rất phổ biến trong các game Web2/Web3 hiện đại:
- **Tầng Hiển thị Game (Phaser Canvas Layer)**:
  - Được đóng gói bên trong component React [`GameCanvas.tsx`](file:///front_end/src/components/GameCanvas.tsx).
  - Vòng đời của Phaser được quản lý qua `useEffect` (khởi tạo `new Phaser.Game(createGameConfig(container))` và hủy qua `game.destroy(true)` khi unmount).
  - Xử lý đồ họa pixel, camera 2D, tilemap/texture, logic gieo hạt, cây lớn theo thời gian, di chuyển của nhân vật và AI động vật.
- **Tầng Giao diện Điều khiển (React Overlay Layer)**:
  - Bao gồm [`AppNavbar.tsx`](file:///front_end/src/components/AppNavbar.tsx) (thanh điều hướng, số dư coin), [`StatsPanel.tsx`](file:///front_end/src/components/StatsPanel.tsx) (chỉ số năng lượng, coin, gem, nút chuyển góc nhìn bản đồ), [`QuestPanel.tsx`](file:///front_end/src/components/QuestPanel.tsx) (thẻ nhiệm vụ), và thanh công cụ đáy màn hình Toolbar (8 ô phím tắt) kèm Modal kho đồ (Inventory 20 ô) nằm trong [`GamePage.tsx`](file:///front_end/src/pages/GamePage.tsx).

### 3.2 Cơ chế liên lạc giữa React và Phaser
Giao tiếp giữa React và Phaser hiện tại hoàn toàn sử dụng **Native Browser Custom Events (`window.dispatchEvent`)**:
1. `farm-tool-changed` (React -> Phaser): Khi người chơi bấm phím 1-8 hoặc click chọn tool trên Toolbar, React phát sự kiện báo cho `FarmScene` cập nhật `activeTool`.
2. `farm-harvest` (Phaser -> React): Khi người chơi dùng liềm cắt nông sản chín, `FarmPlot` phát sự kiện kèm thông tin nông sản (`crop`), React lắng nghe để cộng `harvestCoins` vào số dư Coin.
3. `toggle-map-overview` (React -> Phaser): Bấm nút định vị trên StatsPanel để phóng to/thu nhỏ toàn bộ hòn đảo bay.
4. `farm-overview-changed` (Phaser -> React): Báo lại trạng thái phóng to khi người chơi bấm phím tắt `M`.

### 3.3 Đánh giá thành phần thừa / mã rác (Technical Debt)
- [`PlotTile.ts`](file:///front_end/src/game/objects/PlotTile.ts) và [`Farmer.ts`](file:///front_end/src/game/objects/Farmer.ts): Là các component hình học nguyên thủy được viết trong giai đoạn thử nghiệm đầu tiên (prototype). Hiện tại không còn bất kỳ import hay tham chiếu nào trong dự án.
- [`rewards.ts`](file:///front_end/src/mock-data/rewards.ts): Định nghĩa danh sách quà thưởng / shop đổi đồ nhưng không có component nào sử dụng.

---

## 4. ĐÁNH GIÁ THÀNH PHẦN BLOCKCHAIN & WEB3 HIỆN CÓ

Sau khi rà soát toàn bộ source code và cấu hình:
- **Smart Contract**: `0%` (Chưa có bất kỳ file `.sol`, chưa khởi tạo Hardhat hay Foundry).
- **Thư viện Web3**: `0%` (Chưa cài đặt bất kỳ package Web3 nào: ethers, viem, wagmi, @solana/web3.js,...).
- **Kết nối ví (Wallet Connection)**: `0%` (Chưa có MetaMask provider, RainbowKit, AppKit hay logic `window.ethereum`).
- **Tokenomics / NFT**: `0%` (Số dư Coin, Gem, Năng lượng, Cây trồng hoàn toàn là Mock Data và React State/LocalStorage).

> [!IMPORTANT]  
> Dự án hiện tại là một **game nông trại 2D Web thông thường chạy client-side**, chưa có bất kỳ dòng code hay cấu hình nào liên quan đến Blockchain. Mọi tính năng Web3/GameFi cần phải được thiết kế và xây dựng mới hoàn toàn từ đầu nhưng sẽ tích hợp trực tiếp vào gameplay hiện có.

---

## 5. TÀI NGUYÊN BỊ ẨN VÀ NHÁNH CHƯA HỢP NHẤT (QUAN TRỌNG)

1. **Nhánh Git `origin/Fishing`**:
   - Nhánh remote chứa toàn bộ hệ thống câu cá 2D hoàn chỉnh: `FishingMinigame.ts`, `FishingPrompt.ts`, `FishingResult.ts`, `fishingSystem.ts`, `fishingType.ts`, cùng sprite của nhiều loại cá (koi, catfish, tilapia, tuna, golden-fish,...).
   - Hệ thống này chưa được merge vào nhánh `main`. Đây là tính năng chất lượng cao có thể tận dụng ngay để làm cơ chế GameFi câu cá kiếm Token/NFT.
2. **Kho Asset `front_end/src/assets/Bloomseed`**:
   - Chứa đầy đủ sprite và animation chất lượng cao:
     - Quái vật: Slime (8 animation: Alert, Attack 1-2, Death, Hit, Idle, Jump, Leap), Dơi Bat (6 animation).
     - Vũ khí: Kiếm Sword (Slash, Stab) chia theo 3 cấp độ (Wood, Iron, Gold).
     - Công cụ: Rìu (Axe), Cuốc (Hoe), Cuốc chim (Pickaxe), Liềm (Sickle), Bình tưới (Watering Can) đều có 3 cấp (Wood, Iron, Gold).
     - Động vật nuôi: Chó, mèo, cừu, lợn.
   - Các asset này chưa được đưa vào `public/assets/` nên Phaser chưa load được trong runtime hiện tại.
