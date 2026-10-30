import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import './AuthModal.css'

export interface AuthUser {
  id: number
  username: string
  wallet_address?: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: AuthUser | null
  account: string | null
  connectWallet: () => Promise<string | null>
  onAuthSuccess: (user: AuthUser, token: string) => void
  onLogout: () => void
}

const BACKEND_URL = 'http://localhost:4000'

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  account,
  connectWallet,
  onAuthSuccess,
  onLogout,
}: AuthModalProps) {
  const [tab, setTab] = useState<'siwe' | 'login' | 'register'>('siwe')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

  // 1. SIWE MetaMask Signature Login
  const handleSiweLogin = async () => {
    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      let activeAccount = account
      if (!activeAccount) {
        activeAccount = await connectWallet()
        if (!activeAccount) {
          throw new Error('Vui lòng kết nối ví MetaMask trước!')
        }
      }

      // A. Get Nonce
      const nonceRes = await fetch(
        `${BACKEND_URL}/api/auth/nonce?address=${activeAccount}`,
      ).then((r) => r.json())

      if (!nonceRes.success || !nonceRes.nonce) {
        throw new Error(nonceRes.error || 'Không thể lấy nonce từ server')
      }

      // B. Prompt MetaMask to sign message
      const message = `Pixel2D GameFi Authentication\nAddress: ${activeAccount}\nNonce: ${nonceRes.nonce}`
      const provider = new BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)

      // C. Submit to Backend
      const loginRes = await fetch(`${BACKEND_URL}/api/auth/login-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: activeAccount,
          signature,
          message,
        }),
      }).then((r) => r.json())

      if (!loginRes.success) {
        throw new Error(loginRes.error || 'Đăng nhập ví thất bại')
      }

      setSuccessMessage(`Đăng nhập thành công! Chào mừng ${loginRes.user.username}!`)
      onAuthSuccess(loginRes.user, loginRes.token)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      console.error('SIWE Login Error:', err)
      setErrorMessage(err?.reason || err?.message || 'Lỗi đăng nhập ví')
    } finally {
      setLoading(false)
    }
  }

  // 2. Traditional Login
  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then((r) => r.json())

      if (!res.success) {
        throw new Error(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác')
      }

      setSuccessMessage(`Đăng nhập thành công! Chào mừng ${res.user.username}!`)
      onAuthSuccess(res.user, res.token)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  // 3. Traditional Register
  const handleTraditionalRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp!')
      return
    }

    setLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          wallet_address: account || undefined,
        }),
      }).then((r) => r.json())

      if (!res.success) {
        throw new Error(res.error || 'Không thể tạo tài khoản')
      }

      setSuccessMessage(`Đăng ký thành công! Chào mừng ${res.user.username}!`)
      onAuthSuccess(res.user, res.token)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-modal-title">
            <span className="auth-title-icon">👤</span>
            <h3>{currentUser ? 'Hồ Sơ Nông Dân' : 'Tài Khoản & Đăng Nhập'}</h3>
          </div>
          <button className="auth-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {currentUser ? (
          // Logged In View
          <div className="auth-modal-body profile-body">
            <div className="profile-badge">
              <span className="profile-avatar">👨‍🌾</span>
              <h4>{currentUser.username}</h4>
              <span className="profile-id">ID: #{currentUser.id}</span>
            </div>

            <div className="profile-info-list">
              <div className="profile-info-row">
                <span>Ví Web3:</span>
                <code>
                  {currentUser.wallet_address
                    ? `${currentUser.wallet_address.slice(0, 8)}...${currentUser.wallet_address.slice(-6)}`
                    : 'Chưa liên kết'}
                </code>
              </div>
              <div className="profile-info-row">
                <span>Trạng thái:</span>
                <span className="status-online">● Đang hoạt động (Online)</span>
              </div>
            </div>

            <button
              type="button"
              className="auth-logout-btn"
              onClick={() => {
                onLogout()
                onClose()
              }}
            >
              🚪 Đăng Xuất
            </button>
          </div>
        ) : (
          // Tabs for Not Logged In
          <div className="auth-modal-body">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'siwe' ? 'active' : ''}`}
                onClick={() => {
                  setTab('siwe')
                  setErrorMessage(null)
                }}
              >
                🦊 Ví MetaMask (SIWE)
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setTab('login')
                  setErrorMessage(null)
                }}
              >
                🔑 Đăng Nhập
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setTab('register')
                  setErrorMessage(null)
                }}
              >
                📝 Đăng Ký
              </button>
            </div>

            {errorMessage && <div className="auth-alert error">{errorMessage}</div>}
            {successMessage && <div className="auth-alert success">{successMessage}</div>}

            {/* TAB 1: SIWE METAMASK */}
            {tab === 'siwe' && (
              <div className="auth-tab-content">
                <div className="siwe-intro-box">
                  <p>
                    <strong>Sign-In with Ethereum (SIWE):</strong> Xác thực tài khoản nhanh chóng chỉ bằng 1 chữ ký số trên ví MetaMask mà không cần nhớ mật khẩu.
                  </p>
                </div>

                <div className="siwe-status-box">
                  <span>Trạng thái ví:</span>
                  {account ? (
                    <strong className="wallet-connected-text">
                      ✓ Đã kết nối: {account.slice(0, 6)}...{account.slice(-4)}
                    </strong>
                  ) : (
                    <strong className="wallet-disconnected-text">✕ Chưa kết nối ví</strong>
                  )}
                </div>

                <button
                  type="button"
                  className="auth-submit-btn siwe-btn"
                  onClick={handleSiweLogin}
                  disabled={loading}
                >
                  {loading
                    ? 'Đang Xác Thực...'
                    : account
                      ? '✍️ Ký Số Đăng Nhập Bằng MetaMask'
                      : '🦊 Kết Nối Ví & Ký Đăng Nhập'}
                </button>
              </div>
            )}

            {/* TAB 2: TRADITIONAL LOGIN */}
            {tab === 'login' && (
              <form onSubmit={handleTraditionalLogin} className="auth-tab-content">
                <div className="form-group">
                  <label>Tên đăng nhập (Username):</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="VD: nongdan2026"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mật khẩu (Password):</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Đang Đăng Nhập...' : '🔑 Đăng Nhập Ngay'}
                </button>
              </form>
            )}

            {/* TAB 3: TRADITIONAL REGISTER */}
            {tab === 'register' && (
              <form onSubmit={handleTraditionalRegister} className="auth-tab-content">
                <div className="form-group">
                  <label>Tên đăng nhập mới:</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="VD: nongdan_sieucap"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Mật khẩu:</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Tối thiểu 6 ký tự..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Xác nhận mật khẩu:</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                {account && (
                  <div className="form-note">
                    🔗 Tài khoản sẽ được tự động liên kết với ví: <code>{account.slice(0, 6)}...{account.slice(-4)}</code>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit-btn register-btn"
                  disabled={loading}
                >
                  {loading ? 'Đang Đăng Ký...' : '📝 Tạo Tài Khoản Nông Dân'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
