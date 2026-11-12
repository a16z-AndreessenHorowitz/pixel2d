import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { TopLeftHUD } from '../components/TopLeftHUD'
import { ShopModal, type ShopItem } from '../components/ShopModal'
import { TopRightHUD } from '../components/TopRightHUD'
import { ClaimTokenModal } from '../components/ClaimTokenModal'
import { AuthModal, type AuthUser } from '../components/AuthModal'
import { DialogueModal } from '../components/DialogueModal'
import { GameFiHubModal } from '../components/GameFiHubModal'
import { QuizModal } from '../components/QuizModal'
import { NotificationModal, showGameAlert } from '../components/NotificationModal'
import { VirtualDpad } from '../components/VirtualDpad'
import type { DialogueStep } from '../data/dialogues'
import { soundEngine } from '../audio/SoundEngine'
import { useWeb3 } from '../web3/useWeb3'
import { player } from '../mock-data/player'
import {
  EDIBLE_ITEMS,
  INVENTORY_SIZE,
  ITEM_DEFINITIONS,
} from '../game/inventory/inventory'
import { quests } from '../mock-data/quests'
import { useInventoryManager, type ToolId } from '../hooks/useInventoryManager'
import { usePhaserGameBridge } from '../hooks/usePhaserGameBridge'
import { useGameKeyboardShortcuts } from '../hooks/useGameKeyboardShortcuts'
import './GamePage.css'

const TOOL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8]

export function GamePage() {
  const [coins, setCoins] = useState(player.coins)
  const [energy, setEnergy] = useState(100)
  const [maxEnergy, setMaxEnergy] = useState(100)
  const energyRef = useRef(100)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null)
  const [energyAlert, setEnergyAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  // Modals state
  const [dialogueOpen, setDialogueOpen] = useState(false)
  const [activeNpcId, setActiveNpcId] = useState('barney')
  const [gameFiHubOpen, setGameFiHubOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [faucetLoading, setFaucetLoading] = useState(false)
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([1])

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('pixel_farm_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const {
    account,
    ethBalance,
    pixelBalance,
    isConnecting,
    connectWallet,
    disconnect,
    claimFaucet,
    claimFarmingReward,
    refreshBalances,
    error: web3Error,
  } = useWeb3()

  useEffect(() => {
    if (web3Error) {
      const showT = setTimeout(() => setEnergyAlert({
        message: web3Error,
        type: 'error',
      }), 10)
      const t = setTimeout(() => setEnergyAlert(null), 4500)
      return () => { clearTimeout(showT); clearTimeout(t); }
    }
  }, [web3Error])

  const effectiveAddress = currentUser?.wallet_address || currentUser?.address || account

  // 1. Hook quản lý Kho đồ & Toolbar
  const {
    inventory,
    setInventory,
    toolbar,
    setToolbar,
    selectedTool,
    selectedInvIndex,
    setSelectedInvIndex,
    selectTool,
    addItem,
    consumeSeed,
    handleEatItem,
    moveInventoryToToolbar,
    moveToolbarToInventory,
    moveInventoryItem,
    resetInventory,
    handleInventoryDragStart,
    handleToolbarDragStart,
    readDragData,
  } = useInventoryManager({
    effectiveAddress,
    energy,
    maxEnergy,
    setEnergy,
    setEnergyAlert,
  })

  // 2. Hook cầu nối sự kiện giữa Phaser Game và React State
  const { addXP } = usePhaserGameBridge({
    currentUser,
    account,
    energyRef,
    setEnergy,
    setMaxEnergy,
    setCoins,
    setXp,
    setLevel,
    setLevelUpMessage,
    setEnergyAlert,
    setActiveNpcId,
    setDialogueOpen,
    setAuthModalOpen,
    consumeSeed,
    addItem,
  })

  // 3. Hook bắt phím tắt bàn phím (1-8, I, H, Q)
  useGameKeyboardShortcuts({
    toolbar,
    selectTool,
    setInventoryOpen,
    setGameFiHubOpen,
    setQuizModalOpen,
  })

  // Lắng nghe sự kiện đăng nhập / đăng xuất
  useEffect(() => {
    const handleAuthUserChanged = (event: Event) => {
      const customEvent = event as CustomEvent<any>
      if (customEvent.detail && typeof customEvent.detail === 'object' && 'user' in customEvent.detail) {
        setCurrentUser(customEvent.detail.user)
      } else {
        setCurrentUser(customEvent.detail ?? null)
      }
    }
    window.addEventListener('auth-user-changed', handleAuthUserChanged)
    return () => window.removeEventListener('auth-user-changed', handleAuthUserChanged)
  }, [])

  // BGM Retro âm thanh nền khi click lần đầu
  useEffect(() => {
    const handleFirstGesture = () => {
      if (soundEngine.getBgmEnabled()) {
        soundEngine.startBGM()
      }
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
    }

    window.addEventListener('pointerdown', handleFirstGesture)
    window.addEventListener('keydown', handleFirstGesture)
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture)
      window.removeEventListener('keydown', handleFirstGesture)
      soundEngine.stopBGM()
    }
  }, [])

  // Đồng bộ trạng thái Game từ Backend nếu có
  useEffect(() => {
    if (effectiveAddress) {
      const token = localStorage.getItem('pixel_farm_jwt') || currentUser?.token
      fetch(`http://localhost:4000/api/game/state?address=${effectiveAddress}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.state) {
            if (typeof data.state.coins === 'number') setCoins(data.state.coins)
            if (typeof data.state.energy === 'number') {
              setEnergy(data.state.energy)
              energyRef.current = data.state.energy
            }
            if (typeof data.state.max_energy === 'number') setMaxEnergy(data.state.max_energy)
            if (typeof data.state.level === 'number') setLevel(data.state.level)
            if (typeof data.state.xp === 'number') setXp(data.state.xp)
            if (Array.isArray(data.state.quests)) {
              const ids = data.state.quests
                .map((q: any) => (typeof q === 'number' ? q : q?.id))
                .filter((id: any) => typeof id === 'number')
              if (ids.length > 0) setCompletedQuestIds(ids)
            }
          }
        })
        .catch(() => {})
    }
  }, [effectiveAddress, currentUser?.token])

  // Xử lý ăn vật phẩm từ Tool được chọn
  const handleEatSelectedTool = () => {
    const idx = toolbar.findIndex((t) => t && t.id === selectedTool)
    if (idx !== -1) {
      handleEatItem('toolbar', idx)
    }
  }

  // Nhận thưởng nhiệm vụ đối thoại NPC
  const handleClaimNpcReward = (reward: DialogueStep['reward']) => {
    if (!reward) return
    if (reward.coins) {
      if (!currentUser && !account) {
        showGameAlert({
          title: 'Yêu Cầu Đăng Nhập',
          message: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để lưu Coin từ nhiệm vụ NPC.',
          type: 'warning',
          icon: '🔒',
          confirmText: 'Đăng nhập ngay',
          onConfirm: () => setAuthModalOpen(true),
        })
      } else {
        setCoins((prev) => prev + reward.coins!)
        soundEngine.playCoin()
        const npcName = activeNpcId === 'barney' ? 'Bác Barney' : 'Cô Hazel'
        showGameAlert({
          title: '🎉 Nhận Thưởng Nhiệm Vụ NPC',
          message: `Chúc mừng! Bạn đã nhận được +${reward.coins} Coins từ ${npcName}!`,
          type: 'success',
          icon: '🪙',
          confirmText: 'Tuyệt vời',
        })
      }
    }
    if (reward.quantity && reward.itemId) {
      const def = ITEM_DEFINITIONS[reward.itemId as ToolId]
      if (def) {
        addItem({ ...def, quantity: reward.quantity })
        const npcName = activeNpcId === 'barney' ? 'Bác Barney' : 'Cô Hazel'
        showGameAlert({
          title: '🎁 Quà Tặng Nhiệm Vụ',
          message: `${npcName} đã tặng bạn ${reward.quantity}x ${def.label}! Vật phẩm đã được cất vào kho đồ.`,
          type: 'success',
          icon: '🎒',
          confirmText: 'Cảm ơn!',
        })
      }
    }
    if (reward.type === 'energy') {
      setEnergy(maxEnergy)
      energyRef.current = maxEnergy
      setEnergyAlert({
        message: '⚡ Bác Barney đã truyền bí quyết và hồi phục 100% Năng lượng cho bạn!',
        type: 'success',
      })
      setTimeout(() => setEnergyAlert(null), 3000)
    }
    if (reward.xp) {
      addXP(reward.xp)
    }
    setLevelUpMessage(
      `🎁 Bạn đã nhận thưởng từ ${activeNpcId === 'barney' ? 'Bác Barney' : 'Cô Hazel'}!`,
    )
    setTimeout(() => setLevelUpMessage(null), 3500)
  }

  // Mua hạt giống từ Shop
  const handleBuyShopItem = (item: ShopItem) => {
    if (coins < item.priceCoins) return
    setCoins((prev) => prev - item.priceCoins)
    soundEngine.playCoin()
    const def = ITEM_DEFINITIONS[item.id]
    if (def) {
      addItem({ ...def, quantity: item.bundleQuantity })
    }
  }

  // Bán nông sản lấy Coins
  const handleSellItem = (itemId: string, quantity: number, pricePerUnit: number) => {
    if (!currentUser && !account) {
      showGameAlert({
        title: 'Yêu Cầu Đăng Nhập',
        message: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để bán nông sản nhận Coin.',
        type: 'warning',
        icon: '🔒',
        confirmText: 'Đăng nhập ngay',
        onConfirm: () => setAuthModalOpen(true),
      })
      return
    }

    let remainingToRemove = quantity
    setToolbar((prev) => {
      const next = [...prev]
      for (let i = 0; i < next.length; i++) {
        const slot = next[i]
        if (slot && slot.id === itemId && remainingToRemove > 0) {
          if (slot.quantity <= remainingToRemove) {
            remainingToRemove -= slot.quantity
            next[i] = null
          } else {
            next[i] = { ...slot, quantity: slot.quantity - remainingToRemove }
            remainingToRemove = 0
          }
        }
      }
      return next
    })

    if (remainingToRemove > 0) {
      setInventory((prev) => {
        const next = [...prev]
        for (let i = 0; i < next.length; i++) {
          const slot = next[i]
          if (slot && slot.id === itemId && remainingToRemove > 0) {
            if (slot.quantity <= remainingToRemove) {
              remainingToRemove -= slot.quantity
              next[i] = null
            } else {
              next[i] = { ...slot, quantity: slot.quantity - remainingToRemove }
              remainingToRemove = 0
            }
          }
        }
        return next
      })
    }

    const earned = pricePerUnit * quantity
    setCoins((prev) => prev + earned)
    soundEngine.playCoin()

    const token = localStorage.getItem('pixel_farm_jwt')
    fetch('http://localhost:4000/api/shop/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        itemId,
        quantity,
        address: account || undefined,
      }),
    }).catch(() => {})
  }

  // Nhận thưởng Quest
  const handleClaimQuest = async (questId: number, rewardCoins: number) => {
    const token = localStorage.getItem('pixel_farm_jwt') || currentUser?.token
    if (!currentUser && !account && !effectiveAddress) {
      showGameAlert({
        title: 'Yêu Cầu Đăng Nhập',
        message: 'Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập hoặc kết nối ví để nhận Coin thưởng nhiệm vụ.',
        type: 'warning',
        icon: '🔒',
        confirmText: 'Đăng nhập ngay',
        onConfirm: () => setAuthModalOpen(true),
      })
      return
    }
    if (completedQuestIds.includes(questId)) {
      showGameAlert({
        title: 'Nhiệm Vụ Đã Nhận',
        message: 'Bạn đã hoàn tất và nhận thưởng cho nhiệm vụ này rồi!',
        type: 'info',
        icon: '✓',
      })
      return
    }

    try {
      const res = await fetch('http://localhost:4000/api/quests/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          questId,
          address: effectiveAddress,
        }),
      }).then((r) => r.json())

      if (res.success && res.data) {
        setCoins(res.data.newCoins)
        if (Array.isArray(res.data.completedQuestIds)) {
          setCompletedQuestIds(res.data.completedQuestIds)
        } else {
          setCompletedQuestIds((prev) => [...prev, questId])
        }
        if (typeof res.data.newLevel === 'number') setLevel(res.data.newLevel)
        if (typeof res.data.newXp === 'number') setXp(res.data.newXp)
        soundEngine.playCoin()
        showGameAlert({
          title: '🎉 Nhận Thưởng Nhiệm Vụ!',
          message: res.message || `Chúc mừng! Bạn đã hoàn thành nhiệm vụ và nhận thành công +${rewardCoins} Coins!`,
          type: 'success',
          icon: '🎁',
          confirmText: 'Tuyệt vời',
        })
      }
    } catch {
      setCoins((prev) => prev + rewardCoins)
      setCompletedQuestIds((prev) => [...prev, questId])
      soundEngine.playCoin()
      addXP(50)
      showGameAlert({
        title: '🎉 Nhận Thưởng Nhiệm Vụ!',
        message: `Chúc mừng! Bạn đã hoàn thành nhiệm vụ và nhận thành công +${rewardCoins} Coins!`,
        type: 'success',
        icon: '🎁',
        confirmText: 'Tuyệt vời',
      })
    }
  }

  // Faucet On-Chain
  const handleClaimFaucet = async () => {
    if (!account) {
      await connectWallet()
      return
    }
    setFaucetLoading(true)
    try {
      await claimFaucet()
      soundEngine.playCoin()
      showGameAlert({
        title: 'Faucet On-Chain',
        message: '🎉 Đã nhận 100 $PIXEL thử nghiệm từ Faucet Contract!',
        type: 'success',
        icon: '💎',
      })
    } catch (err: any) {
      showGameAlert({
        title: 'Lỗi Faucet',
        message: 'Lỗi Faucet: ' + (err?.reason || err?.message || 'Không thể nhận faucet'),
        type: 'error',
        icon: '❌',
      })
    } finally {
      setFaucetLoading(false)
    }
  }

  const handleClaimSuccess = (claimedCoins: number, _txHash: string) => {
    setCoins((prev) => Math.max(0, prev - claimedCoins))
    refreshBalances()
  }

  const handleQuizReward = (rewardCoins: number, rewardXp: number, newTotalCoins: number) => {
    setCoins(newTotalCoins)
    addXP(rewardXp)
    showGameAlert({
      title: 'Lớp Học Blockchain',
      message: `🎉 Bạn đã nhận được +${rewardCoins} Coins từ bài học Blockchain!`,
      type: 'success',
      icon: '🎓',
    })
  }

  const handleAuthSuccess = useCallback((user: AuthUser, token: string) => {
    setCurrentUser(user)
    try {
      localStorage.setItem('pixel_farm_user', JSON.stringify(user))
      localStorage.setItem('pixel_farm_jwt', token)
      window.dispatchEvent(
        new CustomEvent('auth-user-changed', {
          detail: { user, token },
        }),
      )
    } catch {}
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    disconnect()
    try {
      localStorage.removeItem('pixel_farm_user')
      localStorage.removeItem('pixel_farm_jwt')
      window.dispatchEvent(
        new CustomEvent('auth-user-changed', {
          detail: { user: null, token: null },
        }),
      )
    } catch {}
  }, [disconnect])

  return (
    <section className="game-page" aria-label="Pixel Farm game">
      <GameCanvas />

      {/* Level Up & Energy Alerts */}
      {levelUpMessage && (
        <div className="level-up-banner">{levelUpMessage}</div>
      )}
      {energyAlert && (
        <div className={`energy-alert-banner ${energyAlert.type}`}>
          {energyAlert.message}
        </div>
      )}

      {/* Top Left HUD */}
      <TopLeftHUD
        coins={coins}
        energy={energy}
        maxEnergy={maxEnergy}
        level={level}
        xp={xp}
        onOpenGameFiHub={() => setGameFiHubOpen(true)}
        onOpenNftShop={() => setGameFiHubOpen(true)}
        onOpenClaim={() => setClaimModalOpen(true)}
        onOpenShop={() => setShopOpen(true)}
      />

      {/* Top Right HUD */}
      <TopRightHUD
        account={account}
        pixelBalance={pixelBalance}
        ethBalance={ethBalance}
        isConnecting={isConnecting}
        faucetLoading={faucetLoading}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onConnect={connectWallet}
        onDisconnect={disconnect}
        onClaimFaucet={handleClaimFaucet}
        quests={quests}
        completedQuestIds={completedQuestIds}
        onClaimQuest={handleClaimQuest}
      />

      {/* Seed & Item Shop Modal */}
      <ShopModal
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        coins={coins}
        inventory={inventory}
        toolbar={toolbar}
        onBuyItem={handleBuyShopItem}
        onSellItem={handleSellItem}
      />

      {/* Web3 Token Claim Modal */}
      <ClaimTokenModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        inGameCoins={coins}
        account={account}
        pixelBalance={pixelBalance}
        claimFarmingReward={claimFarmingReward}
        onClaimSuccess={handleClaimSuccess}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        account={account}
        connectWallet={connectWallet}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      {/* Dialogue Modal */}
      <DialogueModal
        isOpen={dialogueOpen}
        npcId={activeNpcId}
        onClose={() => setDialogueOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onClaimReward={handleClaimNpcReward}
      />

      {/* GameFi Hub Modal */}
      <GameFiHubModal
        isOpen={gameFiHubOpen}
        onClose={() => setGameFiHubOpen(false)}
        coins={coins}
        energy={energy}
        maxEnergy={maxEnergy}
        level={level}
        xp={xp}
        account={account}
        pixelBalance={pixelBalance}
        ethBalance={ethBalance}
        onOpenClaim={() => setClaimModalOpen(true)}
        onConnectWallet={connectWallet}
      />

      {/* Quiz Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        account={account}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onRewardEarned={handleQuizReward}
      />

      {/* Notification Modal */}
      <NotificationModal />

      {/* ================= INVENTORY POPUP ================= */}
      {inventoryOpen && (
        <div className="inventory-panel">
          <div className="inventory-header">
            <div>
              <strong>KHO ĐỒ</strong>
              <span>Kéo thả vật phẩm để sắp xếp</span>
            </div>
            <button
              type="button"
              className="inventory-close"
              onClick={() => setInventoryOpen(false)}
              aria-label="Đóng kho đồ"
            >
              ×
            </button>
          </div>

          <div className="inventory-grid">
            {Array.from({ length: INVENTORY_SIZE }).map((_, index) => {
              const item = inventory[index]
              const isSelected = selectedInvIndex === index
              const isEdible = item ? !!EDIBLE_ITEMS[item.id] : false

              return (
                <div
                  key={index}
                  className={`inventory-slot ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedInvIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const data = readDragData(e)
                    if (!data) return
                    if (data.type === 'toolbar') {
                      moveToolbarToInventory(data.index, index)
                    } else if (data.type === 'inventory') {
                      moveInventoryItem(data.index, index)
                    }
                  }}
                >
                  <span className="slot-number">{index + 1}</span>
                  {item ? (
                    <div
                      className="slot-content"
                      draggable
                      onDragStart={(e) => handleInventoryDragStart(e, index)}
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="slot-icon"
                        draggable={false}
                      />
                      <span className="slot-name">{item.label}</span>
                      {item.stackable && (
                        <span className="slot-quantity">{item.quantity}</span>
                      )}
                    </div>
                  ) : (
                    <span className="slot-empty">Trống</span>
                  )}
                  {isSelected && item && isEdible && (
                    <button
                      type="button"
                      className="slot-eat-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEatItem('inventory', index)
                      }}
                      title={`Hồi +${EDIBLE_ITEMS[item.id].energy} Năng lượng`}
                    >
                      🍽️ Ăn
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="inventory-actions">
            <button
              type="button"
              className="inventory-reset"
              onClick={resetInventory}
            >
              Đặt lại mặc định
            </button>
            <span className="inventory-hint">
              Nhấn <strong>[I]</strong> để đóng
            </span>
          </div>
        </div>
      )}

      {/* ================= TOOLBAR ================= */}
      <div className="game-toolbar" aria-label="Thanh công cụ">
        <button
          type="button"
          className={`toolbar-backpack ${inventoryOpen ? 'active' : ''}`}
          onClick={() => setInventoryOpen((prev) => !prev)}
          aria-label="Mở túi đồ"
          title="Túi đồ (Phím I)"
        >
          🎒
        </button>

        {selectedTool && EDIBLE_ITEMS[selectedTool] && (
          <button
            type="button"
            className="toolbar-eat-btn"
            onClick={handleEatSelectedTool}
            title={`Ăn vật phẩm đang chọn (+${EDIBLE_ITEMS[selectedTool].energy} Năng lượng)`}
          >
            🍽️ Ăn ({EDIBLE_ITEMS[selectedTool].energy}⚡)
          </button>
        )}

        {TOOL_KEYS.map((key) => {
          const index = key - 1
          const tool = toolbar[index]
          const isSelected = tool && tool.id === selectedTool

          return (
            <button
              key={key}
              type="button"
              className={`toolbar-slot ${isSelected ? 'active' : ''}`}
              onClick={() => {
                if (tool) {
                  selectTool(tool.id)
                }
              }}
              draggable={!!tool}
              onDragStart={(e) => handleToolbarDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const data = readDragData(e)
                if (!data) return
                if (data.type === 'inventory') {
                  moveInventoryToToolbar(data.index, index)
                }
              }}
              aria-label={tool ? `${tool.label} (Phím ${key})` : `Ô trống ${key}`}
            >
              <span className="toolbar-key">{key}</span>
              {tool ? (
                <>
                  <img
                    src={tool.icon}
                    alt={tool.label}
                    className="tool-icon"
                    draggable={false}
                  />
                  <span>{tool.label}</span>
                  {tool.stackable && (
                    <span className="toolbar-quantity">{tool.quantity}</span>
                  )}
                </>
              ) : (
                <span className="toolbar-empty-label">TRỐNG</span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          className="toolbar-menu"
          aria-label="Bản đồ"
        >
          ↻
        </button>
      </div>

      {/* Virtual D-pad controls */}
      <VirtualDpad />
    </section>
  )
}
