import { GameCanvas } from '../components/GameCanvas'
import { StatsPanel } from '../components/StatsPanel'
import { QuestPanel } from '../components/QuestPanel'
import { player } from '../mock-data/player'
import { quests } from '../mock-data/quests'
import './GamePage.css'

export function GamePage() {
  return (
    <section className="game-page" aria-label="Pixel Farm game">
      <GameCanvas />

      {/* ── Left panel: Energy / Coins / Gems ── */}
      <StatsPanel
        energy={player.energy}
        maxEnergy={100}
        coins={player.coins}
        gems={player.level}
      />

      {/* ── Right panel: Daily quests ── */}
      <QuestPanel
        quests={quests}
        completedIds={[1]}
      />


      <div className="game-toolbar">
        <button type="button" aria-label="Mở chat">•••</button>
        <button type="button" className="tool-selected">▥<small>1</small><span>BÌNH TƯỚI</span></button>
        <button type="button">⌁<small>2</small><span>LIỀM</span></button>
        <button type="button">⌂<small>3</small><span>CUỐC</span></button>
        <button type="button">✿<small>4</small><span>HẠT GIỐNG</span></button>
        <button type="button">✦<small>5</small><span>THU HOẠCH</span></button>
        <button type="button">↻</button>
      </div>
    </section>
  )
}
