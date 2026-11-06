export type Quest = {
  id: number
  title: string
  description: string
  rewardCoins: number
}

export const quests: Quest[] = [
  {
    id: 1,
    title: 'Gieo 5 luống cà rốt',
    description: 'Hoàn tất một lượt trồng cơ bản trên khu đất đầu tiên.',
    rewardCoins: 80,
  },
  {
    id: 2,
    title: 'Thu hoạch mùa sáng',
    description: 'Thu gom nông sản đã chín và chuẩn bị kho cho lượt tiếp theo.',
    rewardCoins: 120,
  },
  {
    id: 3,
    title: 'Ghé thăm bảng đổi thưởng',
    description: 'Kiểm tra tỷ giá quy đổi 1,000 Coins = 10 $PIXEL on-chain.',
    rewardCoins: 50,
  },
  {
    id: 4,
    title: 'Nâng cấp kho nhỏ',
    description: 'Mở thêm chỗ chứa nông sản để nhận nhiều nhiệm vụ hơn.',
    rewardCoins: 180,
  },
  {
    id: 5,
    title: 'Thử thách nông dân chăm chỉ',
    description: 'Cày cuốc tích lũy và hoàn thành mùa vụ lớn để nhận 1,000 Coin đổi token $PIXEL.',
    rewardCoins: 1000,
  },
]
