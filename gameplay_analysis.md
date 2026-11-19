# ĐÁNH GIÁ VÀ PHÂN TÍCH GAMEPLAY PIXEL2D

> **Dự án**: Pixel2D GameFi - Nông Trại 2D Blockchain  
> **Tài liệu**: Phân tích chi tiết gameplay & Phân loại tính năng  
> **Tiêu chuẩn đánh giá**: Hoàn thành / Chưa hoàn chỉnh / Chưa có / Chưa xác minh

---

## 1. BẢNG PHÂN LOẠI TÍNH NĂNG TỔNG QUAN

| Nhóm tính năng | Tính năng con | Hiện trạng thực tế | Phân loại |
| :--- | :--- | :--- | :--- |
| **Bản đồ & Môi trường** | Bản đồ đảo bay 2400x1400 (Cosmic theme) | Vẽ bằng Phaser Graphics & TileSprite | **Hoàn thành** |
| | Phân chia 2 khu vực (Nông trại vs Nghỉ dưỡng) | Có con đường trung tâm, biển báo gỗ, banner khu | **Hoàn thành** |
| | Camera follow nhân vật | Theo sát người chơi mượt mà với lerp (0.12, 0.12) | **Hoàn thành** |
| | Chế độ xem toàn cảnh (Overview Zoom) | Phím tắt 'M' hoặc nút bấm định vị thu nhỏ toàn map | **Hoàn thành** |
| | Hiệu ứng môi trường (Hồ nước, bóng cây, cánh đồng) | Có hồ sen, hiệu ứng mặt nước, rào chắn | **Hoàn thành** |
| **Nhân vật & Hoạt cảnh** | Di chuyển 4 hướng (Walk animation) | Spritesheet 4 hướng x 6 frames | **Hoàn thành** |
| | Đứng yên 4 hướng (Idle animation) | Spritesheet 4 hướng x 4 frames | **Hoàn thành** |
| | Thú nuôi tự hành (AI Gà, Bò lang thang) | Tự đi dạo ngẫu nhiên (tweens) và mổ hạt/nhai cỏ | **Hoàn thành** |
| | Tương tác nhân vật với thú nuôi | Chưa thể cho ăn, vuốt ve, thu hoạch trứng/sữa | **Chưa có** |
| | Thể lực tiêu hao khi làm việc | Energy hiển thị tĩnh (42/100), không trừ khi làm | **Chưa hoàn chỉnh** |
| **Điều khiển & Tương tác** | Di chuyển phím WASD / Cursors | Nhận lệnh bàn phím mượt mà | **Hoàn thành** |
| | Di chuyển bằng chuột (Point-and-click) | Click vào đất trống nhân vật tự chạy đến | **Hoàn thành** |
| | Gieo hạt (Planting) | Chọn hạt trên toolbar -> click vào ô đất trống | **Hoàn thành** |
| | Tưới nước (Watering) | Chọn bình tưới -> click vào ô đất đã gieo hạt | **Hoàn thành** |
| | Thời gian sinh trưởng cây (Grow timer + Progress bar) | Thanh tiến trình màu xanh chạy thời gian thực | **Hoàn thành** |
| | Thu hoạch nông sản (Harvesting) | Cây chín -> chọn liềm -> click nhận coin nổi | **Hoàn thành** |
| | Mở hòm kho báu (Chests) | Click hòm vàng chỉ nảy nhẹ, chưa có loot table | **Chưa hoàn chỉnh** |
| **Vật phẩm & Kho đồ** | Kho đồ cá nhân (Inventory 20 ô) | Kéo thả sắp xếp, hiển thị số lượng | **Hoàn thành** |
| | Thanh công cụ nhanh (Toolbar 8 ô) | Phím 1-8, kéo thả chuyển đồ qua lại với kho | **Hoàn thành** |
| | Lưu trữ dữ liệu kho đồ | Lưu vào LocalStorage (`pixel-farm-inventory-v2`) | **Hoàn thành** |
| | Cơ chế tiêu thụ số lượng hạt khi gieo | Hạt giống không bị trừ số lượng khi gieo | **Chưa hoàn chỉnh** |
| | Thu hoạch nông sản vào kho | Nông sản thu hoạch biến thành coin, không vào kho | **Chưa hoàn chỉnh** |
| **Nhiệm vụ & Phần thưởng** | Định nghĩa nhiệm vụ | File `mock-data/quests.ts` có 4 nhiệm vụ mẫu | **Hoàn thành** |
| | Giao diện ghim nhiệm vụ | Hiển thị mảnh giấy ghim với số lượng "1/4 hoàn thành" | **Chưa hoàn chỉnh** |
| | Xem chi tiết danh sách nhiệm vụ | Không có modal / popup để đọc nội dung quest | **Chưa có** |
| | Tự động theo dõi tiến độ quest | Làm việc nông không cập nhật tiến độ nhiệm vụ | **Chưa có** |
| | Nhận thưởng nhiệm vụ (Claim Reward) | Không có nút nhận coin thưởng | **Chưa có** |
| | Shop đổi thưởng (Rewards Store) | File `mock-data/rewards.ts` tồn tại nhưng không dùng | **Chưa có** |
| **Chiến đấu & Quái vật** | Bản đồ hầm ngục / quái vật xuất hiện | Chưa có màn chơi chiến đấu | **Chưa có** |
| | Cơ chế vung kiếm tấn công / né đòn | Chưa được lập trình (mới có asset thô) | **Chưa có** |
| | Quái vật Slime / Bat có AI tấn công | Chưa được lập trình (mới có sprite sheet) | **Chưa có** |
| **Hệ thống Câu cá** | Minigame câu cá (Casting, Bite, Reeling) | Đã code đầy đủ trên nhánh `origin/Fishing` | **Chưa xác minh trên main** *(Sẵn sàng tích hợp)* |
| **GameFi & Blockchain** | Kết nối ví MetaMask (Connect Wallet) | Chưa có | **Chưa có** |
| | Đồng Token game on-chain (ERC-20) | Toàn bộ coin là biến React State local | **Chưa có** |
| | Vật phẩm NFT / Nông cụ NFT (ERC-721) | Chưa có | **Chưa có** |
| | Đồng bộ tài sản On-chain / Off-chain | Chưa có | **Chưa có** |

---

## 2. PHÂN TÍCH CHI TIẾT TỪNG TRẢI NGHIỆM GAMEPLAY

### 2.1 Bản đồ, Không gian và Đồ họa
- **Cảm quan đồ họa**: Rất ấn tượng. Game theo phong cách pixel-art ấm cúng (cozy farm) tương tự như tựa game nổi tiếng *Pixels.xyz* hay *Stardew Valley*.
- **Cấu trúc hòn đảo bay (Floating Island)**:
  - Bản đồ có kích thước logic $2400 \times 1400$ pixel, viền ngoài là không gian vũ trụ tối sâu có các ngôi sao nhấp nháy.
  - Phía Tây (Zone 1): Được chia thành khu vực ruộng đồng với 2 luống đất lớn (Field A: $7 \times 5 = 35$ ô đất, Field B: $6 \times 5 = 30$ ô đất; tổng cộng 65 ô đất có thể canh tác) và khu chuồng nuôi gia súc/gia cầm với hàng rào gỗ khép kín.
  - Phía Đông (Zone 2): Khuôn viên nhà ở với sân lát gạch đá, thềm gỗ, hòm kho báu, cây hoa anh đào (Sakura) và một hồ nước sinh thái có hoa súng, bèo tây.
- **Camera & Điều hướng**:
  - Camera mượt mà bám theo người chơi.
  - Tính năng bấm phím `M` (hoặc click nút pin) để zoom out xem toàn bộ hòn đảo bay hoạt động rất trơn tru và trực quan.

### 2.2 Vòng lặp Nông trại (Core Farming Loop)
Vòng lặp canh tác hiện tại hoạt động theo quy trình:
1. **Bước 1 - Gieo hạt**: Người chơi mở Toolbar hoặc ấn phím 1-8 để chọn hạt giống (Bắp, Lúa, Dâu, Bí ngô, Dưa hấu). Click chuột vào ô đất trống (`FarmPlot`). Ô đất chuyển sang trạng thái `planted`.
2. **Bước 2 - Tưới nước**: Người chơi chuyển sang công cụ Bình tưới (`watering-can`). Click vào ô đất vừa gieo hạt. Ô đất chuyển sang trạng thái `watered`, xuất hiện chữ số/biểu tượng giọt nước và **thanh tiến trình sinh trưởng (ProgressBar) màu xanh chạy thực tế**.
3. **Bước 3 - Chờ lớn**: Mỗi loại cây có thời gian sinh trưởng riêng:
   - Bắp: 15 giây (thu hoạch được 12 coins)
   - Lúa: 20 giây (thu hoạch được 15 coins)
   - Dâu tây: 25 giây (thu hoạch được 22 coins)
   - Bí ngô: 35 giây (thu hoạch được 30 coins)
   - Dưa hấu: 45 giây (thu hoạch được 40 coins)
4. **Bước 4 - Thu hoạch**: Khi thanh tiến trình đầy, cây chuyển sang trạng thái `mature`. Người chơi chọn Liềm (`sickle`), click vào ô đất để gặt. Chữ số cộng coin bay lên màn hình (`+12 🪙`), ô đất trở về trạng thái trống sau 300ms.

> [!WARNING]  
> **Các hạn chế gameplay nông trại cần khắc phục:**
> 1. Khi gieo hạt, số lượng hạt giống trong Toolbar/Inventory không bị trừ đi (người chơi có vô hạn hạt).
> 2. Nông sản thu hoạch không được đưa vào kho đồ dạng quả (Corn, Rice, Pumpkin,...) mà chuyển hóa trực tiếp thành Coin trên UI. Trong một game GameFi tiêu chuẩn, người chơi nên thu hoạch nông sản vào kho đồ, sau đó có thể đem bán tại Chợ / Thương nhân để lấy Coin hoặc chế tạo/đổi token.
> 3. Cuốc (`hoe`) chưa có công năng thực sự: Hiện tại đất đã được xới sẵn, cuốc click vào không có tác dụng tạo thêm ô đất.

### 2.3 Hệ thống Động vật (Animal System)
- Đã có 5 con gà (Chicken) và 2 con bò (Cow) trong chuồng.
- Hoạt ảnh pecking (gà mổ hạt) và idle (bò nhai cỏ) hiển thị sinh động.
- AI lang thang: Động vật tự tính toán vị trí ngẫu nhiên trong phạm vi chuồng và di chuyển mềm mại (sử dụng tween của Phaser).
- **Hạn chế**: Hiện chỉ mang tính chất trang trí (decorative NPC), người chơi chưa thể bấm vào để tương tác, cho ăn, nhặt trứng hay vắt sữa.

### 2.4 Hệ thống Kho đồ (Inventory & Toolbar)
- Hoạt động tốt với cơ chế kéo thả HTML5 Drag and Drop API:
  - Kéo từ ô này sang ô khác trong Inventory để sắp xếp.
  - Kéo vật phẩm trùng loại để gộp số lượng (Stack).
  - Kéo qua lại giữa Toolbar (8 ô) và Inventory (20 ô).
  - Tự động lưu và phục hồi dữ liệu từ `localStorage`.
- Phím tắt `I` để mở/đóng kho đồ mượt mà.

### 2.5 Hệ thống Nhiệm vụ (Quest System)
- Hiện tại UI chỉ hiển thị một biểu tượng mẩu giấy dán ghim với dòng chữ "NHIỆM VỤ HÔM NAY - 1/4 hoàn thành".
- Người chơi không có cách nào xem danh sách 4 nhiệm vụ là gì, mô tả ra sao hay phần thưởng bao nhiêu.
- Không có event bus để lắng nghe hành động trong game nhằm đánh dấu hoàn thành nhiệm vụ.

---

## 3. ĐÁNH GIÁ TỔNG QUAN VỀ ĐỘ HOÀN THIỆN GAMEPLAY

Dự án đã có phần **nền móng Gameplay 2D rất tốt**: Bản đồ đẹp, nhân vật điều khiển nhạy, đồ họa pixel đồng bộ, vòng lặp gieo hạt - tưới nước - thời gian sinh trưởng - thu hoạch hoạt động trơn tru, kho đồ kéo thả linh hoạt.

Phần còn thiếu của gameplay tập trung ở:
1. Logic kinh tế khép kín (Gieo mất hạt -> Thu hoạch ra nông sản vật lý -> Đem bán ra coin -> Mua hạt giống/nâng cấp công cụ).
2. Popup giao diện Nhiệm vụ và Shop đổi thưởng.
3. Hợp nhất hệ thống Câu cá (đã có sẵn ở nhánh `origin/Fishing`) vào bản đồ chính tại khu vực hồ sen.
