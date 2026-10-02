import { useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { StatsPanel } from '../components/StatsPanel'
import { QuestPanel } from '../components/QuestPanel'
import { player } from '../mock-data/player'
import { quests } from '../mock-data/quests'
import './GamePage.css'

type ToolId =
  | 'watering-can'
  | 'sickle'
  | 'hoe'
  | 'corn-seed'
  | 'rice-seed'
  | 'strawberry-seed'
  | 'pumpkin-seed'
  | 'watermelon-seed'

type ToolSlot = {
  id: ToolId
  label: string
  key: number
  icon: string
}

const TOOLS: ToolSlot[] = [
  { id: 'watering-can',    label: 'BÌNH TƯỚI', key: 1, icon: '/assets/tools/watering-can.png' },
  { id: 'sickle',          label: 'LIỀM',      key: 2, icon: '/assets/tools/sickle.png' },
  { id: 'hoe',             label: 'CUỐC',      key: 3, icon: '/assets/tools/hoe.png' },
  { id: 'corn-seed',       label: 'BẮP',       key: 4, icon: '/assets/tools/corn-seed.png' },
  { id: 'rice-seed',       label: 'LÚA',       key: 5, icon: '/assets/tools/rice-seed.png' },
  { id: 'strawberry-seed', label: 'DÂU',       key: 6, icon: '/assets/tools/strawberry-seed.png' },
  { id: 'pumpkin-seed',    label: 'BÍ NGÔ',    key: 7, icon: '/assets/tools/pumpkin-seed.png' },
  { id: 'watermelon-seed', label: 'DƯA HẤU',   key: 8, icon: '/assets/tools/watermelon-seed.png' },
]

export function GamePage() {
  const [selectedTool, setSelectedTool] = useState<ToolId>('watering-can')

  // Phát event để Phaser scene biết tool đang active
  const selectTool = (tool: ToolId) => {
    setSelectedTool(tool)
    window.dispatchEvent(new CustomEvent('farm-tool-changed', { detail: { tool } }))
  }

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

      <div className="game-toolbar" role="toolbar" aria-label="Công cụ nông trại">
        <button type="button" className="toolbar-menu" aria-label="Menu">•••</button>

        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            id={`tool-${tool.id}`}
            type="button"
            className={`toolbar-tool${selectedTool === tool.id ? ' tool-selected' : ''}`}
            aria-label={tool.label}
            aria-pressed={selectedTool === tool.id}
            onClick={() => selectTool(tool.id)}
          >
            <small>{tool.key}</small>
            <img
              src={tool.icon}
              alt={tool.label}
              className="tool-icon"
              draggable={false}
            />
            <span>{tool.label}</span>
          </button>
        ))}

        <button type="button" className="toolbar-menu" aria-label="Bản đồ">↻</button>
      </div>
    </section>
  )
}
