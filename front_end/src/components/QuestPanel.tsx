import { useState } from 'react'
import type { Quest } from '../mock-data/quests'
import './QuestPanel.css'

interface QuestPanelProps {
  quests: Quest[]
  completedIds?: number[]
  onClaimReward?: (questId: number, rewardCoins: number) => void
}

export function QuestPanel({ quests, completedIds = [], onClaimReward }: QuestPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const total = quests.length
  const done = completedIds.length

  const handleClaim = (quest: Quest) => {
    if (completedIds.includes(quest.id)) return
    onClaimReward?.(quest.id, quest.rewardCoins)
  }

  return (
    <>
      <div
        className="quest-panel"
        aria-label="Nhiệm vụ hôm nay"
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
      >
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
            <div className="quest-note__checks" aria-hidden="true" />
            <div className="quest-note__count">{done}</div>
          </div>

          {/* Footer */}
          <div className="quest-note__footer">
            <span>NHIỆM VỤ HÔM NAY</span>
            <span className="quest-note__sub">{done}/{total} hoàn thành</span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="quest-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="quest-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quest-modal__header">
              <div>
                <h2>📜 BẢNG NHIỆM VỤ NÔNG TRẠI</h2>
                <p>Hoàn thành thử thách hàng ngày để nhận thưởng Coin</p>
              </div>
              <button
                type="button"
                className="quest-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="quest-list">
              {quests.map((q) => {
                const isCompleted = completedIds.includes(q.id)
                return (
                  <div
                    key={q.id}
                    className={`quest-card ${isCompleted ? 'quest-card--done' : ''}`}
                  >
                    <div className="quest-card__badge">{isCompleted ? '✓' : q.id}</div>
                    <div className="quest-card__info">
                      <h4>{q.title}</h4>
                      <p>{q.description}</p>
                    </div>
                    <div className="quest-card__action">
                      <span className="quest-card__reward">+{q.rewardCoins} 🪙</span>
                      {isCompleted ? (
                        <span className="quest-status-badge">Đã nhận</span>
                      ) : (
                        <button
                          type="button"
                          className="quest-claim-btn"
                          onClick={() => handleClaim(q)}
                        >
                          Nhận thưởng
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
