export type Quest = {
  id: number
  title: string
  description: string
  rewardCoins: number
  target: number
  actionType: 'plant' | 'harvest' | 'exchange' | 'shop' | 'rich'
  hint: string
}

export const quests: Quest[] = [
  {
    id: 1,
    title: 'Gieo 5 luống cây trồng',
    description: 'Hoàn tất gieo 5 hạt giống bất kỳ trên khu đất nông trại.',
    rewardCoins: 80,
    target: 5,
    actionType: 'plant',
    hint: 'Hãy chọn hạt giống trên thanh công cụ và gieo xuống 5 ô đất đã cày xới.',
  },
  {
    id: 2,
    title: 'Thu hoạch mùa sáng',
    description: 'Thu gom ít nhất 1 nông sản đã chín để chuẩn bị cho mùa vụ tiếp theo.',
    rewardCoins: 120,
    target: 1,
    actionType: 'harvest',
    hint: 'Hãy tưới nước cho cây, chờ cây chín và dùng Liềm thu hoạch ít nhất 1 cây.',
  },
  {
    id: 3,
    title: 'Ghé thăm bảng đổi thưởng',
    description: 'Kiểm tra tỷ giá quy đổi 1,000 Coins = 10 $PIXEL on-chain.',
    rewardCoins: 50,
    target: 1,
    actionType: 'exchange',
    hint: 'Hãy mở bảng Đổi Thưởng Token (GameFi Hub hoặc biểu tượng Claim) để kiểm tra tỷ giá.',
  },
  {
    id: 4,
    title: 'Mua sắm tại Tiệm Tạp Hóa',
    description: 'Mua ít nhất 1 gói hạt giống từ Tiệm Tạp Hóa của cô Hazel.',
    rewardCoins: 180,
    target: 1,
    actionType: 'shop',
    hint: 'Hãy nói chuyện với Cô Hazel hoặc click vào ô trống Toolbar để mở Tiệm Tạp Hóa và mua 1 món hàng.',
  },
  {
    id: 5,
    title: 'Thử thách nông dân chăm chỉ',
    description: 'Câu được ít nhất 1 con cá hoặc tích lũy đạt mốc 500 Coins.',
    rewardCoins: 1000,
    target: 1,
    actionType: 'rich',
    hint: 'Hãy đến hồ nước câu ít nhất 1 con cá hoặc canh tác nông sản tích lũy đạt 500 Coins.',
  },
]
