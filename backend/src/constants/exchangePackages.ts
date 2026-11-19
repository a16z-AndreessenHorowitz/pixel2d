export interface ExchangePackage {
  id: string
  coins: number
  pixel: number
  label: string
  description: string
  feeNote: string
  isPopular: boolean
}

// Danh sách các gói đổi thưởng quy định: 1,000 Coins = 10 $PIXEL (100 Coins = 1 $PIXEL)
export const EXCHANGE_PACKAGES: ExchangePackage[] = [
  {
    id: 'tier_1k',
    coins: 1000,
    pixel: 10,
    label: 'Gói Cơ Bản (1,000 Coins)',
    description: 'Đổi 1,000 Coin lấy 10 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
  {
    id: 'tier_10k',
    coins: 10000,
    pixel: 100,
    label: 'Gói Tiêu Chuẩn (10,000 Coins)',
    description: 'Đổi 10,000 Coin lấy 100 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: true,
  },
  {
    id: 'tier_50k',
    coins: 50000,
    pixel: 500,
    label: 'Gói Nông Dân Chăm Chỉ (50,000 Coins)',
    description: 'Đổi 50,000 Coin lấy 500 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
  {
    id: 'tier_100k',
    coins: 100000,
    pixel: 1000,
    label: 'Gói Đại Gia Nông Trại (100,000 Coins)',
    description: 'Đổi 100,000 Coin lấy 1,000 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
]
