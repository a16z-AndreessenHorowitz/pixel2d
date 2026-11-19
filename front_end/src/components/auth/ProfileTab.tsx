import type { AuthUser } from '../AuthModal'

interface ProfileTabProps {
  currentUser: AuthUser
  onLogout: () => void
  onClose: () => void
}

export function ProfileTab({ currentUser, onLogout, onClose }: ProfileTabProps) {
  return (
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
  )
}
