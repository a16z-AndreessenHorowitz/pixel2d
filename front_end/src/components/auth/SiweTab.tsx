import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import type { AuthUser } from '../AuthModal'

interface SiweTabProps {
  account: string | null
  connectWallet: () => Promise<string | null>
  onAuthSuccess: (user: AuthUser, token: string) => void
  onClose: () => void
  setErrorMessage: (msg: string | null) => void
  setSuccessMessage: (msg: string | null) => void
  backendUrl: string
}

export function SiweTab({
  account,
  connectWallet,
  onAuthSuccess,
  onClose,
  setErrorMessage,
  setSuccessMessage,
  backendUrl,
}: SiweTabProps) {
  const [loading, setLoading] = useState(false)

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

      // 1. Get Nonce
      const nonceRes = await fetch(
        `${backendUrl}/api/auth/nonce?address=${activeAccount}`,
      ).then((r) => r.json())

      if (!nonceRes.success || !nonceRes.nonce) {
        throw new Error(nonceRes.error || 'Không thể lấy nonce từ server')
      }

      // 2. Prompt MetaMask to sign message
      const message = `Pixel2D GameFi Authentication\nAddress: ${activeAccount}\nNonce: ${nonceRes.nonce}`
      const provider = new BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()
      const signature = await signer.signMessage(message)

      // 3. Submit to Backend
      const loginRes = await fetch(`${backendUrl}/api/auth/login-wallet`, {
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

      const authUser: AuthUser = {
        id: loginRes.user.id,
        username: loginRes.user.username,
        wallet_address: activeAccount,
        address: activeAccount,
        token: loginRes.token,
      }
      setSuccessMessage(`Đăng nhập thành công! Chào mừng ${loginRes.user.username}!`)
      onAuthSuccess(authUser, loginRes.token)
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

  return (
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
  )
}
