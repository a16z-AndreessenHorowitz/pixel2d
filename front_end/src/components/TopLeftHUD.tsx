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
  onOpenGameFiHub: _onOpenGameFiHub,
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

  // ── Cấu hình hình học cung bán nguyệt (Radial Arc Geometry) ──
  // Tâm vòng cung nằm ở góc trên-trái (0, 0), ôm sát viền StatsPanel arc (bán kính 168px)
  const START_ANGLE_DEG = 8   // Góc bắt đầu (mép trên gần thanh StatsPanel)
  const END_ANGLE_DEG = 80     // Góc kết thúc (mép dưới gần trục dọc)
  const ARC_RADIUS = 210       // Bán kính tâm icon đến góc (0, 0)
  const ICON_SIZE = 42         // Đường kính icon button (px)

  // Danh sách các nút chức năng với tọa độ tính toán tự động đều đặn trên cung bán nguyệt
  const actions: RadialActionItem[] = useMemo(() => {
    const rawList: Omit<RadialActionItem, 'customPos'>[] = [
      {
        id: 'farm',
        label: 'Nông Trại',
        sublabel: 'Về khu trồng trọt',
        icon: '🌾',
        theme: 'green',
        shortcut: '1',
        onClick: () => {
          if (onOpenFarm) {
            onOpenFarm()
          } else {
            window.dispatchEvent(new CustomEvent('focus-player'))
          }
        },
      },
    ]

    if (onOpenQuiz) {
      rawList.push({
        id: 'quiz',
        label: 'Trắc Nghiệm Web3',
        sublabel: 'Lớp học Blockchain & nhận Coin',
        icon: '🎓',
        theme: 'indigo',
        shortcut: 'Q',
        badge: 'EARN',
        isActive: isQuizOpen,
        onClick: onOpenQuiz,
      })
    }

    rawList.push({
      id: 'nft-shop',
      label: 'NFT Shop',
      sublabel: 'Trang bị Buff tăng tốc',
      icon: '✨',
      theme: 'amber',
      onClick: onOpenNftShop,
    })

    if (onOpenShop) {
      rawList.push({
        id: 'seed-shop',
        label: 'Tiệm Hạt Giống',
        sublabel: 'Mua nông sản & vật phẩm',
        icon: '🏪',
        theme: 'emerald',
        onClick: onOpenShop,
      })
    }

    rawList.push(
      {
        id: 'claim',
        label: 'Rút $PIXEL',
        sublabel: 'Quy đổi Coin sang Token',
        icon: '🔄',
        theme: 'cyan',
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
        onClick: handleToggleMap,
      },
    )

    // Chia đều góc trên cung bán nguyệt theo số lượng nút thực tế
    const n = rawList.length
    return rawList.map((item, index) => {
      const angleDeg =
        n > 1
          ? START_ANGLE_DEG + (index * (END_ANGLE_DEG - START_ANGLE_DEG)) / (n - 1)
          : (START_ANGLE_DEG + END_ANGLE_DEG) / 2
      const angleRad = (angleDeg * Math.PI) / 180

      const x = Math.round(ARC_RADIUS * Math.cos(angleRad) - ICON_SIZE / 2)
      const y = Math.round(ARC_RADIUS * Math.sin(angleRad) - ICON_SIZE / 2)

      return {
        ...item,
        customPos: { x, y },
      }
    })
  }, [
    onOpenFarm,
    onOpenQuiz,
    isQuizOpen,
    onOpenNftShop,
    onOpenClaim,
    onOpenShop,
    isOverviewActive,
    handleToggleMap,
  ])

  const iconSize = ICON_SIZE

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
