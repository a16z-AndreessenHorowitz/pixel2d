import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { TopLeftHUD } from '../components/TopLeftHUD'
import { ShopModal, type ShopItem } from '../components/ShopModal'
import { TopRightHUD } from '../components/TopRightHUD'
import type { QuestProgress } from '../components/QuestPanel'
import { ClaimTokenModal } from '../components/ClaimTokenModal'
import { AuthModal, type AuthUser } from '../components/AuthModal'
import { DialogueModal } from '../components/DialogueModal'
import { GameFiHubModal } from '../components/GameFiHubModal'
import { NftShopModal, type NftShopItem } from '../components/NftShopModal'
import { QuizModal } from '../components/QuizModal'
import { NotificationModal, showGameAlert } from '../components/NotificationModal'
import { VirtualDpad } from '../components/VirtualDpad'
import type { DialogueStep } from '../data/dialogues'
import { soundEngine } from '../audio/SoundEngine'
import { useWeb3 } from '../web3/useWeb3'
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

/** Các item dùng spritesheet — cần render bằng <span> thay vì <img> */
const SPRITESHEET_ROD = new Set(['fishing-rod'])
const SPRITESHEET_FISH = new Set(['carp', 'tilapia', 'catfish', 'salmon', 'golden-fish'])

/**
 * Trả về inline style cho <span> thay thế <img> với spritesheet:
 * - fishing-rod: 6 cột × 3 hàng → background-size: auto 300% để chỉ show hàng 1 (frame 0)
 * - cá (strip 1 hàng): background-size: auto 100%; background-position: left center
 * Trả về null nếu item không phải spritesheet → dùng <img> bình thường.
 */
function getSpriteStyle(id: string, icon: string): React.CSSProperties | null {
  if (SPRITESHEET_ROD.has(id)) {
    return {
      display: 'inline-block',
      width: '44px',
      height: '44px',
      backgroundImage: `url(${icon})`,
      backgroundSize: 'auto 300%',
      backgroundPosition: 'left top',
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
      flexShrink: 0,
    }
  }
  if (SPRITESHEET_FISH.has(id)) {
    return {
      display: 'inline-block',
      width: '44px',
      height: '44px',
      backgroundImage: `url(${icon})`,
      backgroundSize: 'auto 100%',
      backgroundPosition: 'left center',
      backgroundRepeat: 'no-repeat',
      imageRendering: 'pixelated',
      flexShrink: 0,
    }
  }
  return null
}

/**
 * Chuẩn hóa mảng slot nhận từ backend:
 * - Ưu tiên icon/label từ ITEM_DEFINITIONS (đảm bảo đúng asset local)
 * - Fallback về label/name từ dữ liệu backend nếu chưa có trong definitions
 */
function normalizeSlots(raw: any[]): (import('../game/inventory/inventory').InventoryItem | null)[] {
  return raw.map((t: any) => {
    if (!t) return null
    const def = ITEM_DEFINITIONS[t.id as keyof typeof ITEM_DEFINITIONS]
    return {
      ...t,
      label: def?.label || t.label || t.name || t.id,
      icon: def?.icon || t.icon,
    }
  })
}

export function GamePage() {
  const [coins, setCoins] = useState(0)
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
  const [nftShopOpen, setNftShopOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [faucetLoading, setFaucetLoading] = useState(false)
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([])

  const [questProgress, setQuestProgress] = useState<QuestProgress>(() => {
    try {
      const rawUser = localStorage.getItem('pixel_farm_user')
      const u = rawUser ? JSON.parse(rawUser) : null
      const addr = u?.wallet_address || u?.address
      const storageKey = addr ? `pixel_farm_qp_${addr.toLowerCase()}` : 'pixel_farm_qp_guest'
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw)
    } catch {}
    return {
      planted: 0,
      harvested: 0,
      visitedExchange: false,
      boughtShop: 0,
      fishCaught: 0,
      coins: 0,
    }
  })

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
    depositTokens,
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
        if (!customEvent.detail.user) {
          setCoins(0)
        }
      } else {
        setCurrentUser(customEvent.detail ?? null)
        if (!customEvent.detail) {
          setCoins(0)
        }
      }
    }
    window.addEventListener('auth-user-changed', handleAuthUserChanged)
    return () => window.removeEventListener('auth-user-changed', handleAuthUserChanged)
  }, [])

  // Theo dõi sự thay đổi của effectiveAddress: khi chưa kết nối ví hoặc đổi sang ví mới thì reset Coins về 0
  const prevEffectiveAddressRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!effectiveAddress) {
      setCoins(0)
      prevEffectiveAddressRef.current = null
      return
    }

    if (prevEffectiveAddressRef.current !== undefined && prevEffectiveAddressRef.current !== effectiveAddress) {
      setCoins(0)
    }
    prevEffectiveAddressRef.current = effectiveAddress
  }, [effectiveAddress])

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
    const fetchLatestState = () => {
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
                setCompletedQuestIds(ids)
              } else {
                setCompletedQuestIds([])
              }
              // Đồng bộ Kho đồ và Toolbar từ cơ sở dữ liệu MongoDB
              if (Array.isArray(data.state.toolbar) && data.state.toolbar.length > 0) {
                setToolbar(normalizeSlots(data.state.toolbar))
              }
              if (Array.isArray(data.state.inventory) && data.state.inventory.length > 0) {
                setInventory(normalizeSlots(data.state.inventory))
              }
            }
          })
          .catch(() => {})
      } else {
        setCoins(0)
      }
    }

    const handleOpenShopEvent = () => setShopOpen(true)

    fetchLatestState()
    window.addEventListener('sync-game-state', fetchLatestState)
    window.addEventListener('open-shop-modal', handleOpenShopEvent)
    return () => {
      window.removeEventListener('sync-game-state', fetchLatestState)
      window.removeEventListener('open-shop-modal', handleOpenShopEvent)
    }
  }, [effectiveAddress, currentUser?.token, setToolbar, setInventory])

  // Tải tiến độ nhiệm vụ theo địa chỉ người dùng
  useEffect(() => {
    const storageKey = effectiveAddress ? `pixel_farm_qp_${effectiveAddress.toLowerCase()}` : 'pixel_farm_qp_guest'
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        setQuestProgress(JSON.parse(raw))
        return
      }
    } catch {}
    setQuestProgress({
      planted: 0,
      harvested: 0,
      visitedExchange: false,
      boughtShop: 0,
      fishCaught: 0,
      coins,
    })
  }, [effectiveAddress])

  // Lưu tiến độ nhiệm vụ vào LocalStorage
  useEffect(() => {
    const storageKey = effectiveAddress ? `pixel_farm_qp_${effectiveAddress.toLowerCase()}` : 'pixel_farm_qp_guest'
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...questProgress, coins }))
    } catch {}
  }, [questProgress, coins, effectiveAddress])

  // Lắng nghe các sự kiện gameplay để cập nhật tiến độ nhiệm vụ tự động
  useEffect(() => {
    const handleCropPlanted = () => {
      setQuestProgress((prev) => ({ ...prev, planted: prev.planted + 1 }))
    }
    const handleFarmHarvest = () => {
      setQuestProgress((prev) => ({ ...prev, harvested: prev.harvested + 1 }))
    }
    const handleFishCatch = () => {
      setQuestProgress((prev) => ({ ...prev, fishCaught: prev.fishCaught + 1 }))
    }

    window.addEventListener('farm-plant-crop-success', handleCropPlanted)
    window.addEventListener('farm-harvest', handleFarmHarvest)
    window.addEventListener('fishing-catch', handleFishCatch)
    return () => {
      window.removeEventListener('farm-plant-crop-success', handleCropPlanted)
      window.removeEventListener('farm-harvest', handleFarmHarvest)
      window.removeEventListener('fishing-catch', handleFishCatch)
    }
  }, [])

  // Tự động lưu Game State (coins, energy, level, xp, toolbar, inventory) lên Backend khi có thay đổi
  useEffect(() => {
    if (!effectiveAddress) return
    const timer = setTimeout(() => {
      const token = localStorage.getItem('pixel_farm_jwt') || currentUser?.token
      fetch('http://localhost:4000/api/game/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          address: effectiveAddress,
          coins,
          energy,
          max_energy: maxEnergy,
          level,
          xp,
          toolbar,
          inventory,
        }),
      }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [effectiveAddress, coins, energy, maxEnergy, level, xp, toolbar, inventory, currentUser?.token])

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

  // Mua hạt giống từ Shop (gọi API backend khi đã đăng nhập, fallback guest)
  const handleBuyShopItem = async (item: ShopItem) => {
    if (coins < item.priceCoins) {
      showGameAlert({
        title: 'Thiếu Coin',
        message: `Bạn không đủ Coin để mua gói ${item.name}! Cần ${item.priceCoins} Coins nhưng hiện có ${coins} Coins. Hãy thu hoạch nông sản hoặc câu cá để kiếm thêm Coin!`,
        type: 'warning',
        icon: '🪙',
      })
      return
    }

    const token = localStorage.getItem('pixel_farm_jwt') || currentUser?.token
    if (effectiveAddress && token) {
      try {
        const res = await fetch('http://localhost:4000/api/shop/buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            address: effectiveAddress,
            itemId: item.id,
            bundleCount: 1,
          }),
        })
        const data = await res.json()
        if (data.success) {
          soundEngine.playCoin()
          setQuestProgress((prev) => ({ ...prev, boughtShop: prev.boughtShop + 1 }))
          if (typeof data.remainingCoins === 'number') setCoins(data.remainingCoins)
          if (Array.isArray(data.toolbar)) setToolbar(normalizeSlots(data.toolbar))
          if (Array.isArray(data.inventory)) setInventory(normalizeSlots(data.inventory))
          showGameAlert({
            title: 'Mua Thành Công',
            message: `Bạn đã mua thành công ${item.bundleQuantity}x ${item.name}! Hãy chọn hạt giống trên thanh công cụ để gieo trồng.`,
            type: 'success',
            icon: '🌱',
          })
          return
        } else {
          showGameAlert({
            title: 'Không Thể Mua',
            message: data.error || 'Kho đồ đã đầy hoặc có lỗi xảy ra.',
            type: 'warning',
            icon: '🎒',
          })
          return
        }
      } catch (err) {
        console.error('Buy shop item error:', err)
      }
    }

    // Khách vãng lai (Guest) hoặc khi offline
    const def = ITEM_DEFINITIONS[item.id]
    if (def) {
      const added = addItem({ ...def, quantity: item.bundleQuantity })
      if (!added) {
        showGameAlert({
          title: 'Kho Đồ Đầy',
          message: 'Túi đồ của bạn đã đầy! Vui lòng dọn dẹp hoặc bán bớt nông sản trước khi mua.',
          type: 'warning',
          icon: '🎒',
        })
        return
      }
      setCoins((prev) => prev - item.priceCoins)
      setQuestProgress((prev) => ({ ...prev, boughtShop: prev.boughtShop + 1 }))
      soundEngine.playCoin()
      showGameAlert({
        title: 'Mua Thành Công',
        message: `Bạn đã mua thành công ${item.bundleQuantity}x ${item.name}!`,
        type: 'success',
        icon: '🌱',
      })
    }
  }

  // Bán nông sản lấy Coins (tính toán đồng bộ tránh trừ x2)
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

    // 1. Tính toán trừ số lượng đồng bộ giữa Toolbar và Inventory
    let remaining = quantity
    const nextToolbar = [...toolbar]
    for (let i = 0; i < nextToolbar.length && remaining > 0; i++) {
      const slot = nextToolbar[i]
      if (slot && slot.id === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity
          nextToolbar[i] = null
        } else {
          nextToolbar[i] = { ...slot, quantity: slot.quantity - remaining }
          remaining = 0
        }
      }
    }

    const nextInventory = [...inventory]
    for (let i = 0; i < nextInventory.length && remaining > 0; i++) {
      const slot = nextInventory[i]
      if (slot && slot.id === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity
          nextInventory[i] = null
        } else {
          nextInventory[i] = { ...slot, quantity: slot.quantity - remaining }
          remaining = 0
        }
      }
    }

    setToolbar(nextToolbar)
    setInventory(nextInventory)

    const earned = pricePerUnit * quantity
    setCoins((prev) => prev + earned)
    soundEngine.playCoin()

    const token = localStorage.getItem('pixel_farm_jwt') || currentUser?.token
    fetch('http://localhost:4000/api/shop/sell', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        itemId,
        quantity,
        address: effectiveAddress,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (typeof data.newCoinBalance === 'number') setCoins(data.newCoinBalance)
          if (Array.isArray(data.toolbar)) setToolbar(data.toolbar)
          if (Array.isArray(data.inventory)) setInventory(data.inventory)
        }
      })
      .catch(() => {})
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
        setCoins((prev) => prev + rewardCoins)
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

  const handleQuizReward = (rewardCoins: number, rewardXp: number, _newTotalCoins: number) => {
    setCoins((prev) => prev + rewardCoins)
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
      window.dispatchEvent(new CustomEvent('sync-game-state'))
    } catch {}
  }, [])

  const handleOpenFarm = useCallback(() => {
    setShopOpen(false)
    setGameFiHubOpen(false)
    setNftShopOpen(false)
    setQuizModalOpen(false)
    setClaimModalOpen(false)
    setInventoryOpen(false)
    window.dispatchEvent(new CustomEvent('focus-player'))
  }, [])

  const handleBuyNftSuccess = useCallback((item: NftShopItem) => {
    const def = ITEM_DEFINITIONS[item.gameToolId as keyof typeof ITEM_DEFINITIONS]
    if (def) {
      addItem({
        ...def,
        quantity: 1,
      })
    }
    soundEngine.playLevelUp()
    showGameAlert({
      title: 'Mua NFT Thành Công!',
      message: `🎉 Chúc mừng! Bạn đã nhận được ${item.name} (${item.buffTitle}) vào hành trang!`,
      type: 'success',
      icon: '🛡️',
    })
  }, [addItem])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    disconnect()
    setCompletedQuestIds([])
    setCoins(0)
    setLevel(1)
    setXp(0)
    setEnergy(100)
    setQuestProgress({
      planted: 0,
      harvested: 0,
      visitedExchange: false,
      boughtShop: 0,
      fishCaught: 0,
      coins: 0,
    })
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
        onOpenFarm={handleOpenFarm}
        onOpenGameFiHub={() => {
          setGameFiHubOpen(true)
          setQuestProgress((prev) => ({ ...prev, visitedExchange: true }))
        }}
        onOpenNftShop={() => setNftShopOpen(true)}
        onOpenClaim={() => {
          setClaimModalOpen(true)
          setQuestProgress((prev) => ({ ...prev, visitedExchange: true }))
        }}
        onOpenShop={() => setShopOpen(true)}
        onOpenQuiz={() => setQuizModalOpen(true)}
        isQuizOpen={quizModalOpen}
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
        questProgress={questProgress}
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

      {/* NFT Shop Modal */}
      <NftShopModal
        isOpen={nftShopOpen}
        onClose={() => setNftShopOpen(false)}
        account={account}
        pixelBalance={pixelBalance}
        onOpenAuth={() => setAuthModalOpen(true)}
        depositTokens={depositTokens}
        refreshBalances={refreshBalances}
        onBuySuccess={handleBuyNftSuccess}
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

              return (
                <div
                  key={index}
                  className={`inventory-slot ${item ? 'inventory-slot-filled' : ''} ${isSelected ? 'inventory-slot-selected' : ''}`}
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
                  <small className="inventory-slot-number">{index + 1}</small>
                  {item && (
                    <div
                      className="inventory-item"
                      draggable
                      onDragStart={(e) => handleInventoryDragStart(e, index)}
                      title={item.label}
                    >
                      {getSpriteStyle(item.id, item.icon)
                        ? <span style={getSpriteStyle(item.id, item.icon)!} aria-label={item.label} />
                        : <img src={item.icon} alt={item.label} draggable={false} />
                      }
                      {item.stackable && (
                        <span className="item-quantity">{item.quantity}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Thanh tương tác khi chọn vật phẩm ăn được trong Inventory */}
          {selectedInvIndex !== null && inventory[selectedInvIndex] && EDIBLE_ITEMS[inventory[selectedInvIndex]!.id] && (
            <div className="inventory-eat-bar">
              <span>
                🍽️ {inventory[selectedInvIndex]!.label} (+{EDIBLE_ITEMS[inventory[selectedInvIndex]!.id].energy}⚡ Năng lượng)
              </span>
              <button
                type="button"
                className="inventory-eat-btn"
                onClick={() => handleEatItem('inventory', selectedInvIndex)}
              >
                Ăn ngay
              </button>
            </div>
          )}

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
          className={`toolbar-menu toolbar-backpack ${inventoryOpen ? 'toolbar-menu-active' : ''}`}
          onClick={() => setInventoryOpen((prev) => !prev)}
          aria-label="Mở túi đồ"
          title="Túi đồ (Phím I)"
        >
          🎒
        </button>

        {selectedTool && EDIBLE_ITEMS[selectedTool] && (
          <button
            type="button"
            className="toolbar-eat-pill toolbar-eat-btn"
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
              className={`toolbar-tool${isSelected ? ' tool-selected' : ''}${!tool ? ' toolbar-empty' : ''}`}
              onClick={() => {
                if (tool) {
                  selectTool(tool.id)
                } else {
                  // Ô trống: click vào để mở nhanh Tiệm Tạp Hóa mua hạt giống/công cụ
                  setShopOpen(true)
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
              <small>{key}</small>
              {tool ? (
                <>
                  {getSpriteStyle(tool.id, tool.icon)
                    ? <span style={getSpriteStyle(tool.id, tool.icon)!} aria-label={tool.label} />
                    : <img src={tool.icon} alt={tool.label} className="tool-icon" draggable={false} />
                  }
                  <span>{tool.label}</span>
                  {tool.stackable && (
                    <span className="toolbar-quantity">{tool.quantity}</span>
                  )}
                </>
              ) : null}
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
