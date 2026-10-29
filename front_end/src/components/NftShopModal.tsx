import { useState } from 'react'
import './NftShopModal.css'

interface NftShopItem {
  type: number
  name: string
  icon: string
  pricePixel: number
  buffTitle: string
  description: string
}

const NFT_ITEMS: NftShopItem[] = [
  {
    type: 0,
    name: 'Lưỡi Liềm Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Sickle/Sickle_Gold_Down.png',
    pricePixel: 50,
    buffTitle: '🌾 +50% Nông Sản Thu Hoạch',
    description: 'Nông cụ cấp Gold được đúc on-chain. Tăng gấp đôi sản lượng nông sản khi thu hoạch.',
  },
  {
    type: 1,
    name: 'Bình Tưới Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Watering_Can/Watering_Can_Gold_Down.png',
    pricePixel: 100,
    buffTitle: '⚡ -20% Thời Gian Lớn Của Cây',
    description: 'Kích hoạt NFT Buff Bridge trực tiếp xuống Phaser! Mọi cây trồng lớn nhanh hơn 20%.',
  },
  {
    type: 2,
    name: 'Cuốc Đất Vàng (NFT)',
    icon: '/assets/tools/bloomseed/Hoe/Hoe_Gold_Down.png',
    pricePixel: 75,
    buffTitle: '⛏️ Cuốc Đất Cấp Tốc',
    description: 'Tăng tốc độ làm đất nông trại và giảm thể lực tiêu hao cho người nông dân.',
  },
  {
    type: 3,
    name: 'Cá Vàng May Mắn (NFT)',
    icon: '/assets/fishing/golden-fish.png',
    pricePixel: 150,
    buffTitle: '🐟 +100% Tỷ Lệ Cá Quý Hiếm',
    description: 'Linh vật hồ nước thần tài. Tăng đáng kể cơ hội giật trúng các loài cá đắt tiền.',
  },
]

interface NftShopModalProps {
  isOpen: boolean
  onClose: () => void
  account: string | null
  pixelBalance: string
  ownedNfts: [boolean, boolean, boolean, boolean]
  mintNft: (itemType: number) => Promise<string>
  onMintSuccess: (itemType: number, txHash: string) => void
}

export function NftShopModal({
  isOpen,
  onClose,
  account,
  pixelBalance,
  ownedNfts,
  mintNft,
  onMintSuccess,
}: NftShopModalProps) {
  const [mintingType, setMintingType] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const userPixel = Number(pixelBalance) || 0

  const handle1ClickMint = async (item: NftShopItem) => {
    if (!account) {
      setErrorMessage('Vui lòng kết nối ví MetaMask trước khi mua NFT!')
      return
    }

    if (userPixel < item.pricePixel) {
      setErrorMessage(`Số dư $PIXEL không đủ! Bạn cần ${item.pricePixel} $PIXEL nhưng chỉ có ${userPixel} $PIXEL.`)
      return
    }

    if (ownedNfts[item.type]) {
      setErrorMessage('Bạn đã sở hữu vật phẩm NFT này rồi!')
      return
    }

    setMintingType(item.type)
    setErrorMessage(null)
    setStatusMessage(`Đang đúc 1-Click Mint ${item.name}... Vui lòng ký trên ví MetaMask!`)

    try {
      const txHash = await mintNft(item.type)
      setStatusMessage(`🎉 Đúc NFT thành công! Đã kích hoạt hiệu ứng Buff cho nông trại!`)
      onMintSuccess(item.type, txHash)
    } catch (err: any) {
      console.error('Mint NFT error:', err)
      setErrorMessage(err?.reason || err?.message || 'Giao dịch đúc NFT thất bại')
      setStatusMessage(null)
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
          <button className="nft-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="nft-wallet-banner">
          <span>Ví kết nối: <strong>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Chưa kết nối'}</strong></span>
          <span>Số dư $PIXEL: <strong className="purple-text">💎 {pixelBalance} $PIXEL</strong></span>
        </div>

        {statusMessage && <div className="nft-status-alert">{statusMessage}</div>}
        {errorMessage && <div className="nft-error-alert">{errorMessage}</div>}

        <div className="nft-items-grid">
          {NFT_ITEMS.map((item) => {
            const isOwned = ownedNfts[item.type]
            const isMinting = mintingType === item.type
            const canAfford = userPixel >= item.pricePixel

            return (
              <div
                key={item.type}
                className={`nft-card ${isOwned ? 'owned' : ''}`}
              >
                <div className="nft-card-badge">
                  {isOwned ? '✓ ĐÃ SỞ HỮU' : `${item.pricePixel} $PIXEL`}
                </div>

                <div className="nft-icon-wrapper">
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="nft-item-image"
                    onError={(e) => {
                      // Fallback icon if specific tool sprite isn't found
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                </div>

                <h4 className="nft-item-name">{item.name}</h4>
                <div className="nft-buff-tag">{item.buffTitle}</div>
                <p className="nft-item-desc">{item.description}</p>

                <div className="nft-card-action">
                  {isOwned ? (
                    <button className="nft-owned-btn" disabled>
                      ✓ Đã Trang Bị (Buff ON)
                    </button>
                  ) : (
                    <button
                      className="nft-buy-btn"
                      onClick={() => handle1ClickMint(item)}
                      disabled={isMinting || !canAfford || !account}
                    >
                      {isMinting
                        ? 'Đang Ký Mint...'
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
            🛡️ <em>Cơ chế 1-Click Mint:</em> Smart Contract NFT sở hữu <code>BURNER_ROLE</code> nên đốt $PIXEL trực tiếp, người chơi <strong>không cần ký lệnh Approve riêng</strong> gây gián đoạn trải nghiệm!
          </p>
        </div>
      </div>
    </div>
  )
}
