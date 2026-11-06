import { useState } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import type { AuthUser } from './AuthModal'
import { QuestPanel } from './QuestPanel'
import type { Quest } from '../mock-data/quests'
import './TopRightHUD.css'

export interface TopRightHUDProps {
  /** Địa chỉ ví MetaMask đã kết nối (null nếu chưa kết nối) */
  account: string | null
  /** Số dư token $PIXEL on-chain */
  pixelBalance: string
  /** Số dư ETH (Hardhat testnet) */
  ethBalance?: string
  /** Đang trong quá trình kết nối ví */
  isConnecting: boolean
  /** Đang yêu cầu nhận token Faucet */
  faucetLoading?: boolean
  /** Thông tin người chơi đăng nhập (SIWE hoặc email) */
  currentUser: AuthUser | null

  /** Mở modal xác thực tài khoản / hồ sơ */
  onOpenAuth: () => void
  /** Kích hoạt kết nối MetaMask */
  onConnect: () => void
  /** Ngắt kết nối ví */
  onDisconnect: () => void
  /** Nhận token Faucet từ Smart Contract */
  onClaimFaucet: () => void

  /** Danh sách nhiệm vụ */
  quests?: Quest[]
  /** ID các nhiệm vụ đã hoàn thành */
  completedQuestIds?: number[]
  /** Nhận thưởng hoàn thành nhiệm vụ */
  onClaimQuest?: (questId: number, rewardCoins: number) => void
}

export function TopRightHUD({
  account,
  pixelBalance: _pixelBalance,
  ethBalance,
  isConnecting,
  faucetLoading: _faucetLoading,
  currentUser,
  onOpenAuth,
  onConnect,
  onDisconnect,
  onClaimFaucet: _onClaimFaucet,
  quests,
  completedQuestIds = [],
  onClaimQuest,
}: TopRightHUDProps) {
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.getSfxEnabled())
  const [bgmEnabled, setBgmEnabled] = useState(() => soundEngine.getBgmEnabled())

  const handleToggleBgm = () => {
    soundEngine.playClick()
    const next = soundEngine.toggleBgm()
    setBgmEnabled(next)
  }

  const handleToggleSfx = () => {
    soundEngine.playClick()
    const next = soundEngine.toggleSfx()
    setSfxEnabled(next)
  }

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null

  return (
    <aside className="top-right-hud" aria-label="Điều khiển hệ thống & Web3">
      {/* Cụm nút icon tròn hệ thống & tài chính Web3 */}
      <div className="top-right-hud__cluster">
        {/* 1. Nút BGM Audio */}
        <button
          type="button"
          className={`hud-round-btn hud-round-btn--bgm ${bgmEnabled ? 'hud-round-btn--active' : 'hud-round-btn--muted'}`}
          onClick={handleToggleBgm}
          aria-label={bgmEnabled ? 'Tắt nhạc nền BGM' : 'Bật nhạc nền BGM'}
        >
          <span className="hud-round-btn__icon">{bgmEnabled ? '🎵' : '🔇'}</span>
          <span className="hud-tooltip" role="tooltip">
            {bgmEnabled ? 'BGM: Đang phát (Nhấp để tắt)' : 'BGM: Đã tắt (Nhấp để bật)'}
          </span>
        </button>

        {/* 2. Nút SFX Audio */}
        <button
          type="button"
          className={`hud-round-btn hud-round-btn--sfx ${sfxEnabled ? 'hud-round-btn--active' : 'hud-round-btn--muted'}`}
          onClick={handleToggleSfx}
          aria-label={sfxEnabled ? 'Tắt hiệu ứng âm thanh SFX' : 'Bật hiệu ứng SFX'}
        >
          <span className="hud-round-btn__icon">{sfxEnabled ? '🔊' : '🔇'}</span>
          <span className="hud-tooltip" role="tooltip">
            {sfxEnabled ? 'SFX: Đang bật' : 'SFX: Đã tắt'}
          </span>
        </button>

        {/* 3. Nút Tài Khoản / SIWE Profile */}
        <button
          type="button"
          className={`hud-round-btn hud-round-btn--account ${currentUser ? 'hud-round-btn--logged' : ''}`}
          onClick={() => {
            soundEngine.playClick()
            onOpenAuth()
          }}
          aria-label={currentUser ? `Hồ sơ: ${currentUser.username}` : 'Đăng nhập tài khoản'}
        >
          <span className="hud-round-btn__icon">{currentUser ? '👨‍🌾' : '🔑'}</span>
          {currentUser && <span className="hud-round-btn__online-dot" aria-hidden="true" />}
          <span className="hud-tooltip" role="tooltip">
            {currentUser
              ? `Tài khoản: ${currentUser.username} (Nhấp để quản lý/đăng xuất)`
              : 'Đăng nhập / Đăng ký (MetaMask SIWE)'}
          </span>
        </button>

        {/* 4. Cụm Web3 MetaMask */}
        {account ? (
          <div className="web3-badge-group">
            {/* Wallet Address Pill (Disconnect on click) */}
            <button
              type="button"
              className="web3-address-pill"
              onClick={() => {
                soundEngine.playClick()
                onDisconnect()
              }}
              title={`Ví: ${account}${ethBalance ? `\nSố dư: ${ethBalance} ETH` : ''}\n(Bấm để ngắt kết nối)`}
            >
              <span className="wallet-dot" aria-hidden="true" />
              <span className="wallet-addr">{shortAddress}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="hud-connect-wallet-btn"
            onClick={() => {
              soundEngine.playClick()
              onConnect()
            }}
            disabled={isConnecting}
            aria-label="Kết nối ví MetaMask"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              alt="Fox"
              className="metamask-fox-svg"
            />
            <span className="connect-text">
              {isConnecting ? 'Đang kết nối...' : 'Kết Nối Ví'}
            </span>
          </button>
        )}
      </div>

      {/* 5. Quest Panel góc phần tư (Nhiệm vụ hôm nay) */}
      {quests && (
        <QuestPanel
          quests={quests}
          completedIds={completedQuestIds}
          isLoggedIn={Boolean(currentUser || account)}
          onOpenAuth={onOpenAuth}
          onClaimReward={onClaimQuest}
        />
      )}
    </aside>
  )
}

