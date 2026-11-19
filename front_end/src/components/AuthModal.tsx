import { useState } from 'react'
import { SiweTab } from './auth/SiweTab'
import { LoginTab } from './auth/LoginTab'
import { RegisterTab } from './auth/RegisterTab'
import { ProfileTab } from './auth/ProfileTab'
import './AuthModal.css'

export interface AuthUser {
  id: number
  username: string
  wallet_address?: string
  address?: string
  token?: string
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isOpen) return null

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
          <ProfileTab
            currentUser={currentUser}
            onLogout={onLogout}
            onClose={onClose}
          />
        ) : (
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

            {tab === 'siwe' && (
              <SiweTab
                account={account}
                connectWallet={connectWallet}
                onAuthSuccess={onAuthSuccess}
                onClose={onClose}
                setErrorMessage={setErrorMessage}
                setSuccessMessage={setSuccessMessage}
                backendUrl={BACKEND_URL}
              />
            )}

            {tab === 'login' && (
              <LoginTab
                onAuthSuccess={onAuthSuccess}
                onClose={onClose}
                setErrorMessage={setErrorMessage}
                setSuccessMessage={setSuccessMessage}
                backendUrl={BACKEND_URL}
              />
            )}

            {tab === 'register' && (
              <RegisterTab
                account={account}
                onAuthSuccess={onAuthSuccess}
                onClose={onClose}
                setErrorMessage={setErrorMessage}
                setSuccessMessage={setSuccessMessage}
                backendUrl={BACKEND_URL}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
