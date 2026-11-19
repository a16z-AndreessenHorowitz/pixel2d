import { useEffect, useState, useCallback } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import './NotificationModal.css'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface GameNotification {
  id?: string
  title?: string
  message: string
  type?: NotificationType
  icon?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  autoCloseMs?: number
}

// Global helper to trigger popup from anywhere
export function showGameAlert(options: string | GameNotification) {
  if (typeof window === 'undefined') return
  const detail = typeof options === 'string' ? { message: options } : options
  window.dispatchEvent(new CustomEvent('game-alert', { detail }))
}

export function NotificationModal() {
  const [activeAlert, setActiveAlert] = useState<GameNotification | null>(null)

  useEffect(() => {
    const handleGameAlert = (event: Event) => {
      const customEvent = event as CustomEvent<GameNotification>
      if (!customEvent.detail || !customEvent.detail.message) return

      const notif = customEvent.detail
      setActiveAlert(notif)

      // Sound effect
      if (notif.type === 'success') {
        soundEngine.playCoin()
      } else if (notif.type === 'error' || notif.type === 'warning') {
        soundEngine.playExhausted()
      } else {
        soundEngine.playClick()
      }
    }

    // Intercept native window.alert to automatically route to custom game popup
    const originalAlert = window.alert
    window.alert = (message?: any) => {
      showGameAlert({
        title: 'Thông Báo',
        message: String(message ?? ''),
        type: 'info',
        icon: '🔔',
      })
    }

    window.addEventListener('game-alert', handleGameAlert)
    return () => {
      window.removeEventListener('game-alert', handleGameAlert)
      window.alert = originalAlert
    }
  }, [])

  // Auto close timer if specified
  useEffect(() => {
    if (!activeAlert || !activeAlert.autoCloseMs) return
    const timer = setTimeout(() => {
      setActiveAlert(null)
    }, activeAlert.autoCloseMs)
    return () => clearTimeout(timer)
  }, [activeAlert])

  const handleConfirm = useCallback(() => {
    soundEngine.playClick()
    const cb = activeAlert?.onConfirm
    setActiveAlert(null)
    cb?.()
  }, [activeAlert])

  const handleCancel = useCallback(() => {
    soundEngine.playClick()
    const cb = activeAlert?.onCancel
    setActiveAlert(null)
    cb?.()
  }, [activeAlert])

  const handleBackdropClick = useCallback(() => {
    // If it's a simple alert (no cancel action required), click outside closes
    if (!activeAlert?.cancelText) {
      handleConfirm()
    }
  }, [activeAlert, handleConfirm])

  if (!activeAlert) return null

  const type = activeAlert.type || 'info'
  const defaultIcons: Record<NotificationType, string> = {
    info: '💡',
    success: '🎉',
    warning: '⚠️',
    error: '❌',
  }
  const defaultTitles: Record<NotificationType, string> = {
    info: 'Thông Báo Trò Chơi',
    success: 'Thành Công!',
    warning: 'Chú Ý',
    error: 'Thông Báo Lỗi',
  }

  const icon = activeAlert.icon || defaultIcons[type]
  const title = activeAlert.title || defaultTitles[type]
  const confirmText = activeAlert.confirmText || 'Đồng Ý'

  return (
    <div className="game-popup-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={`game-popup-box game-popup-box--${type}`} onClick={(e) => e.stopPropagation()}>
        {/* Glow Header Accent */}
        <div className="game-popup-header-accent" />

        <div className="game-popup-header">
          <div className="game-popup-title-group">
            <span className="game-popup-icon" aria-hidden="true">{icon}</span>
            <h3 className="game-popup-title">{title}</h3>
          </div>
          <button
            type="button"
            className="game-popup-close-btn"
            onClick={handleConfirm}
            aria-label="Đóng popup"
          >
            ✕
          </button>
        </div>

        <div className="game-popup-body">
          <p className="game-popup-message">{activeAlert.message}</p>
        </div>

        <div className="game-popup-footer">
          {activeAlert.cancelText && (
            <button
              type="button"
              className="game-popup-btn game-popup-btn--secondary"
              onClick={handleCancel}
            >
              {activeAlert.cancelText}
            </button>
          )}
          <button
            type="button"
            className={`game-popup-btn game-popup-btn--primary game-popup-btn--${type}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
