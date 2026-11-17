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
  /** Callback mở Modal Trắc Nghiệm Blockchain */
  onOpenQuiz?: () => void
  /** Trạng thái mở Modal Trắc Nghiệm Blockchain */
  isQuizOpen?: boolean

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
  theme: 'green' | 'purple' | 'amber' | 'cyan' | 'blue' | 'emerald' | 'indigo'
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
  onOpenQuiz,
  isQuizOpen,
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
    const hasShop = Boolean(onOpenShop)
    const hasQuiz = Boolean(onOpenQuiz)

    // Cấu hình vị trí theo số lượng nút:
    // 1. 5 nút cơ bản: farm, hub, nftShop, claim, map
    const defaultPositions = {
      farm: { x: 175, y: 15 },
      hub: { x: 165, y: 65 },
      nftShop: { x: 140, y: 110 },
      claim: { x: 95, y: 145 },
      map: { x: 35, y: 165 },
    }

    // 2. 6 nút khi có Tiệm Hạt Giống: farm, hub, nftShop, seedShop, claim, map
    const shopPositions = {
      farm: { x: 175, y: 15 },
      hub: { x: 165, y: 55 },
      nftShop: { x: 150, y: 95 },
      seedShop: { x: 125, y: 130 },
      claim: { x: 85, y: 150 },
      map: { x: 35, y: 165 },
    }

    // 3. 6 nút khi có Trắc Nghiệm Quiz: farm, hub, quiz, nftShop, claim, map
    const quizPositions = {
      farm: { x: 178, y: 14 },
      hub: { x: 168, y: 56 },
      quiz: { x: 146, y: 98 },
      nftShop: { x: 118, y: 132 },
      claim: { x: 80, y: 155 },
      map: { x: 30, y: 168 },
    }

    // 4. 7 nút đầy đủ cả Shop và Quiz: farm, hub, quiz, nftShop, seedShop, claim, map
    const fullPositions = {
      farm: { x: 188, y: 10 },
      hub: { x: 178, y: 50 },
      quiz: { x: 158, y: 88 },
      nftShop: { x: 132, y: 124 },
      seedShop: { x: 100, y: 154 },
      claim: { x: 62, y: 176 },
      map: { x: 18, y: 186 },
    }

    let pos: Record<string, { x: number; y: number }> = defaultPositions
    if (hasShop && hasQuiz) pos = fullPositions
    else if (hasShop) pos = shopPositions
    else if (hasQuiz) pos = quizPositions

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
    ]

    if (onOpenQuiz) {
      list.push({
        id: 'quiz',
        label: 'Trắc Nghiệm Web3',
        sublabel: 'Lớp học Blockchain & nhận Coin',
        icon: '🎓',
        theme: 'indigo',
        shortcut: 'Q',
        badge: 'EARN',
        isActive: isQuizOpen,
        customPos: pos.quiz,
        onClick: onOpenQuiz,
      })
    }

    list.push({
      id: 'nft-shop',
      label: 'NFT Shop',
      sublabel: 'Trang bị Buff tăng tốc',
      icon: '✨',
      theme: 'amber',
      customPos: pos.nftShop,
      onClick: onOpenNftShop,
    })

    if (onOpenShop) {
      list.push({
        id: 'seed-shop',
        label: 'Tiệm Hạt Giống',
        sublabel: 'Mua nông sản & vật phẩm',
        icon: '🏪',
        theme: 'emerald',
        customPos: pos.seedShop,
        onClick: onOpenShop,
      })
    }

    list.push(
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
    )

    return list
  }, [
    onOpenFarm,
    onOpenGameFiHub,
    onOpenQuiz,
    isQuizOpen,
    onOpenNftShop,
    onOpenClaim,
    onOpenShop,
    isOverviewActive,
    handleToggleMap,
  ])

  const iconSize = onOpenShop && onOpenQuiz ? 40 : 42

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
