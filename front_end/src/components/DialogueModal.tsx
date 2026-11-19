import { useEffect, useState } from 'react'
import { NPC_DIALOGUES, type DialogueStep } from '../data/dialogues'
import { soundEngine } from '../audio/SoundEngine'
import './DialogueModal.css'

interface DialogueModalProps {
  isOpen: boolean
  npcId: string
  onClose: () => void
  onOpenShop?: () => void
  onClaimReward?: (reward: DialogueStep['reward']) => void
}

export function DialogueModal({
  isOpen,
  npcId,
  onClose,
  onOpenShop,
  onClaimReward,
}: DialogueModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const config = NPC_DIALOGUES[npcId] || NPC_DIALOGUES.barney

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0)
    }
  }, [isOpen, npcId])

  // Keyboard navigation: Space/Enter = next step, Escape = close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') {
        const step = config.steps[currentStepIndex]
        if (!step) return

        // If there is only one option or 'next' option, trigger it
        const nextOpt = step.options?.find((o) => o.action === 'next')
        if (nextOpt) {
          e.preventDefault()
          handleOptionClick(nextOpt.action, step)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStepIndex, config, onClose])

  if (!isOpen || !config) return null

  const step = config.steps[currentStepIndex] || config.steps[0]
  const isLastStep = currentStepIndex === config.steps.length - 1

  const handleOptionClick = (
    action: 'next' | 'open_shop' | 'claim_and_close' | 'close',
    currentStep: DialogueStep,
  ) => {
    soundEngine.playClick()
    if (currentStep.reward) {
      soundEngine.playCoin()
      onClaimReward?.(currentStep.reward)
    }

    if (action === 'next') {
      if (currentStepIndex < config.steps.length - 1) {
        setCurrentStepIndex((prev) => prev + 1)
      } else {
        onClose()
      }
    } else if (action === 'open_shop') {
      onClose()
      onOpenShop?.()
    } else if (action === 'claim_and_close' || action === 'close') {
      onClose()
    }
  }

  return (
    <div className="dialogue-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dialogue-box" onClick={(e) => e.stopPropagation()}>
        {/* Header strip */}
        <div className="dialogue-header">
          <div className="dialogue-speaker-meta">
            <span className="speaker-name">{step.speakerName}</span>
            <span className="speaker-role">{step.speakerRole}</span>
          </div>

          <div className="dialogue-step-indicator">
            {config.steps.map((_, i) => (
              <span
                key={i}
                className={`step-dot ${i === currentStepIndex ? 'step-dot--active' : i < currentStepIndex ? 'step-dot--done' : ''}`}
              />
            ))}
            <button
              type="button"
              className="dialogue-close-btn"
              onClick={onClose}
              aria-label="Đóng hội thoại (Esc)"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="dialogue-body">
          {/* Avatar frame */}
          <div className="dialogue-avatar-frame">
            <div className="avatar-portrait-wrap">
              <img
                src={step.avatar}
                alt={step.speakerName}
                className="avatar-portrait-img"
              />
            </div>
            <span className="avatar-tag">NPC</span>
          </div>

          {/* Speech text & rewards */}
          <div className="dialogue-content">
            <p className="dialogue-message">{step.message}</p>

            {step.reward && (
              <div className="dialogue-reward-pill">
                <span className="reward-label">🎁 Quà tặng nhiệm vụ:</span>
                <span className="reward-values">
                  {step.reward.quantity && step.reward.itemName && (
                    <span className="reward-item">
                      +{step.reward.quantity} {step.reward.itemName}
                    </span>
                  )}
                  {step.reward.coins && (
                    <span className="reward-coins">+{step.reward.coins} 🪙 Coins</span>
                  )}
                  {step.reward.type === 'energy' && (
                    <span className="reward-energy">⚡ Hồi phục Năng lượng</span>
                  )}
                  {step.reward.xp && (
                    <span className="reward-xp">+{step.reward.xp} ⭐ EXP</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action footer */}
        <div className="dialogue-footer">
          <span className="dialogue-hint">Bấm [Space] hoặc [Enter] để tiếp tục</span>

          <div className="dialogue-options">
            {step.options && step.options.length > 0 ? (
              step.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`dialogue-btn ${opt.action === 'claim_and_close' ? 'dialogue-btn--gold' : opt.action === 'open_shop' ? 'dialogue-btn--green' : ''}`}
                  onClick={() => handleOptionClick(opt.action, step)}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <button
                type="button"
                className="dialogue-btn"
                onClick={() =>
                  handleOptionClick(isLastStep ? 'close' : 'next', step)
                }
              >
                {isLastStep ? 'Đóng hội thoại' : 'Tiếp tục ▶'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
