import { useState } from 'react'
import type { InventoryItemId, InventorySlot } from '../game/inventory/inventory'
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

export interface SellableCropDef {
  id: string
  name: string
  icon: string
  priceCoins: number
  energyRestore: number
}

export const SELLABLE_CROPS: SellableCropDef[] = [
  { id: 'corn', name: 'Bắp (Củ)', icon: '/assets/crops/corn-3.png', priceCoins: 15, energyRestore: 10 },
  { id: 'rice', name: 'Bó Lúa', icon: '/assets/crops/rice-3.png', priceCoins: 18, energyRestore: 8 },
  { id: 'strawberry', name: 'Dâu Tây', icon: '/assets/crops/strawberry-3.png', priceCoins: 25, energyRestore: 15 },
  { id: 'pumpkin', name: 'Bí Ngô', icon: '/assets/crops/pumpkin-3.png', priceCoins: 40, energyRestore: 20 },
  { id: 'watermelon', name: 'Dưa Hấu', icon: '/assets/crops/watermelon-3.png', priceCoins: 50, energyRestore: 25 },
  { id: 'carp', name: 'Cá Chép', icon: '/assets/fishing/fish1_processed/koi.png', priceCoins: 35, energyRestore: 18 },
  { id: 'tilapia', name: 'Cá Rô Phi', icon: '/assets/fishing/fish1_processed/tilapia.png', priceCoins: 25, energyRestore: 15 },
  { id: 'catfish', name: 'Cá Trê', icon: '/assets/fishing/fish1_processed/catfish.png', priceCoins: 30, energyRestore: 18 },
  { id: 'salmon', name: 'Cá Hồi', icon: '/assets/fishing/fish1_processed/salmon.png', priceCoins: 45, energyRestore: 22 },
  { id: 'goldfish', name: 'Cá Vàng', icon: '/assets/fishing/fish1_processed/goldfish.png', priceCoins: 60, energyRestore: 30 },
]

type ShopModalProps = {
  isOpen: boolean
  onClose: () => void
  coins: number
  inventory?: (InventorySlot | null)[]
  toolbar?: (InventorySlot | null)[]
  onBuyItem: (item: ShopItem) => void
  onSellItem?: (itemId: string, quantity: number, pricePerUnit: number) => void
}

export function ShopModal({
  isOpen,
  onClose,
  coins,
  inventory = [],
  toolbar = [],
  onBuyItem,
  onSellItem,
}: ShopModalProps) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [notice, setNotice] = useState<string | null>(null)

  if (!isOpen) return null

  // Calculate owned counts for each sellable crop/fish
  const getItemCount = (itemId: string): number => {
    let count = 0
    inventory.forEach((slot) => {
      if (slot && slot.id === itemId) count += slot.quantity
    })
    toolbar.forEach((slot) => {
      if (slot && slot.id === itemId) count += slot.quantity
    })
    return count
  }

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

  const handleSell = (item: SellableCropDef, quantity: number) => {
    const owned = getItemCount(item.id)
    if (owned < quantity) {
      setNotice(`❌ Không đủ số lượng ${item.name} trong kho để bán!`)
      setTimeout(() => setNotice(null), 2000)
      return
    }

    const earned = item.priceCoins * quantity
    onSellItem?.(item.id, quantity, item.priceCoins)
    setNotice(`💰 Đã bán thành công x${quantity} ${item.name}! Nhận +${earned} Coins.`)
    setTimeout(() => setNotice(null), 2000)
  }

  const sellableItemsWithCount = SELLABLE_CROPS.map((item) => ({
    ...item,
    count: getItemCount(item.id),
  })).filter((item) => item.count > 0)

  return (
    <div className="shop-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-modal__header">
          <div>
            <h2 className="shop-modal__title">🛒 TIỆM TẠP HÓA HAZEL</h2>
            <p className="shop-modal__subtitle">Mua hạt giống mùa vụ & Bán nông sản kiếm In-Game Coins</p>
          </div>
          <button type="button" className="shop-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {/* Shop Navigation Tabs */}
        <div className="shop-tabs">
          <button
            type="button"
            className={`shop-tab-btn ${tab === 'buy' ? 'active' : ''}`}
            onClick={() => setTab('buy')}
          >
            🌱 Mua Hạt Giống
          </button>
          <button
            type="button"
            className={`shop-tab-btn ${tab === 'sell' ? 'active' : ''}`}
            onClick={() => setTab('sell')}
          >
            🌾 Bán Nông Sản & Cá
          </button>
        </div>

        {notice && <div className="shop-modal__notice">{notice}</div>}

        <div className="shop-modal__balance">
          <span>Số dư khả dụng:</span>
          <strong>{coins.toLocaleString()} 🪙</strong>
        </div>

        {/* TAB 1: BUY SEEDS */}
        {tab === 'buy' && (
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
        )}

        {/* TAB 2: SELL CROPS & FISH */}
        {tab === 'sell' && (
          <div className="shop-modal__grid">
            {sellableItemsWithCount.length === 0 ? (
              <div className="shop-empty-sell">
                <div className="empty-icon">🧺</div>
                <p>Kho đồ của bạn chưa có nông sản hoặc cá để bán!</p>
                <small>Hãy dùng Liềm thu hoạch cây trồng chín hoặc câu cá tại hồ để đem bán kiếm Coins.</small>
              </div>
            ) : (
              sellableItemsWithCount.map((item) => (
                <div key={item.id} className="shop-item-card sell-card">
                  <div className="shop-item-card__icon-wrap">
                    <img src={item.icon} alt={item.name} className="shop-item-card__icon" />
                    <span className="shop-item-card__qty has-stock">x{item.count}</span>
                  </div>
                  <div className="shop-item-card__info">
                    <h4>{item.name}</h4>
                    <p>Giá thu mua: <strong>+{item.priceCoins} 🪙</strong> / đơn vị</p>
                  </div>
                  <div className="sell-actions">
                    <button
                      type="button"
                      className="sell-btn sell-one"
                      onClick={() => handleSell(item, 1)}
                    >
                      Bán 1 (+{item.priceCoins} 🪙)
                    </button>
                    {item.count > 1 && (
                      <button
                        type="button"
                        className="sell-btn sell-all"
                        onClick={() => handleSell(item, item.count)}
                      >
                        Bán Hết ({item.count * item.priceCoins} 🪙)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
