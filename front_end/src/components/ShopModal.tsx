import { useState } from 'react'
import type { InventoryItemId } from '../game/inventory/inventory'
import './ShopModal.css'

export type ShopItem = {
  id: InventoryItemId
  name: string
  icon: string
  description: string
  bundleQuantity: number
  priceCoins: number
}

const SEED_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'corn-seed',
    name: 'Hạt giống Bắp',
    icon: '/assets/tools/corn-seed.png',
    description: 'Thời gian lớn: 15s. Thu hoạch: +12 Coins.',
    bundleQuantity: 5,
    priceCoins: 10,
  },
  {
    id: 'rice-seed',
    name: 'Hạt giống Lúa',
    icon: '/assets/tools/rice-seed.png',
    description: 'Thời gian lớn: 20s. Thu hoạch: +15 Coins.',
    bundleQuantity: 5,
    priceCoins: 15,
  },
  {
    id: 'strawberry-seed',
    name: 'Hạt giống Dâu Tây',
    icon: '/assets/tools/strawberry-seed.png',
    description: 'Thời gian lớn: 25s. Thu hoạch: +22 Coins.',
    bundleQuantity: 5,
    priceCoins: 25,
  },
  {
    id: 'pumpkin-seed',
    name: 'Hạt giống Bí Ngô',
    icon: '/assets/tools/pumpkin-seed.png',
    description: 'Thời gian lớn: 35s. Thu hoạch: +30 Coins.',
    bundleQuantity: 5,
    priceCoins: 35,
  },
  {
    id: 'watermelon-seed',
    name: 'Hạt giống Dưa Hấu',
    icon: '/assets/tools/watermelon-seed.png',
    description: 'Thời gian lớn: 45s. Thu hoạch: +40 Coins.',
    bundleQuantity: 5,
    priceCoins: 50,
  },
]

type ShopModalProps = {
  isOpen: boolean
  onClose: () => void
  coins: number
  onBuyItem: (item: ShopItem) => void
}

export function ShopModal({ isOpen, onClose, coins, onBuyItem }: ShopModalProps) {
  const [notice, setNotice] = useState<string | null>(null)

  if (!isOpen) return null

  const handleBuy = (item: ShopItem) => {
    if (coins < item.priceCoins) {
      setNotice(`❌ Không đủ Coin để mua ${item.name}! Cần ${item.priceCoins} 🪙.`)
      setTimeout(() => setNotice(null), 2500)
      return
    }

    onBuyItem(item)
    setNotice(`✅ Đã mua thành công x${item.bundleQuantity} ${item.name}!`)
    setTimeout(() => setNotice(null), 2000)
  }

  return (
    <div className="shop-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-modal__header">
          <div>
            <h2 className="shop-modal__title">🛒 CỬA HÀNG NÔNG TRẠI</h2>
            <p className="shop-modal__subtitle">Dùng Coin thu hoạch để mua thêm hạt giống mùa vụ</p>
          </div>
          <button type="button" className="shop-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {notice && <div className="shop-modal__notice">{notice}</div>}

        <div className="shop-modal__balance">
          <span>Số dư khả dụng:</span>
          <strong>{coins.toLocaleString()} 🪙</strong>
        </div>

        <div className="shop-modal__grid">
          {SEED_SHOP_ITEMS.map((item) => (
            <div key={item.id} className="shop-item-card">
              <div className="shop-item-card__icon-wrap">
                <img src={item.icon} alt={item.name} className="shop-item-card__icon" />
                <span className="shop-item-card__qty">x{item.bundleQuantity}</span>
              </div>
              <div className="shop-item-card__info">
                <h4>{item.name}</h4>
                <p>{item.description}</p>
              </div>
              <button
                type="button"
                className={`shop-item-card__btn ${coins < item.priceCoins ? 'btn-disabled' : ''}`}
                onClick={() => handleBuy(item)}
              >
                {item.priceCoins} 🪙
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
