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
}: StatsPanelProps) {
  const energyPct = Math.min(100, Math.round((energy / maxEnergy) * 100))
  const xpPct = Math.min(100, xp % 100)

  return (
    <div className="stats-panel" aria-label="Tài nguyên người chơi">
      <div className="stats-panel__arc" />

      <div className="stats-panel__content">
        {/* 1. Energy Row */}
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

        {/* 2. Level & XP Row */}
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

        {/* 3. In-Game Coins Row */}
        <div className="stats-row" title="In-Game Coins">
          <span className="stats-icon" aria-hidden="true">🪙</span>
          <div className="stats-label">
            <span className="stats-tag">Coins</span>
            <span className="stats-value">{coins.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
