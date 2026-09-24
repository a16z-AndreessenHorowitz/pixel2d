import type { Quest } from '../mock-data/quests'
import './QuestPanel.css'

interface QuestPanelProps {
  quests: Quest[]
  completedIds?: number[]
}

export function QuestPanel({ quests, completedIds = [] }: QuestPanelProps) {
  const total = quests.length
  const done = completedIds.length

  return (
    <div className="quest-panel" aria-label="Nhiệm vụ hôm nay">
      {/* Quarter-circle arc backdrop */}
      <div className="quest-panel__arc" />

      {/* Pixel-art paper note */}
      <div className="quest-note" aria-label={`${done}/${total} nhiệm vụ hoàn thành`}>
        {/* Pin */}
        <div className="quest-note__pin" aria-hidden="true">
          <div className="pin-head" />
          <div className="pin-needle" />
        </div>

        {/* Paper content */}
        <div className="quest-note__body">
          {/* Checkmark lines */}
          <div className="quest-note__checks" aria-hidden="true">
          </div>

          {/* Big number */}
          <div className="quest-note__count">{done}</div>
        </div>

        {/* Footer */}
        <div className="quest-note__footer">
          <span>NHIỆM VỤ HÔM NAY</span>
          <span className="quest-note__sub">{done}/{total} hoàn thành</span>
        </div>
      </div>
    </div>
  )
}
