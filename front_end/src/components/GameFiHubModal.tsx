import { useEffect, useState } from 'react'
import './GameFiHubModal.css'

export interface GameFiHubModalProps {
  isOpen: boolean
  onClose: () => void
  coins: number
  energy: number
  maxEnergy: number
  level: number
  xp: number
  account: string | null
  pixelBalance: string
  ethBalance: string
  onOpenClaim: () => void
  onConnectWallet: () => void
}

interface TransactionRecord {
  id: string
  wallet_address: string
  type: string
  amount: number
  tx_hash?: string
  details?: string
  created_at: string
}

interface ClaimStatus {
  cap: number
  cooldownSeconds: number
  canClaim: boolean
  remainingCooldownSeconds: number
  signerAddress?: string
}

export function GameFiHubModal({
  isOpen,
  onClose,
  coins,
  energy,
  maxEnergy,
  level,
  xp,
  account,
  pixelBalance,
  ethBalance,
  onOpenClaim,
  onConnectWallet,
}: GameFiHubModalProps) {
  const [tab, setTab] = useState<'overview' | 'vault' | 'history'>('overview')
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null)
  const [cooldownCountdown, setCooldownCountdown] = useState<number>(0)
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  // Fetch Claim Status & Cooldown from Backend
  useEffect(() => {
    if (!isOpen || !account) return

    fetch(`http://localhost:4000/api/web3/claim-status?address=${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setClaimStatus(data)
          setCooldownCountdown(data.remainingCooldownSeconds || 0)
        }
      })
      .catch(() => {})
  }, [isOpen, account])

  // Real-time Cooldown Countdown Tick
  useEffect(() => {
    if (cooldownCountdown <= 0) return

    const interval = setInterval(() => {
      setCooldownCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldownCountdown])

  // Fetch Transactions from MongoDB
  useEffect(() => {
    if (!isOpen) return

    setLoadingTx(true)
    const url = account
      ? `http://localhost:4000/api/transactions?address=${account}`
      : 'http://localhost:4000/api/transactions'

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTx(false))
  }, [isOpen, account])

  if (!isOpen) return null

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null

  return (
    <div className="gamefi-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gamefi-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gamefi-modal__header">
          <div className="header-brand">
            <span className="brand-logo-icon">📊</span>
            <div>
              <h2 className="header-title">GAMEFI VAULT & DASHBOARD</h2>
              <p className="header-sub">Trung tâm quản lý tài sản Web 2.5 & Cổng kết nối On-chain</p>
            </div>
          </div>

          <button type="button" className="gamefi-close-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="gamefi-tabs">
          <button
            type="button"
            className={`gamefi-tab-btn ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            🌐 Tổng Quan Tài Sản
          </button>
          <button
            type="button"
            className={`gamefi-tab-btn ${tab === 'vault' ? 'active' : ''}`}
            onClick={() => setTab('vault')}
          >
            🛡️ EIP-712 Vault ($PIXEL)
          </button>
          <button
            type="button"
            className={`gamefi-tab-btn ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            📜 Lịch Sử Giao Dịch
          </button>
        </div>

        {/* Content Body */}
        <div className="gamefi-modal__body">
          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div className="overview-tab-content">
              <div className="balance-grid">
                {/* Off-chain In-game Assets */}
                <div className="balance-card balance-card--game">
                  <div className="card-top">
                    <span className="card-type-tag">OFF-CHAIN / IN-GAME</span>
                    <span className="card-status-dot green" />
                  </div>
                  <h3 className="card-title">Tài Khoản Nông Trại</h3>
                  <div className="balance-item">
                    <span className="balance-icon">🪙</span>
                    <div>
                      <span className="balance-val">{coins.toLocaleString('vi-VN')}</span>
                      <small className="balance-unit">Coins Nông Trại</small>
                    </div>
                  </div>
                  <div className="balance-item">
                    <span className="balance-icon">⚡</span>
                    <div>
                      <span className="balance-val">{energy} / {maxEnergy}</span>
                      <small className="balance-unit">Thể Lực Năng Lượng</small>
                    </div>
                  </div>
                  <div className="balance-item">
                    <span className="balance-icon">⭐</span>
                    <div>
                      <span className="balance-val">Cấp {level} ({xp % 100}/100 XP)</span>
                      <small className="balance-unit">Cấp Độ Nông Dân</small>
                    </div>
                  </div>
                </div>

                {/* On-chain Blockchain Assets */}
                <div className="balance-card balance-card--web3">
                  <div className="card-top">
                    <span className="card-type-tag">ON-CHAIN / EVM WALLET</span>
                    <span className={`card-status-dot ${account ? 'green' : 'orange'}`} />
                  </div>
                  <h3 className="card-title">Ví Tiền Điện Tử MetaMask</h3>
                  {account ? (
                    <>
                      <div className="balance-item">
                        <span className="balance-icon">💎</span>
                        <div>
                          <span className="balance-val">{pixelBalance}</span>
                          <small className="balance-unit">$PIXEL Token</small>
                        </div>
                      </div>
                      <div className="balance-item">
                        <span className="balance-icon">⛽</span>
                        <div>
                          <span className="balance-val">{parseFloat(ethBalance || '0').toFixed(4)}</span>
                          <small className="balance-unit">ETH (Gas Fee)</small>
                        </div>
                      </div>
                      <div className="balance-item">
                        <span className="balance-icon">🦊</span>
                        <div>
                          <span className="balance-val mono">{shortAddress}</span>
                          <small className="balance-unit">Địa Chỉ Ví Kết Nối</small>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="unconnected-wallet-box">
                      <p>Chưa kết nối ví MetaMask. Kết nối ngay để quản lý số dư on-chain!</p>
                      <button
                        type="button"
                        className="connect-wallet-action-btn"
                        onClick={onConnectWallet}
                      >
                        🦊 Kết Nối Ví MetaMask
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions-bar">
                <button
                  type="button"
                  className="quick-action-btn quick-action-btn--claim"
                  onClick={() => {
                    onClose()
                    onOpenClaim()
                  }}
                >
                  🪙 Đổi Coin Lấy $PIXEL
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ECDSA VAULT */}
          {tab === 'vault' && (
            <div className="vault-tab-content">
              <div className="vault-security-banner">
                <div className="shield-icon">🛡️</div>
                <div>
                  <h4>Hệ Thống Chữ Ký ECDSA & Chống Gian Lận (Anti-Cheat Vault)</h4>
                  <p>
                    Mọi giao dịch quy đổi Coin sang token $PIXEL on-chain đều được thẩm định ngoài chuỗi
                    bởi Private Key ECDSA độc quyền của Backend, đảm bảo không thể hack hay mint tùy tiện.
                  </p>
                </div>
              </div>

              <div className="vault-metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Hạn Mức Mỗi Lần Rút (Cap)</span>
                  <strong className="metric-number">100 $PIXEL</strong>
                  <span className="metric-desc">Tối đa 100 Coins / giao dịch</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Thời Gian Hồi Chiêu (Cooldown)</span>
                  <strong className="metric-number">300 Giây</strong>
                  <span className="metric-desc">5 phút giữa 2 lần rút liên tiếp</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Trạng Thái Rút Hiện Tại</span>
                  {cooldownCountdown > 0 ? (
                    <strong className="metric-number red">
                      ⏳ {formatCountdown(cooldownCountdown)}
                    </strong>
                  ) : (
                    <strong className="metric-number green">✅ SẴN SÀNG</strong>
                  )}
                  <span className="metric-desc">
                    {cooldownCountdown > 0 ? 'Đang hồi chiêu chống spam' : 'Có thể yêu cầu rút ngay'}
                  </span>
                </div>
              </div>

              {claimStatus?.signerAddress && (
                <div className="signer-info-bar">
                  <span>🔑 Địa chỉ ECDSA Signer ủy quyền:</span>
                  <code>{claimStatus.signerAddress}</code>
                </div>
              )}

              <div className="vault-actions-footer">
                <button
                  type="button"
                  className="vault-claim-btn"
                  disabled={cooldownCountdown > 0 || coins < 10}
                  onClick={() => {
                    onClose()
                    onOpenClaim()
                  }}
                >
                  {cooldownCountdown > 0
                    ? `⏳ Đang Chờ Cooldown (${formatCountdown(cooldownCountdown)})`
                    : '⚡ Mở Giao Diện Rút $PIXEL'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTION HISTORY */}
          {tab === 'history' && (
            <div className="history-tab-content">
              <div className="history-header">
                <h4>📜 Sổ Nhật Ký Giao Dịch (MongoDB Audit Log)</h4>
                <span className="history-count">Tổng: {transactions.length} giao dịch</span>
              </div>

              {loadingTx ? (
                <div className="history-loading">Đang tải lịch sử giao dịch từ MongoDB...</div>
              ) : transactions.length === 0 ? (
                <div className="history-empty">
                  Chưa ghi nhận giao dịch nào. Hãy thu hoạch, bán nông sản hoặc rút token để ghi log!
                </div>
              ) : (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Thời Gian</th>
                        <th>Loại Thao Tác</th>
                        <th>Biến Động</th>
                        <th>Chi Tiết / Mã Hash</th>
                        <th>Xác Thực</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td className="tx-date">
                            {new Date(t.created_at).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <span className={`tx-type-tag tx-type-tag--${t.type}`}>
                              {t.type}
                            </span>
                          </td>
                          <td className="tx-amount">
                            <strong className={t.amount < 0 ? 'neg' : 'pos'}>
                              {t.amount > 0 ? `+${t.amount}` : t.amount} 🪙
                            </strong>
                          </td>
                          <td className="tx-details">
                            <span>{t.details || 'Giao dịch hệ thống'}</span>
                            {t.tx_hash && (
                              <code className="tx-hash-link" title={t.tx_hash}>
                                Hash: {t.tx_hash.slice(0, 10)}...{t.tx_hash.slice(-8)}
                              </code>
                            )}
                          </td>
                          <td>
                            <span className="tx-verified-badge">✓ Verified</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
