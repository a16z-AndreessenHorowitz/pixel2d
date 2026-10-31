import { Badge, Container, Nav, Navbar } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import type { AuthUser } from './AuthModal'
import './AppNavbar.css'

export interface AppNavbarProps {
  coins: number
  account: string | null
  pixelBalance: string
  ethBalance: string
  isConnecting: boolean
  faucetLoading?: boolean
  currentUser: AuthUser | null
  onOpenAuth: () => void
  onConnect: () => void
  onDisconnect: () => void
  onOpenClaim: () => void
  onOpenNftShop: () => void
  onClaimFaucet: () => void
}

export function AppNavbar({
  coins,
  account,
  pixelBalance,
  isConnecting,
  faucetLoading,
  currentUser,
  onOpenAuth,
  onConnect,
  onDisconnect,
  onOpenClaim,
  onOpenNftShop,
  onClaimFaucet,
}: AppNavbarProps) {
  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null

  return (
    <Navbar expand="lg" className="app-navbar" sticky="top">
      <Container fluid className="px-2 px-md-3">
        <Navbar.Brand as={NavLink} to="/game" className="brand-mark">
          <span className="brand-icon" aria-hidden="true">
            🌾
          </span>
          <span className="brand-text">Pixel Farm GameFi</span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navigation" />
        <Navbar.Collapse id="main-navigation">
          <Nav className="me-auto nav-links">
            <Nav.Link as={NavLink} to="/game" className="active">
              🎮 Nông Trại
            </Nav.Link>
            <button
              type="button"
              className="nav-action-btn shop-btn"
              onClick={onOpenNftShop}
            >
              ✨ NFT Shop (Buff)
            </button>
            <button
              type="button"
              className="nav-action-btn claim-btn"
              onClick={onOpenClaim}
            >
              🔄 Rút $PIXEL
            </button>
          </Nav>

          <div className="navbar-web3-actions">
            {/* User Account / SIWE Auth Button */}
            {currentUser ? (
              <button
                type="button"
                className="user-profile-badge"
                onClick={onOpenAuth}
                title="Hồ sơ tài khoản & Đăng xuất"
              >
                <span className="user-icon">👨‍🌾</span>
                <span className="user-name">{currentUser.username}</span>
                <span className="user-online-dot" />
              </button>
            ) : (
              <button
                type="button"
                className="auth-nav-btn"
                onClick={onOpenAuth}
                title="Đăng nhập hoặc đăng ký tài khoản (Hỗ trợ MetaMask SIWE)"
              >
                <span>🔑</span>
                <span>Tài Khoản</span>
              </button>
            )}

            {/* In-Game Coin Display */}
            <div className="coin-balance" title="Số dư Coin trong game">
              <span className="coin-dot" aria-hidden="true" />
              <span>{coins.toLocaleString('vi-VN')}</span>
              <Badge bg="warning" text="dark">
                COIN
              </Badge>
            </div>

            {/* Web3 Connected State */}
            {account ? (
              <div className="web3-connected-group">
                <div className="pixel-token-pill" title="Số dư token $PIXEL on-chain">
                  <span className="token-sparkle">💎</span>
                  <span className="token-amount">{pixelBalance}</span>
                  <span className="token-symbol">$PIXEL</span>
                </div>

                <button
                  type="button"
                  className="faucet-pill-btn"
                  onClick={onClaimFaucet}
                  disabled={faucetLoading}
                  title="Nhận 100 $PIXEL thử nghiệm từ Faucet Contract"
                >
                  {faucetLoading ? '⏳...' : '💧 Faucet'}
                </button>

                <div
                  className="wallet-address-pill"
                  onClick={onDisconnect}
                  title="Bấm để ngắt kết nối ví"
                >
                  <span className="online-indicator" />
                  <span>{shortAddress}</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="connect-metamask-btn"
                onClick={onConnect}
                disabled={isConnecting}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                  alt="MetaMask"
                  className="metamask-fox-icon"
                />
                <span>{isConnecting ? 'Đang Kết Nối...' : 'Kết Nối Ví MetaMask'}</span>
              </button>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
