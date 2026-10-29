import { useState, useEffect } from 'react'
import './ClaimTokenModal.css'

interface ClaimTokenModalProps {
  isOpen: boolean
  onClose: () => void
  inGameCoins: number
  account: string | null
  pixelBalance: string
  claimFarmingReward: (
    amount: number,
    nonce: number,
    deadline: number,
    signature: string,
  ) => Promise<string>
  onClaimSuccess: (claimedCoins: number, txHash: string) => void
}

const BACKEND_URL = 'http://localhost:4000'

export function ClaimTokenModal({
  isOpen,
  onClose,
  inGameCoins,
  account,
  pixelBalance,
  claimFarmingReward,
  onClaimSuccess,
}: ClaimTokenModalProps) {
  const [amount, setAmount] = useState<number>(50)
  const [loading, setLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [claimCap, setClaimCap] = useState<number>(100)

  // Query Backend for Cooldown & Cap
  useEffect(() => {
    if (!isOpen || !account) return

    let active = true
    fetch(`${BACKEND_URL}/api/web3/claim-status?address=${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setCooldownRemaining(data.remainingCooldownSeconds || 0)
          setClaimCap(data.cap || 100)
        }
      })
      .catch(() => {
        // Backend offline or fallback
      })

    return () => {
      active = false
    }
  }, [isOpen, account])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownRemaining])

  if (!isOpen) return null

  const maxClaimable = Math.min(inGameCoins, claimCap)

  const handleClaim = async () => {
    if (!account) {
      setErrorMessage('Vui lòng kết nối ví MetaMask trước!')
      return
    }

    if (amount <= 0 || amount > inGameCoins) {
      setErrorMessage(`Số lượng không hợp lệ (Số dư hiện tại: ${inGameCoins} Coins)`)
      return
    }

    if (amount > claimCap) {
      setErrorMessage(`Vượt quá hạn mức tối đa mỗi lần rút (${claimCap} Coins)`)
      return
    }

    if (cooldownRemaining > 0) {
      setErrorMessage(`Thời gian hồi đang kích hoạt. Vui lòng chờ ${cooldownRemaining}s!`)
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setStatusMessage('1/3: Đang yêu cầu chữ ký số ECDSA từ Backend...')

    try {
      // 1. Request ECDSA signature from Backend
      const sigRes = await fetch(`${BACKEND_URL}/api/web3/create-claim-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: account, amount }),
      }).then((r) => r.json())

      if (!sigRes.success) {
        throw new Error(sigRes.error || 'Không thể lấy chữ ký số từ server')
      }

      const { coinAmount, nonce, deadline, signature } = sigRes.data

      // 2. Call Smart Contract via MetaMask
      setStatusMessage('2/3: Vui lòng xác nhận giao dịch trên ví MetaMask...')
      const txHash = await claimFarmingReward(coinAmount, nonce, deadline, signature)

      // 3. Confirm claim on Backend
      setStatusMessage('3/3: Đang ghi nhận giao dịch vào hệ thống...')
      await fetch(`${BACKEND_URL}/api/web3/confirm-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, txHash }),
      }).catch(console.warn)

      setStatusMessage(`🎉 Rút thành công! Đã nhận ${coinAmount} $PIXEL on-chain!`)
      onClaimSuccess(coinAmount, txHash)
      setCooldownRemaining(300)
    } catch (err: any) {
      console.error('Claim error:', err)
      setErrorMessage(err?.reason || err?.message || 'Giao dịch rút thất bại')
      setStatusMessage(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="claim-modal-overlay" onClick={onClose}>
      <div className="claim-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="claim-modal-header">
          <div className="claim-modal-title">
            <span className="claim-title-icon">🪙</span>
            <h3>Đổi In-Game Coin sang $PIXEL</h3>
          </div>
          <button className="claim-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="claim-modal-body">
          <div className="claim-balance-summary">
            <div className="claim-stat-box">
              <span className="claim-stat-label">Số Dư Coin Trong Game</span>
              <span className="claim-stat-value gold-text">🪙 {inGameCoins}</span>
            </div>
            <div className="claim-stat-arrow">➔</div>
            <div className="claim-stat-box">
              <span className="claim-stat-label">Số Dư $PIXEL On-chain</span>
              <span className="claim-stat-value purple-text">💎 {pixelBalance}</span>
            </div>
          </div>

          <div className="claim-rate-notice">
            <span>Tỷ lệ quy đổi: <strong>1 In-Game Coin = 1 $PIXEL Token</strong></span>
            <span>Hạn mức: <strong>Tối đa {claimCap} Coins/lần</strong></span>
          </div>

          {cooldownRemaining > 0 && (
            <div className="claim-cooldown-badge">
              ⏳ Thời gian hồi: Còn lại <strong>{cooldownRemaining}s</strong>
            </div>
          )}

          <div className="claim-input-section">
            <label className="claim-input-label">Số lượng Coin muốn đổi sang $PIXEL:</label>
            <div className="claim-input-wrapper">
              <input
                type="number"
                min={1}
                max={maxClaimable}
                value={amount}
                disabled={loading || cooldownRemaining > 0}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                className="claim-number-input"
              />
              <span className="claim-unit-label">Coins</span>
            </div>

            <div className="claim-quick-buttons">
              <button
                type="button"
                className="claim-quick-btn"
                onClick={() => setAmount(Math.min(25, maxClaimable))}
                disabled={maxClaimable < 25}
              >
                25
              </button>
              <button
                type="button"
                className="claim-quick-btn"
                onClick={() => setAmount(Math.min(50, maxClaimable))}
                disabled={maxClaimable < 50}
              >
                50
              </button>
              <button
                type="button"
                className="claim-quick-btn"
                onClick={() => setAmount(Math.min(100, maxClaimable))}
                disabled={maxClaimable < 100}
              >
                100
              </button>
              <button
                type="button"
                className="claim-quick-btn"
                onClick={() => setAmount(maxClaimable)}
                disabled={maxClaimable <= 0}
              >
                Tối Đa
              </button>
            </div>
          </div>

          {statusMessage && <div className="claim-status-alert">{statusMessage}</div>}
          {errorMessage && <div className="claim-error-alert">{errorMessage}</div>}
        </div>

        <div className="claim-modal-footer">
          <button className="claim-cancel-btn" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button
            className="claim-submit-btn"
            onClick={handleClaim}
            disabled={
              loading ||
              cooldownRemaining > 0 ||
              inGameCoins <= 0 ||
              amount <= 0 ||
              amount > inGameCoins
            }
          >
            {loading ? 'Đang Xử Lý...' : `Xác Nhận Rút ${amount} $PIXEL`}
          </button>
        </div>
      </div>
    </div>
  )
}
