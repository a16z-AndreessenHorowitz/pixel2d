import { useCallback, useEffect, useMemo, useState } from 'react'
import { StatsPanel } from './StatsPanel'
import { soundEngine } from '../audio/SoundEngine'
import './TopLeftHUD.css'

export interface TopLeftHUDProps {
  /** Điểm thể lực / năng lượng hiện tại */
  energy: number
  /** Thể lực tối đa */
  maxEnergy: number
  /** Số dư Coin trong game */
  coins: number
  /** Cấp độ người chơi */
  level?: number
  /** Điểm kinh nghiệm XP */
  xp?: number
  /** Trạng thái đã đăng nhập tài khoản / SIWE */
  isLoggedIn?: boolean
  /** Callback mở modal đăng nhập / hồ sơ */
  onOpenAuth?: () => void

  /** Callback mở / chuyển góc nhìn về khu nông trại */
  onOpenFarm?: () => void
  /** Callback mở GameFi Hub Modal */
  onOpenGameFiHub: () => void
  /** Callback mở NFT Shop (Buff Trang Bị) */
  onOpenNftShop: () => void
  /** Callback mở Modal Rút $PIXEL */
  onOpenClaim: () => void
  /** Callback mở Cửa hàng hạt giống (tùy chọn) */
  onOpenShop?: () => void

  /** Trạng thái góc nhìn toàn cảnh nông trại */
  isOverview?: boolean
  /** Callback bật/tắt toàn cảnh nông trại */
  onToggleOverview?: () => void
}

interface RadialActionItem {
  id: string
  label: string
  sublabel: string
  icon: string
  theme: 'green' | 'purple' | 'amber' | 'cyan' | 'blue' | 'emerald'
  onClick: () => void
  isActive?: boolean
  badge?: string | number
  shortcut?: string
  /** Tọa độ cố định (pixels) để tự do căn chỉnh theo góc bo StatsPanel */
  customPos: {
    x: number
    y: number
  }
}

export function TopLeftHUD({
  energy,
  maxEnergy,
  coins,
  level = 1,
  xp = 0,
  onOpenFarm,
  onOpenGameFiHub,
  onOpenNftShop,
  onOpenClaim,
  onOpenShop,
  isOverview: controlledOverview,
  onToggleOverview,
}: TopLeftHUDProps) {
  // Đồng bộ trạng thái Overview Map với Phaser Scene
  const [internalOverview, setInternalOverview] = useState(false)
  const isOverviewActive = controlledOverview ?? internalOverview

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ overview: boolean }>
      if (typeof customEvent.detail?.overview === 'boolean') {
        setInternalOverview(customEvent.detail.overview)
      }
    }

    window.addEventListener('farm-overview-changed', handleSync)
    return () => {
      window.removeEventListener('farm-overview-changed', handleSync)
    }
  }, [])

  const handleToggleMap = useCallback(() => {
    soundEngine.playClick()
    if (onToggleOverview) {
      onToggleOverview()
    } else {
      setInternalOverview((prev) => {
        const next = !prev
        window.dispatchEvent(
          new CustomEvent('toggle-map-overview', { detail: { overview: next } }),
        )
        return next
      })
    }
  }, [onToggleOverview])

  const handleClickAction = (handler: () => void) => {
    soundEngine.playClick()
    handler()
  }

  // Danh sách các nút chức năng với tọa độ cố định trực quan (dễ tinh chỉnh độc lập)
  const actions: RadialActionItem[] = useMemo(() => {
    // 1. Cấu hình vị trí khi có 5 nút thông thường
    const defaultPositions = {
      farm: { x: 175, y: 15 },
      hub: { x: 165, y: 65 },
      nftShop: { x: 140, y: 110 },
      claim: { x: 95, y: 145 },
      map: { x: 35, y: 165 },
    }

    // 2. Cấu hình vị trí khi có thêm nút thứ 6 (Tiệm hạt giống)
    const expandedPositions = {
      farm: { x: 175, y: 15 },
      hub: { x: 165, y: 55 },
      nftShop: { x: 150, y: 95 },
      seedShop: { x: 125, y: 130 },
      claim: { x: 85, y: 150 },
      map: { x: 35, y: 165 },
    }

    const hasShop = Boolean(onOpenShop)
    const pos = hasShop ? expandedPositions : defaultPositions

    const list: RadialActionItem[] = [
      {
        id: 'farm',
        label: 'Nông Trại',
        sublabel: 'Về khu trồng trọt',
        icon: '🌾',
        theme: 'green',
        shortcut: '1',
        customPos: pos.farm,
        onClick: () => {
          if (onOpenFarm) {
            onOpenFarm()
          } else {
            window.dispatchEvent(new CustomEvent('focus-player'))
          }
        },
      },
      {
        id: 'hub',
        label: 'GameFi Hub',
        sublabel: 'BXH & Thống kê kinh tế',
        icon: '📊',
        theme: 'purple',
        customPos: pos.hub,
        onClick: onOpenGameFiHub,
      },
      {
        id: 'nft-shop',
        label: 'NFT Shop',
        sublabel: 'Trang bị Buff tăng tốc',
        icon: '✨',
        theme: 'amber',
        customPos: pos.nftShop,
        onClick: onOpenNftShop,
      },
      {
        id: 'claim',
        label: 'Rút $PIXEL',
        sublabel: 'Quy đổi Coin sang Token',
        icon: '🔄',
        theme: 'cyan',
        customPos: pos.claim,
        onClick: onOpenClaim,
      },
      {
        id: 'map',
        label: isOverviewActive ? 'Góc Nhìn Player' : 'Toàn Cảnh Bản Đồ',
        sublabel: isOverviewActive ? 'Trở về nhân vật' : 'Thu phóng toàn map',
        icon: '📍',
        theme: 'blue',
        shortcut: 'M',
        isActive: isOverviewActive,
        badge: isOverviewActive ? 'MAX' : undefined,
        customPos: pos.map,
        onClick: handleToggleMap,
      },
    ]

    if (onOpenShop) {
      list.splice(3, 0, {
        id: 'seed-shop',
        label: 'Tiệm Hạt Giống',
        sublabel: 'Mua nông sản & vật phẩm',
        icon: '🏪',
        theme: 'emerald',
        customPos: expandedPositions.seedShop,
        onClick: onOpenShop,
      })
    }

    return list
  }, [
    onOpenFarm,
    onOpenGameFiHub,
    onOpenNftShop,
    onOpenClaim,
    onOpenShop,
    isOverviewActive,
    handleToggleMap,
  ])

  const iconSize = 42

  return (
    <div className="top-left-hud" aria-label="HUD Nông Trại & Menu Bán Nguyệt">
      {/* 1. Profile / Stats góc phần tư (Năng lượng, XP, Cấp độ, Coins) */}
      <StatsPanel
        energy={energy}
        maxEnergy={maxEnergy}
        coins={coins}
        level={level}
        xp={xp}
      />

      {/* 2. Dãy icon hình tròn hiển thị theo tọa độ tĩnh customPos */}
      <nav className="radial-arc-menu" aria-label="Các tính năng game nhanh">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`radial-arc-btn radial-arc-btn--${action.theme} ${
              action.isActive ? 'radial-arc-btn--active' : ''
            }`}
            style={{
              left: `${action.customPos.x}px`,
              top: `${action.customPos.y}px`,
              width: `${iconSize}px`,
              height: `${iconSize}px`,
            }}
            onClick={() => handleClickAction(action.onClick)}
            aria-label={`${action.label}: ${action.sublabel}`}
          >
            <span className="radial-arc-btn__ring" aria-hidden="true" />
            <span className="radial-arc-btn__icon" aria-hidden="true">
              {action.icon}
            </span>

            {action.badge && (
              <span className="radial-arc-btn__badge">{action.badge}</span>
            )}

            {/* Tooltip Pixel-art nổi khi rê chuột */}
            <div className="radial-tooltip" role="tooltip">
              <div className="radial-tooltip__header">
                <span className="radial-tooltip__title">{action.label}</span>
                {action.shortcut && (
                  <span className="radial-tooltip__key">[{action.shortcut}]</span>
                )}
              </div>
              <span className="radial-tooltip__sub">{action.sublabel}</span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  )
}
