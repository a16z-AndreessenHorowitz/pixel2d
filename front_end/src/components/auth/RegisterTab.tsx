import { useState } from 'react'
import type { AuthUser } from '../AuthModal'

interface RegisterTabProps {
  account: string | null
  onAuthSuccess: (user: AuthUser, token: string) => void
  onClose: () => void
  setErrorMessage: (msg: string | null) => void
  setSuccessMessage: (msg: string | null) => void
  backendUrl: string
}

export function RegisterTab({
  account,
  onAuthSuccess,
  onClose,
  setErrorMessage,
  setSuccessMessage,
  backendUrl,
}: RegisterTabProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      const res = await fetch(`${backendUrl}/api/auth/register`, {
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

      const effectiveAddr = res.user.wallet_address || res.user.address || ''
      const authUser: AuthUser = {
        id: res.user.id,
        username: res.user.username,
        wallet_address: effectiveAddr,
        address: effectiveAddr,
        token: res.token,
      }
      setSuccessMessage(`Đăng ký thành công! Chào mừng ${res.user.username}!`)
      onAuthSuccess(authUser, res.token)
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
  )
}
