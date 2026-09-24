export type Reward = {
  id: number
  name: string
  priceCoins: number
  visual: 'seed' | 'hat' | 'crate' | 'ticket'
  label: string
}

export const rewards: Reward[] = [
  {
    id: 1,
    name: 'Gói hạt giống',
    priceCoins: 250,
    visual: 'seed',
    label: 'SD',
  },
  {
    id: 2,
    name: 'Mũ nông dân',
    priceCoins: 420,
    visual: 'hat',
    label: 'HT',
  },
  {
    id: 3,
    name: 'Thùng gỗ nhỏ',
    priceCoins: 360,
    visual: 'crate',
    label: 'BX',
  },
  {
    id: 4,
    name: 'Vé mùa vụ',
    priceCoins: 680,
    visual: 'ticket',
    label: 'TK',
  },
]
