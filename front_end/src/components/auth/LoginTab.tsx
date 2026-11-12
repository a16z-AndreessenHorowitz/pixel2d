import { useState } from 'react'
import type { AuthUser } from '../AuthModal'

interface LoginTabProps {
  onAuthSuccess: (user: AuthUser, token: string) => void
  onClose: () => void
  setErrorMessage: (msg: string | null) => void
  setSuccessMessage: (msg: string | null) => void
  backendUrl: string
}

export function LoginTab({
  onAuthSuccess,
  onClose,
  setErrorMessage,
  setSuccessMessage,
  backendUrl,
}: LoginTabProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then((r) => r.json())

      if (!res.success) {
        throw new Error(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác')
      }

      const effectiveAddr = res.user.wallet_address || res.user.address || ''
      const authUser: AuthUser = {
        id: res.user.id,
        username: res.user.username,
        wallet_address: effectiveAddr,
        address: effectiveAddr,
        token: res.token,
      }
      setSuccessMessage(`Đăng nhập thành công! Chào mừng ${res.user.username}!`)
      onAuthSuccess(authUser, res.token)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}
