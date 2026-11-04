import { useEffect, useState } from 'react'
import './StatsPanel.css'

interface StatsPanelProps {
  energy: number
  maxEnergy: number
  coins: number
  gems?: number
  level?: number
  xp?: number
  isLoggedIn?: boolean
  onOpenAuth?: () => void
}

export function StatsPanel({
  energy,
  maxEnergy,
  coins,
  gems: _gems = 0,
  level = 1,
  xp = 0,
  isLoggedIn = false,
  onOpenAuth,
}: StatsPanelProps) {
  const [isOverview, setIsOverview] = useState(false)
  const energyPct = Math.min(100, Math.round((energy / maxEnergy) * 100))
  const xpPct = Math.min(100, xp % 100)

  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ overview: boolean }>
      if (typeof customEvent.detail?.overview === 'boolean') {
        setIsOverview(customEvent.detail.overview)
      }
    }

    window.addEventListener('farm-overview-changed', handleSync)
    return () => {
      window.removeEventListener('farm-overview-changed', handleSync)
    }
  }, [])

  const handleToggleOverview = () => {
    setIsOverview((prev) => {
      const next = !prev
      window.dispatchEvent(new CustomEvent('toggle-map-overview', { detail: { overview: next } }))
      return next
    })
  }

  return (
    <div className="stats-panel" aria-label="Tài nguyên người chơi">
      <div className="stats-panel__arc" />

      <div className="stats-panel__content">
        {/* Energy */}
        <div className="stats-row stats-row--energy" title="Năng lượng thể lực (Ăn nông sản để hồi phục)">
          <span className="stats-icon" aria-hidden="true">⚡</span>
          <div className="stats-bar-wrap">
            <div className="stats-bar-track">
              <div className="stats-bar-fill" style={{ width: `${energyPct}%` }} />
            </div>
            <span className="stats-bar-label">
              {energy}<small>/{maxEnergy}</small>
            </span>
          </div>
        </div>

        {/* Level & XP */}
        <div className="stats-row stats-row--xp" title={`Kinh nghiệm nông trại: ${xp % 100}/100 XP`}>
          <span className="stats-icon" aria-hidden="true">⭐</span>
          <div className="stats-bar-wrap">
            <div className="stats-bar-track xp-track">
              <div className="stats-bar-fill xp-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="stats-bar-label">
              Cấp {level} <small>({xp % 100}/100 XP)</small>
            </span>
          </div>
        </div>

        {/* Coins */}
        <div className="stats-row" title="In-Game Coins">
          <span className="stats-icon" aria-hidden="true">🪙</span>
          <div className="stats-label">
            <span className="stats-tag">Coins</span>
            <span className="stats-value">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Auth status indicator */}
        {!isLoggedIn && (
          <button
            type="button"
            className="stats-unauth-pill"
            onClick={onOpenAuth}
            title="Bấm để đăng nhập và lưu xu"
          >
            🔒 Chưa đăng nhập
          </button>
        )}
      </div>

      {/* ── Circular Location Pin Button (Toggle Map Overview) ── */}
      <button
        type="button"
        className={`stats-location-btn ${isOverview ? 'stats-location-btn--active' : ''}`}
        onClick={handleToggleOverview}
        title={isOverview ? 'Góc nhìn người chơi (M)' : 'Góc nhìn toàn bản đồ (M)'}
        aria-label="Thu phóng toàn bộ bản đồ"
      >
        <span className="stats-location-btn__inner">
          <svg
            className="stats-location-svg"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#ffffff"
            />
            <circle cx="12" cy="9" r="3" fill="#237b3b" />
          </svg>
        </span>
        {isOverview && <span className="stats-location-badge">MAX</span>}
      </button>
    </div>
  )
}

