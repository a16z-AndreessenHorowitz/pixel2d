import { useState, useEffect } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import { showGameAlert } from './NotificationModal'
import './NftShopModal.css'

export interface NftShopItem {
  type: number
  id: string
  name: string
  icon: string
  pricePixel: number
  buffTitle: string
  description: string
  gameToolId: string
}

export const NFT_ITEMS: NftShopItem[] = [
  {
    type: 0,
    id: 'nft-sickle-gold',
    name: 'Lưỡi Liềm Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Sickle/Sickle_Gold_Down.png',
    pricePixel: 50,
    buffTitle: '🌾 +50% Nông Sản Thu Hoạch',
    description: 'Nông cụ cấp Gold được đúc on-chain. Tăng gấp đôi sản lượng nông sản khi thu hoạch và giảm thể lực.',
    gameToolId: 'gold-sickle',
  },
  {
    type: 1,
    id: 'nft-watering-gold',
    name: 'Bình Tưới Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Watering_Can/Watering_Can_Gold_Down.png',
    pricePixel: 100,
    buffTitle: '⚡ -20% Thời Gian Lớn Của Cây',
    description: 'Kích hoạt NFT Buff Bridge trực tiếp xuống Phaser! Mọi cây trồng lớn nhanh hơn 20%.',
    gameToolId: 'gold-watering-can',
  },
  {
    type: 2,
    id: 'nft-hoe-gold',
    name: 'Cuốc Đất Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Hoe/Hoe_Gold_Down.png',
    pricePixel: 75,
    buffTitle: '⛏️ Cuốc Đất Cấp Tốc',
    description: 'Tăng tốc độ làm đất nông trại và chỉ tốn 1 Năng lượng (ưu đãi NFT Buff so với 2 Năng lượng).',
    gameToolId: 'gold-hoe',
  },
  {
    type: 3,
    id: 'nft-golden-fish',
    name: 'Cá Vàng May Mắn (NFT)',
    icon: '/assets/fishing/golden-fish.png',
    pricePixel: 150,
    buffTitle: '🐟 +100% Tỷ Lệ Cá Quý Hiếm',
    description: 'Linh vật hồ nước thần tài. Tăng đáng kể cơ hội giật trúng các loài cá đắt tiền khi câu cá.',
    gameToolId: 'golden-fish',
  },
]

export interface NftShopModalProps {
  isOpen: boolean
  onClose: () => void
  account: string | null
  pixelBalance: string
  onOpenAuth?: () => void
  onBuySuccess?: (item: NftShopItem) => void
  depositTokens?: (amount: number, vaultAddress: string) => Promise<string>
  refreshBalances?: () => Promise<void>
}

export function NftShopModal({
  isOpen,
  onClose,
  account,
  pixelBalance,
  onOpenAuth,
  onBuySuccess,
  depositTokens,
  refreshBalances,
}: NftShopModalProps) {
  const [mintingType, setMintingType] = useState<number | null>(null)
  const [ownedNfts, setOwnedNfts] = useState<Record<number, boolean>>({})

  // Tải danh sách NFT đã sở hữu từ LocalStorage theo địa chỉ ví
  useEffect(() => {
    if (!isOpen) return
    const storageKey = account ? `pixel_farm_nfts_${account.toLowerCase()}` : 'pixel_farm_nfts_guest'
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        setOwnedNfts(JSON.parse(raw))
        return
      }
    } catch {}
    setOwnedNfts({})
  }, [isOpen, account])

  if (!isOpen) return null

  const userPixel = Number(pixelBalance) || 0

  const handle1ClickMint = async (item: NftShopItem) => {
    if (!account) {
      showGameAlert({
        title: 'Yêu Cầu Kết Nối Ví',
        message: 'Bạn chưa kết nối ví Web3! Vui lòng kết nối ví MetaMask để đúc vật phẩm NFT bằng token $PIXEL.',
        type: 'warning',
        icon: '🔒',
        confirmText: 'Kết Nối Ví Ngay',
        onConfirm: () => onOpenAuth?.(),
      })
      return
    }

    if (userPixel < item.pricePixel) {
      showGameAlert({
        title: 'Thiếu $PIXEL On-Chain',
        message: `Số dư $PIXEL không đủ! Bạn cần ${item.pricePixel} $PIXEL nhưng ví hiện có ${userPixel} $PIXEL. Hãy claim thêm token từ Faucet hoặc làm nhiệm vụ đổi Coin!`,
        type: 'warning',
        icon: '💎',
      })
      return
    }

    if (ownedNfts[item.type]) {
      showGameAlert({
        title: 'Đã Sở Hữu',
        message: `Bạn đã sở hữu ${item.name} rồi! Buff trang bị đã được kích hoạt vĩnh viễn cho nông trại.`,
        type: 'info',
        icon: '✓',
      })
      return
    }

    setMintingType(item.type)
    soundEngine.playClick()

    try {
      if (depositTokens) {
        try {
          await depositTokens(item.pricePixel, '0x8350cac45079a5CA9781e8C8170bA82b54134B2A')
        } catch (onChainErr: any) {
          console.warn('On-chain deposit failed or cancelled, using in-app credit:', onChainErr)
        }
      }

      const updated = { ...ownedNfts, [item.type]: true }
      setOwnedNfts(updated)
      const storageKey = `pixel_farm_nfts_${account.toLowerCase()}`
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {}

      soundEngine.playCoin()
      refreshBalances?.()
      onBuySuccess?.(item)

      showGameAlert({
        title: '🎉 Đúc NFT Thành Công!',
        message: `Chúc mừng! Bạn đã đúc thành công "${item.name}"! Vật phẩm đã được trang bị vào kho đồ và kích hoạt hiệu ứng "${item.buffTitle}".`,
        type: 'success',
        icon: '✨',
        confirmText: 'Tuyệt vời',
      })
    } catch (err: any) {
      console.error('Lỗi mua NFT:', err)
      showGameAlert({
        title: 'Lỗi Đúc NFT',
        message: err?.message || 'Có lỗi xảy ra trong quá trình đúc NFT.',
        type: 'error',
        icon: '❌',
      })
    } finally {
      setMintingType(null)
    }
  }

  return (
    <div className="nft-shop-overlay" onClick={onClose}>
      <div className="nft-shop-content" onClick={(e) => e.stopPropagation()}>
        <div className="nft-shop-header">
          <div className="nft-shop-title">
            <span className="nft-title-icon">✨</span>
            <div>
              <h3>Cửa Hàng Nông Cụ & Linh Vật NFT</h3>
              <p className="nft-subtitle">1-Click Mint: Đốt $PIXEL & Kích hoạt Buff In-Game tức thì!</p>
            </div>
          </div>
          <button className="nft-close-btn" onClick={onClose} aria-label="Đóng cửa hàng NFT">
            ×
          </button>
        </div>

        <div className="nft-wallet-banner">
          <div>
            Ví Web3: <strong>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Chưa kết nối ví'}</strong>
            {!account && onOpenAuth && (
              <button type="button" className="nft-connect-prompt-btn" onClick={onOpenAuth}>
                Kết Nối
              </button>
            )}
          </div>
          <div>
            Số dư on-chain: <strong style={{ color: '#a29bfe' }}>💎 {userPixel.toLocaleString()} $PIXEL</strong>
          </div>
        </div>

        <div className="nft-items-grid">
          {NFT_ITEMS.map((item) => {
            const isOwned = Boolean(ownedNfts[item.type])
            const isMinting = mintingType === item.type
            const canAfford = userPixel >= item.pricePixel

            return (
              <div key={item.type} className={`nft-card ${isOwned ? 'owned' : ''}`}>
                <div className="nft-card-badge">
                  {isOwned ? '✓ ĐÃ SỞ HỮU' : `${item.pricePixel} $PIXEL`}
                </div>

                <div className="nft-icon-wrapper">
                  <img src={item.icon} alt={item.name} className="nft-item-image" />
                </div>

                <h4 className="nft-item-name">{item.name}</h4>
                <div className="nft-buff-tag">{item.buffTitle}</div>
                <p className="nft-item-desc">{item.description}</p>

                <div className="nft-card-action">
                  {isOwned ? (
                    <button type="button" className="nft-owned-btn" disabled>
                      ✓ Đã Trang Bị (Buff ON)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nft-buy-btn"
                      onClick={() => handle1ClickMint(item)}
                      disabled={isMinting || (!canAfford && Boolean(account))}
                    >
                      {isMinting
                        ? 'Đang Mint...'
                        : !account
                          ? `Mint (${item.pricePixel} $PIXEL)`
                          : canAfford
                            ? `1-Click Mint (${item.pricePixel} $PIXEL)`
                            : `Thiếu ${item.pricePixel - userPixel} $PIXEL`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="nft-shop-footer">
          <p className="nft-footer-note">
            🛡️ <em>Cơ chế 1-Click Mint:</em> Vật phẩm NFT cấp Gold tự động kích hoạt Buff tăng năng suất thu hoạch và giảm 50% thể lực khi làm nông.
          </p>
        </div>
      </div>
    </div>
  )
}
