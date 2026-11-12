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

interface ExchangeOption {
  id: string
  coins: number
  pixel: number
  label: string
  description: string
  feeNote: string
  isPopular?: boolean
}

const DEFAULT_OPTIONS: ExchangeOption[] = [
  {
    id: 'opt_1k',
    coins: 1000,
    pixel: 10,
    label: '1,000 Coins',
    description: '10 $PIXEL Token',
    feeNote: 'Phí gas Sepolia ETH (~0.0002 ETH do người chơi tự trả qua MetaMask)',
    isPopular: false,
  },
  {
    id: 'opt_10k',
    coins: 10000,
    pixel: 100,
    label: '10,000 Coins',
    description: '100 $PIXEL Token',
    feeNote: 'Phí gas Sepolia ETH (~0.0002 ETH do người chơi tự trả qua MetaMask)',
    isPopular: true,
  },
  {
    id: 'opt_50k',
    coins: 50000,
    pixel: 500,
    label: '50,000 Coins',
    description: '500 $PIXEL Token',
    feeNote: 'Phí gas Sepolia ETH (~0.0002 ETH do người chơi tự trả qua MetaMask)',
    isPopular: false,
  },
  {
    id: 'opt_100k',
    coins: 100000,
    pixel: 1000,
    label: '100,000 Coins',
    description: '1,000 $PIXEL Token',
    feeNote: 'Phí gas Sepolia ETH (~0.0002 ETH do người chơi tự trả qua MetaMask)',
    isPopular: false,
  },
]

export function ClaimTokenModal({
  isOpen,
  onClose,
  inGameCoins,
  account,
  pixelBalance,
  claimFarmingReward,
  onClaimSuccess,
}: ClaimTokenModalProps) {
  const [selectedCoins, setSelectedCoins] = useState<number>(1000)
  const [isCustom, setIsCustom] = useState<boolean>(false)
  const [customCoins, setCustomCoins] = useState<number>(1000)
  const [loading, setLoading] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const [claimCap, setClaimCap] = useState<number>(10000)

  // Fetch status and options from Backend
  useEffect(() => {
    if (!isOpen || !account) return

    // Yêu cầu đồng bộ số dư coin mới nhất từ DB
    window.dispatchEvent(new CustomEvent('sync-game-state'))

    let active = true
    fetch(`${BACKEND_URL}/api/web3/claim-status?address=${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setCooldownRemaining(data.remainingCooldownSeconds || 0)
          setClaimCap(data.cap || 10000)
        }
      })
      .catch(() => {
        // Fallback
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

  // Active coin amount to claim
  const activeCoins = isCustom ? customCoins : selectedCoins
  const activePixel = Math.floor(activeCoins / 100)
  const maxCoinsClaimable = inGameCoins

  const handleSelectPackage = (coins: number) => {
    setIsCustom(false)
    setSelectedCoins(coins)
    setErrorMessage(null)
  }

  const handleCustomChange = (val: number) => {
    setIsCustom(true)
    const validVal = Math.max(1000, Math.floor(val / 1000) * 1000 || 1000)
    setCustomCoins(validVal)
    setErrorMessage(null)
  }

  const handleClaim = async () => {
    if (!account) {
      setErrorMessage('Vui lòng kết nối ví MetaMask trước khi rút token!')
      return
    }

    // Tự động kiểm tra và chuyển mạng MetaMask sang Sepolia nếu đang ở mạng khác (ví dụ Hardhat Localhost)
    const eth = (window as any).ethereum
    if (eth && eth.request) {
      try {
        const currentChainHex = await eth.request({ method: 'eth_chainId' })
        const currentChainId = parseInt(currentChainHex, 16)
        if (currentChainId !== 11155111) {
          try {
            await eth.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            })
          } catch (switchErr: any) {
            if (switchErr.code === 4902) {
              await eth.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0xaa36a7',
                    chainName: 'Ethereum Sepolia Testnet',
                    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io'],
                  },
                ],
              })
            } else {
              setErrorMessage('Vui lòng chuyển mạng MetaMask sang Ethereum Sepolia Testnet để giao dịch!')
              return
            }
          }
        }
      } catch {
        // bỏ qua nếu provider không hỗ trợ
      }
    }

    if (activeCoins < 1000) {
      setErrorMessage('Số lượng quy đổi tối thiểu là 1,000 Coins (1,000 Coins = 10 $PIXEL)!')
      return
    }

    if (activeCoins > inGameCoins) {
      setErrorMessage(`Số dư không đủ! Bạn hiện có ${inGameCoins} Coins, cần ${activeCoins} Coins.`)
      return
    }

    if (activePixel > claimCap) {
      setErrorMessage(`Vượt quá hạn mức tối đa mỗi lần rút (${claimCap} $PIXEL).`)
      return
    }

    if (cooldownRemaining > 0) {
      setErrorMessage(`Thời gian hồi đang kích hoạt. Vui lòng chờ ${cooldownRemaining}s!`)
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setSuccessTxHash(null)
    setStatusMessage('1/3: Backend đang kiểm tra số dư và ký duyệt chữ ký EIP-712...')

    let pendingNonce: number | null = null

    try {
      // 0. Tự động đồng bộ số dư In-Game Coin từ Client lên Database trước khi xác thực
      const token = localStorage.getItem('pixel_farm_jwt')
      await fetch(`${BACKEND_URL}/api/game/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address: account, coins: inGameCoins }),
      }).catch(() => {})

      // 1. Request EIP-712 Signature from Backend
      const sigRes = await fetch(`${BACKEND_URL}/api/web3/create-claim-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address: account, coinAmount: activeCoins }),
      }).then((r) => r.json())

      if (!sigRes.success) {
        throw new Error(sigRes.error || 'Không thể tạo chữ ký số từ backend')
      }

      const { coinAmount, pixelAmount, nonce, deadline, signature } = sigRes.data
      pendingNonce = nonce

      // 2. Player sends transaction to contract via MetaMask and pays gas
      setStatusMessage(`2/3: Mở ví MetaMask để xác nhận đúc ${pixelAmount} $PIXEL (Bạn tự trả phí gas Sepolia)...`)
      
      let txHash = ''
      try {
        txHash = await claimFarmingReward(pixelAmount, nonce, deadline, signature)
      } catch (userErr: any) {
        // Rollback on server if user cancelled or tx reverted
        if (pendingNonce) {
          try {
            await fetch(`${BACKEND_URL}/api/web3/claim-reward-rollback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nonce: pendingNonce, reason: userErr?.message || 'Hủy giao dịch' }),
            })
            window.dispatchEvent(new CustomEvent('sync-game-state'))
          } catch (e) {
            console.warn('Rollback error:', e)
          }
        }
        throw userErr
      }

      // 3. Confirm on Backend and store txHash
      setStatusMessage('3/3: Đang xác nhận biên nhận giao dịch on-chain vào MongoDB...')
      await fetch(`${BACKEND_URL}/api/web3/confirm-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce, txHash }),
      }).catch(console.warn)

      setSuccessTxHash(txHash)
      setStatusMessage(`🎉 Giao dịch thành công! Bạn đã nhận ${pixelAmount} $PIXEL vào ví!`)
      onClaimSuccess(coinAmount, txHash)
      setCooldownRemaining(10)
    } catch (err: any) {
      console.error('Lỗi quy đổi token:', err)
      let msg = err?.reason || err?.message || 'Giao dịch rút thất bại'
      if (err?.code === 4001 || msg.includes('user rejected')) {
        msg = 'Bạn đã hủy xác nhận trên ví MetaMask. Số Coin trong game đã được hoàn trả lại!'
      }
      setErrorMessage(msg)
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
            <div>
              <h3>Đổi Coin Lấy $PIXEL On-Chain</h3>
              <p className="claim-modal-sub">Chuẩn EIP-712 Sign-to-Mint • Sepolia Testnet</p>
            </div>
          </div>
          <button className="claim-close-btn" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="claim-modal-body">
          {/* Balance summary */}
          <div className="claim-balance-summary">
            <div className="claim-stat-box">
              <span className="claim-stat-label">Số Dư Coin Cày Game</span>
              <span className="claim-stat-value gold-text">🪙 {inGameCoins.toLocaleString()}</span>
            </div>
            <div className="claim-stat-arrow">➔</div>
            <div className="claim-stat-box">
              <span className="claim-stat-label">Số Dư $PIXEL Ví Web3</span>
              <span className="claim-stat-value purple-text">💎 {pixelBalance}</span>
            </div>
          </div>

          {/* Rate Notice */}
          <div className="claim-rate-notice">
            <span className="rate-badge">Tỷ lệ quy đổi: <strong>1,000 Coins = 10 $PIXEL</strong></span>
            <span className="fee-badge">Hạn mức: <strong>Tối đa {claimCap} $PIXEL</strong></span>
          </div>

          {/* Cooldown Alert */}
          {cooldownRemaining > 0 && (
            <div className="claim-cooldown-badge">
              ⏳ Thời gian hồi: Còn lại <strong>{cooldownRemaining}s</strong>
            </div>
          )}

          {/* Preset Packages */}
          <div className="claim-packages-container">
            <div className="claim-packages-header">
              <span>CHỌN MỨC ĐỔI THƯỞNG:</span>
              <span className="claim-packages-hint">(Bấm chọn gói phù hợp)</span>
            </div>

            <div className="claim-package-grid">
              {DEFAULT_OPTIONS.map((opt) => {
                const isSelected = !isCustom && selectedCoins === opt.coins
                const canAfford = inGameCoins >= opt.coins

                return (
                  <div
                    key={opt.id}
                    className={`claim-package-card ${isSelected ? 'active' : ''} ${!canAfford ? 'disabled' : ''}`}
                    onClick={() => handleSelectPackage(opt.coins)}
                  >
                    {opt.isPopular && <div className="package-popular-tag">Phổ biến</div>}
                    <div className="package-coins">🪙 {opt.coins.toLocaleString()}</div>
                    <div className="package-arrow">↓ đổi lấy</div>
                    <div className="package-pixel">💎 {opt.pixel} $PIXEL</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Custom Input */}
          <div className="claim-custom-input-box">
            <label className="claim-custom-label">
              <span>Hoặc nhập số Coin tùy chỉnh (Bội số 1,000):</span>
              {isCustom && <span className="custom-active-tag">Đang chọn tùy chỉnh</span>}
            </label>
            <div className="claim-input-wrapper">
              <input
                type="number"
                min={1000}
                step={1000}
                max={Math.max(1000, maxCoinsClaimable)}
                value={isCustom ? customCoins : selectedCoins}
                disabled={loading || cooldownRemaining > 0}
                onChange={(e) => handleCustomChange(Number(e.target.value))}
                className="claim-number-input"
              />
              <span className="claim-unit-label">Coins</span>
            </div>
          </div>

          {/* Detailed Fee & Summary Card */}
          <div className="claim-detail-card">
            <div className="detail-row">
              <span className="detail-title">Số Coin khấu trừ Database:</span>
              <span className="detail-val gold-text">-{activeCoins.toLocaleString()} Coins</span>
            </div>
            <div className="detail-row">
              <span className="detail-title">Số Token $PIXEL đúc về ví:</span>
              <span className="detail-val purple-text">+{activePixel} $PIXEL</span>
            </div>
            <div className="detail-row">
              <span className="detail-title">Phí Nền Tảng (Game Fee):</span>
              <span className="detail-val green-text">0% (Miễn phí)</span>
            </div>
            <div className="detail-row">
              <span className="detail-title">Phí Gas Blockchain (Mạng Sepolia):</span>
              <span className="detail-val orange-text">Người chơi tự chi trả (MetaMask)</span>
            </div>
          </div>

          {/* Status and Error Messages */}
          {statusMessage && <div className="claim-status-alert">{statusMessage}</div>}
          {errorMessage && <div className="claim-error-alert">{errorMessage}</div>}

          {/* Transaction Success Box with Etherscan link */}
          {successTxHash && (
            <div className="claim-tx-success-box">
              <div className="tx-success-title">✅ Giao dịch đã được ghi nhận trên Sepolia:</div>
              <div className="tx-hash-display">{successTxHash}</div>
              <a
                href={`https://sepolia.etherscan.io/tx/${successTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="tx-etherscan-link"
              >
                🔍 Xem giao dịch trên Sepolia Etherscan ↗
              </a>
            </div>
          )}
        </div>

        <div className="claim-modal-footer">
          <button type="button" className="claim-cancel-btn" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button
            type="button"
            className="claim-submit-btn"
            onClick={handleClaim}
            disabled={
              loading ||
              cooldownRemaining > 0 ||
              inGameCoins < 1000 ||
              activeCoins <= 0 ||
              activeCoins > inGameCoins
            }
          >
            {loading ? (
              'Đang Xử Lý Giao Dịch...'
            ) : (
              `Xác Nhận Rút ${activePixel} $PIXEL (Tốn ${activeCoins.toLocaleString()} Coins)`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
