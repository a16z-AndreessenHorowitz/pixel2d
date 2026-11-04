export interface DialogueStep {
  id: number
  speakerName: string
  speakerRole: string
  avatar: string
  message: string
  reward?: {
    type: 'seeds' | 'coins' | 'energy'
    itemId?: string
    itemName?: string
    quantity?: number
    coins?: number
    xp?: number
  }
  options?: {
    label: string
    action: 'next' | 'open_shop' | 'claim_and_close' | 'close'
  }[]
}

export interface NPCDialogueConfig {
  id: string
  name: string
  role: string
  avatar: string
  steps: DialogueStep[]
}

export const NPC_DIALOGUES: Record<string, NPCDialogueConfig> = {
  barney: {
    id: 'barney',
    name: 'Barney',
    role: 'Nông Dân Lão Luyện (Guide)',
    avatar: '/assets/bloomseed/characters/idle-down.png',
    steps: [
      {
        id: 1,
        speakerName: 'Barney',
        speakerRole: 'Nông Dân Lão Luyện',
        avatar: '/assets/bloomseed/characters/idle-down.png',
        message:
          'Chào mừng bạn đến với Pixel Farm! Tôi là Barney. Tôi thấy bạn vừa đặt chân đến vùng đất nông trại Web3 này. Hãy để tôi tặng bạn một ít hạt giống khởi nghiệp nhé!',
        reward: {
          type: 'seeds',
          itemId: 'corn-seed',
          itemName: 'Hạt giống Bắp',
          quantity: 5,
          coins: 20,
          xp: 25,
        },
        options: [
          { label: 'Cảm ơn bác Barney! Tiếp tục ▶', action: 'next' },
        ],
      },
      {
        id: 2,
        speakerName: 'Barney',
        speakerRole: 'Nông Dân Lão Luyện',
        avatar: '/assets/bloomseed/characters/idle-down.png',
        message:
          'Để canh tác, bạn hãy chọn Cuốc (Hoe) trên thanh công cụ và click vào ô đất để cày xới. Sau đó, chọn Hạt Bắp vừa nhận để gieo hạt xuống đất.',
        options: [
          { label: 'Tôi hiểu rồi! Bước tiếp theo? ▶', action: 'next' },
        ],
      },
      {
        id: 3,
        speakerName: 'Barney',
        speakerRole: 'Nông Dân Lão Luyện',
        avatar: '/assets/bloomseed/characters/idle-down.png',
        message:
          'Nhớ dùng Bình tưới (Watering Can) tưới nước thường xuyên để cây lớn nhanh! Chú ý thanh Năng lượng (⚡): làm việc sẽ tiêu hao thể lực. Hãy mở Kho đồ (phím I) và bấm "Ăn" nông sản để hồi phục 100% sức sống!',
        reward: {
          type: 'energy',
          xp: 25,
        },
        options: [
          { label: 'Tuyệt vời! Còn việc kiếm tiền thì sao? ▶', action: 'next' },
        ],
      },
      {
        id: 4,
        speakerName: 'Barney',
        speakerRole: 'Nông Dân Lão Luyện',
        avatar: '/assets/bloomseed/characters/idle-down.png',
        message:
          'Khi nông sản chín, hãy dùng Liềm thu hoạch! Bạn có thể đem bán cho cô Hazel ở hiên nhà để lấy Coin, hoặc kết nối ví MetaMask rút thành token $PIXEL on-chain. Chúc bạn làm giàu thành công!',
        reward: {
          type: 'coins',
          coins: 50,
          xp: 50,
        },
        options: [
          { label: '🎉 Nhận 50 Coins & Bắt đầu canh tác!', action: 'claim_and_close' },
        ],
      },
    ],
  },
  hazel: {
    id: 'hazel',
    name: 'Hazel',
    role: 'Chủ Tiệm Tạp Hóa (Merchant)',
    avatar: '/assets/player/idle.png',
    steps: [
      {
        id: 1,
        speakerName: 'Hazel',
        speakerRole: 'Chủ Tiệm Tạp Hóa',
        avatar: '/assets/player/idle.png',
        message:
          'Xin chào nông dân chăm chỉ! Tôi là Hazel. Tôi cung cấp các loại hạt giống năng suất cao từ Bắp, Lúa đến Dâu Tây, Bí Ngô và Dưa Hấu.',
        options: [
          { label: 'Cô có thu mua nông sản không? ▶', action: 'next' },
          { label: '🛒 Mở Tiệm Tạp Hóa ngay', action: 'open_shop' },
        ],
      },
      {
        id: 2,
        speakerName: 'Hazel',
        speakerRole: 'Chủ Tiệm Tạp Hóa',
        avatar: '/assets/player/idle.png',
        message:
          'Tất nhiên rồi! Tôi thu mua tất cả nông sản chín và cá bạn câu được ở hồ nước với giá tốt nhất thị trấn. Bạn cứ vào tab "Bán Nông Sản & Cá" trong cửa hàng của tôi nhé!',
        options: [
          { label: '🛒 Mở Tiệm Hazel Để Mua & Bán', action: 'open_shop' },
          { label: 'Cảm ơn cô Hazel, hẹn gặp lại!', action: 'close' },
        ],
      },
    ],
  },
}
