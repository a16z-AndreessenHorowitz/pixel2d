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
    description: 'Kiểm tra các vật phẩm có thể đổi bằng coin trong game.',
    rewardCoins: 50,
  },
  {
    id: 4,
    title: 'Nâng cấp kho nhỏ',
    description: 'Mở thêm chỗ chứa nông sản để nhận nhiều nhiệm vụ hơn.',
    rewardCoins: 180,
  },
]
