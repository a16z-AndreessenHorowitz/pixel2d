import { useState } from 'react'
import type { Quest } from '../mock-data/quests'
import { showGameAlert } from './NotificationModal'
import './QuestPanel.css'

export interface QuestProgress {
  planted: number
  harvested: number
  visitedExchange: boolean
  boughtShop: number
  fishCaught: number
  coins: number
}

interface QuestPanelProps {
  quests: Quest[]
  completedIds?: number[]
  progress?: QuestProgress
  isLoggedIn?: boolean
  onOpenAuth?: () => void
  onClaimReward?: (questId: number, rewardCoins: number) => void
}

export function QuestPanel({
  quests,
  completedIds = [],
  progress,
  isLoggedIn = false,
  onOpenAuth,
  onClaimReward,
}: QuestPanelProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const total = quests.length
  const done = completedIds.length

  const getQuestStatus = (q: Quest) => {
    const isClaimed = completedIds.includes(q.id)
    if (isClaimed) return { isClaimed: true, isReady: false, current: q.target, target: q.target }

    let current = 0
    let isReady = false

    if (progress) {
      switch (q.actionType) {
        case 'plant':
          current = progress.planted
          isReady = progress.planted >= q.target
          break
        case 'harvest':
          current = progress.harvested
          isReady = progress.harvested >= q.target
          break
        case 'exchange':
          current = progress.visitedExchange ? 1 : 0
          isReady = progress.visitedExchange
          break
        case 'shop':
          current = progress.boughtShop
          isReady = progress.boughtShop >= q.target
          break
        case 'rich':
          current = progress.fishCaught >= 1 || progress.coins >= 500 ? 1 : 0
          isReady = current >= 1
          break
        default:
          isReady = false
      }
    }

    return { isClaimed: false, isReady, current: Math.min(current, q.target), target: q.target }
  }

  const handleClaim = (quest: Quest) => {
    const status = getQuestStatus(quest)

    if (status.isClaimed) {
      showGameAlert({
        title: 'Nhiệm Vụ Đã Nhận',
        message: 'Bạn đã hoàn tất và nhận thưởng cho nhiệm vụ này rồi!',
        type: 'info',
        icon: '✓',
      })
      return
    }

    if (!isLoggedIn) {
      showGameAlert({
        title: 'Yêu Cầu Đăng Nhập',
        message: 'Vui lòng đăng nhập hoặc kết nối ví để hoàn thành và nhận thưởng Coin!',
        type: 'warning',
        icon: '🔒',
        confirmText: 'Đăng nhập ngay',
        onConfirm: () => onOpenAuth?.(),
      })
      return
    }

    if (!status.isReady) {
      showGameAlert({
        title: `Chưa Hoàn Thành: ${quest.title}`,
        message: `${quest.hint}\n\nTiến độ hiện tại: ${status.current}/${status.target}. Hãy hoàn thành nhiệm vụ trước khi nhận thưởng nhé!`,
        type: 'info',
        icon: '⏳',
        confirmText: 'Tôi hiểu rồi',
      })
      return
    }

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

            {!isLoggedIn && (
              <div
                className="quest-login-banner"
                onClick={onOpenAuth}
                role="button"
                tabIndex={0}
                aria-label="Đăng nhập để nhận thưởng"
              >
                <span className="quest-login-banner__icon">🔒</span>
                <div className="quest-login-banner__text">
                  <strong>Chưa đăng nhập tài khoản</strong>
                  <p>Vui lòng đăng nhập để hoàn thành nhiệm vụ và nhận thưởng Coin!</p>
                </div>
                <button type="button" className="quest-login-banner__btn">
                  Đăng nhập
                </button>
              </div>
            )}

            <div className="quest-list">
              {quests.map((q) => {
                const status = getQuestStatus(q)
                return (
                  <div
                    key={q.id}
                    className={`quest-card ${status.isClaimed ? 'quest-card--done' : ''}`}
                  >
                    <div className="quest-card__badge">{status.isClaimed ? '✓' : q.id}</div>
                    <div className="quest-card__info">
                      <h4>{q.title}</h4>
                      <p>{q.description}</p>
                      {!status.isClaimed && (
                        <div className="quest-progress-track">
                          <small>Tiến độ: {status.current}/{status.target}</small>
                        </div>
                      )}
                    </div>
                    <div className="quest-card__action">
                      <span className="quest-card__reward">+{q.rewardCoins} 🪙</span>
                      {status.isClaimed ? (
                        <span className="quest-status-badge">Đã nhận</span>
                      ) : !isLoggedIn ? (
                        <button
                          type="button"
                          className="quest-claim-btn quest-claim-btn--locked"
                          onClick={() => onOpenAuth?.()}
                        >
                          🔒 Đăng nhập
                        </button>
                      ) : status.isReady ? (
                        <button
                          type="button"
                          className="quest-claim-btn quest-claim-btn--ready"
                          onClick={() => handleClaim(q)}
                        >
                          🎁 Nhận thưởng
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="quest-claim-btn quest-claim-btn--in-progress"
                          onClick={() => handleClaim(q)}
                          title={q.hint}
                        >
                          ⏳ {status.current}/{status.target}
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
