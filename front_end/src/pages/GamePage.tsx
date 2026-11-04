import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { StatsPanel } from '../components/StatsPanel'
import { QuestPanel } from '../components/QuestPanel'
import { ShopModal, type ShopItem } from '../components/ShopModal'
import { AppNavbar } from '../components/AppNavbar'
import { ClaimTokenModal } from '../components/ClaimTokenModal'
import { NftShopModal } from '../components/NftShopModal'
import { AuthModal, type AuthUser } from '../components/AuthModal'
import { DialogueModal } from '../components/DialogueModal'
import { GameFiHubModal } from '../components/GameFiHubModal'
import type { DialogueStep } from '../data/dialogues'
import { soundEngine } from '../audio/SoundEngine'
import { useWeb3 } from '../web3/useWeb3'
import { player } from '../mock-data/player'
import {
  DEFAULT_INVENTORY,
  DEFAULT_TOOLBAR,
  EDIBLE_ITEMS,
  INVENTORY_SIZE,
  ITEM_DEFINITIONS,
  loadInventory,
  saveInventory,
  type InventoryItem,
  type InventoryItemId,
  type InventorySlot,
} from '../game/inventory/inventory'
import { quests } from '../mock-data/quests'
import './GamePage.css'

type ToolId = InventoryItemId

const TOOL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8]

export function GamePage() {
  const [selectedTool, setSelectedTool] = useState<ToolId>('watering-can')
  const [coins, setCoins] = useState(player.coins)
  const [energy, setEnergy] = useState(100)
  const [maxEnergy, setMaxEnergy] = useState(100)
  const energyRef = useRef(100)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null)
  const [energyAlert, setEnergyAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [selectedInvIndex, setSelectedInvIndex] = useState<number | null>(null)

  const [dialogueOpen, setDialogueOpen] = useState(false)
  const [activeNpcId, setActiveNpcId] = useState('barney')
  const [gameFiHubOpen, setGameFiHubOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [nftShopOpen, setNftShopOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('pixel_farm_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [faucetLoading, setFaucetLoading] = useState(false)
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([1])

  const {
    account,
    ethBalance,
    pixelBalance,
    ownedNfts,
    isConnecting,
    connectWallet,
    disconnect,
    claimFaucet,
    mintNft,
    claimFarmingReward,
    refreshBalances,
  } = useWeb3()

  const [inventory, setInventory] = useState<InventorySlot[]>(() => {
    return loadInventory(account || undefined).inventory
  })

  const [toolbar, setToolbar] = useState<(InventoryItem | null)[]>(() => {
    return loadInventory(account || undefined).toolbar
  })

  /*
   * ---------------------------------------------------------
   * Sync inventory and coins with wallet address & backend
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = loadInventory(account || undefined)
      setInventory(loaded.inventory)
      setToolbar(loaded.toolbar)
    }, 0)

    // Optional: fetch game state from backend if running
    if (account) {
      fetch(`http://localhost:4000/api/game/state?address=${account}`)
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
          }
        })
        .catch(() => {
          // Backend optional fallback
        })
    }

    return () => clearTimeout(timer)
  }, [account])

  useEffect(() => {
    saveInventory(inventory, toolbar, account || undefined)
  }, [inventory, toolbar, account])

  /*
   * ---------------------------------------------------------
   * Add Item Helper (Stackable support)
   * ---------------------------------------------------------
   */
  const addItem = useCallback((item: InventoryItem) => {
    // 1. Cố gắng gộp stack vào Toolbar trước
    if (item.stackable) {
      const tbIdx = toolbar.findIndex((t) => t && t.id === item.id)
      if (tbIdx !== -1 && toolbar[tbIdx]) {
        setToolbar((prev) => {
          const next = [...prev]
          next[tbIdx] = {
            ...next[tbIdx]!,
            quantity: next[tbIdx]!.quantity + item.quantity,
          }
          return next
        })
        return
      }

      // 2. Cố gắng gộp stack vào Inventory
      const invIdx = inventory.findIndex((entry) => entry && entry.id === item.id)
      if (invIdx !== -1 && inventory[invIdx]) {
        setInventory((prev) => {
          const next = [...prev]
          next[invIdx] = {
            ...next[invIdx]!,
            quantity: next[invIdx]!.quantity + item.quantity,
          }
          return next
        })
        return
      }
    }

    // 3. Tìm ô trống trong Toolbar
    const emptyTbIdx = toolbar.findIndex((t) => t === null)
    if (emptyTbIdx !== -1) {
      setToolbar((prev) => {
        const next = [...prev]
        next[emptyTbIdx] = item
        return next
      })
      return
    }

    // 4. Tìm ô trống trong Inventory
    const emptyInvIdx = inventory.findIndex((entry) => entry === null)
    if (emptyInvIdx !== -1) {
      setInventory((prev) => {
        const next = [...prev]
        next[emptyInvIdx] = item
        return next
      })
    }
  }, [toolbar, inventory])

  /*
   * ---------------------------------------------------------
   * Consume Seed Helper
   * ---------------------------------------------------------
   */
  const consumeSeed = useCallback((seedId: ToolId): boolean => {
    // 1. Kiểm tra trên Toolbar
    const tbIdx = toolbar.findIndex((t) => t && t.id === seedId && t.quantity > 0)
    if (tbIdx !== -1 && toolbar[tbIdx]) {
      setToolbar((prev) => {
        const next = [...prev]
        const current = next[tbIdx]!
        if (current.quantity > 1) {
          next[tbIdx] = { ...current, quantity: current.quantity - 1 }
        } else {
          next[tbIdx] = null
          setSelectedTool('watering-can')
        }
        return next
      })
      return true
    }

    // 2. Kiểm tra trong Inventory
    const invIdx = inventory.findIndex((entry) => entry && entry.id === seedId && entry.quantity > 0)
    if (invIdx !== -1 && inventory[invIdx]) {
      setInventory((prev) => {
        const next = [...prev]
        const current = next[invIdx]!
        if (current.quantity > 1) {
          next[invIdx] = { ...current, quantity: current.quantity - 1 }
        } else {
          next[invIdx] = null
        }
        return next
      })
      return true
    }

    return false
  }, [toolbar, inventory])

  /*
   * ---------------------------------------------------------
   * Audio Engine & Retro BGM (Pixels.xyz Pillar 3)
   * ---------------------------------------------------------
   */
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

  /*
   * ---------------------------------------------------------
   * Energy Management & XP Progression (Pixels.xyz Pillar 1)
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const handleActionEnergy = (event: Event) => {
      const customEvent = event as CustomEvent<{ cost: number; action: string }>
      const cost = customEvent.detail?.cost ?? 2
      if (energyRef.current < cost) {
        customEvent.preventDefault()
        soundEngine.playExhausted()
        setEnergyAlert({
          message: `⚡ Kiệt sức! Cần ít nhất ${cost} Năng lượng. Hãy ăn nông sản hoặc cá!`,
          type: 'error',
        })
        setTimeout(() => setEnergyAlert(null), 3000)
        return
      }
      const next = Math.max(0, energyRef.current - cost)
      energyRef.current = next
      setEnergy(next)
    }

    window.addEventListener('farm-action-energy', handleActionEnergy)
    return () => window.removeEventListener('farm-action-energy', handleActionEnergy)
  }, [])

  const addXP = useCallback((amount: number) => {
    setXp((prevXp) => {
      const nextXp = prevXp + amount
      setLevel((prevLevel) => {
        const requiredXp = prevLevel * 100
        if (nextXp >= requiredXp) {
          const nextLevel = prevLevel + 1
          const nextMaxEnergy = 100 + (nextLevel - 1) * 5
          setMaxEnergy(nextMaxEnergy)
          setEnergy(nextMaxEnergy)
          energyRef.current = nextMaxEnergy
          soundEngine.playLevelUp()
          setLevelUpMessage(
            `🎉 LEVEL UP! Chúc mừng bạn đã đạt Cấp ${nextLevel}! Hồi phục đầy Năng lượng và Tối đa ⚡ +5.`,
          )
          setTimeout(() => setLevelUpMessage(null), 4000)
          return nextLevel
        }
        return prevLevel
      })
      return nextXp
    })
  }, [])

  const handleEatItem = useCallback(
    (source: 'inventory' | 'toolbar', index: number) => {
      const slot = source === 'inventory' ? inventory[index] : toolbar[index]
      if (!slot) return

      const edible = EDIBLE_ITEMS[slot.id]
      if (!edible) return

      if (energy >= maxEnergy) {
        setEnergyAlert({
          message: '⚡ Thể lực đang đầy (100%), không cần ăn thêm!',
          type: 'error',
        })
        setTimeout(() => setEnergyAlert(null), 2500)
        return
      }

      if (source === 'inventory') {
        setInventory((prev) => {
          const next = [...prev]
          const cur = next[index]
          if (!cur) return prev
          if (cur.quantity > 1) {
            next[index] = { ...cur, quantity: cur.quantity - 1 }
          } else {
            next[index] = null
            setSelectedInvIndex(null)
          }
          return next
        })
      } else {
        setToolbar((prev) => {
          const next = [...prev]
          const cur = next[index]
          if (!cur) return prev
          if (cur.quantity > 1) {
            next[index] = { ...cur, quantity: cur.quantity - 1 }
          } else {
            next[index] = null
            setSelectedTool('watering-can')
          }
          return next
        })
      }

      const restored = Math.min(maxEnergy, energy + edible.energy)
      setEnergy(restored)
      energyRef.current = restored
      soundEngine.playEat()
      setEnergyAlert({
        message: `🍽️ Bạn đã ăn ${slot.label}! Hồi phục +${edible.energy} ⚡ Năng lượng.`,
        type: 'success',
      })
      setTimeout(() => setEnergyAlert(null), 3000)
    },
    [energy, maxEnergy, inventory, toolbar],
  )

  const handleEatSelectedTool = () => {
    const idx = toolbar.findIndex((t) => t && t.id === selectedTool)
    if (idx !== -1) {
      handleEatItem('toolbar', idx)
    }
  }

  /*
   * ---------------------------------------------------------
   * NPC Dialogue Interactions (Pixels.xyz Pillar 2)
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const handleOpenDialogue = (e: Event) => {
      const customEvent = e as CustomEvent<{ npcId: string }>
      if (customEvent.detail?.npcId) {
        setActiveNpcId(customEvent.detail.npcId)
        setDialogueOpen(true)
      }
    }

    window.addEventListener('open-npc-dialogue', handleOpenDialogue)
    return () => window.removeEventListener('open-npc-dialogue', handleOpenDialogue)
  }, [])

  const handleClaimNpcReward = (reward: DialogueStep['reward']) => {
    if (!reward) return

    // 1. Coins reward
    if (reward.coins) {
      if (!currentUser) {
        alert('🔒 Bạn chưa đăng nhập! Vui lòng đăng nhập để lưu Coin từ nhiệm vụ NPC.')
        setAuthModalOpen(true)
      } else {
        setCoins((prev) => prev + reward.coins!)
      }
    }

    // 2. Seeds or Item reward
    if (reward.quantity && reward.itemId) {
      const def = ITEM_DEFINITIONS[reward.itemId as ToolId]
      if (def) {
        addItem({ ...def, quantity: reward.quantity })
      }
    }

    // 3. Energy restore
    if (reward.type === 'energy') {
      setEnergy(maxEnergy)
      energyRef.current = maxEnergy
      setEnergyAlert({
        message: '⚡ Bác Barney đã truyền bí quyết và hồi phục 100% Năng lượng cho bạn!',
        type: 'success',
      })
      setTimeout(() => setEnergyAlert(null), 3000)
    }

    // 4. XP reward
    if (reward.xp) {
      addXP(reward.xp)
    }

    setLevelUpMessage(
      `🎁 Bạn đã nhận thưởng từ ${activeNpcId === 'barney' ? 'Bác Barney' : 'Cô Hazel'}!`,
    )
    setTimeout(() => setLevelUpMessage(null), 3500)
  }

  /*
   * ---------------------------------------------------------
   * Event Listeners (Gieo hạt, Thu hoạch, Câu cá)
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const handlePlant = (event: Event) => {
      const customEvent = event as CustomEvent<{ seedId: ToolId; cropId: string }>
      const seedId = customEvent.detail?.seedId
      if (!seedId) return

      const success = consumeSeed(seedId)
      if (!success) {
        customEvent.preventDefault()
      }
    }

    window.addEventListener('farm-plant-crop', handlePlant)
    return () => window.removeEventListener('farm-plant-crop', handlePlant)
  }, [consumeSeed])

  useEffect(() => {
    const handleFarmHarvest = (event: Event) => {
      const customEvent = event as CustomEvent
      const crop = customEvent.detail?.crop

      if (crop) {
        if (!currentUser) {
          alert('🔒 Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận Coin và EXP từ thu hoạch.')
          setAuthModalOpen(true)
        } else {
          if (typeof crop.harvestCoins === 'number') {
            setCoins((prev) => prev + crop.harvestCoins)
          }
          addXP(15)
        }

        // Vẫn cộng nông sản thu hoạch vào kho đồ
        const cropDef = ITEM_DEFINITIONS[crop.id as ToolId]
        if (cropDef) {
          addItem({ ...cropDef, quantity: 1 })
        }
      }
    }

    window.addEventListener('farm-harvest', handleFarmHarvest)
    return () => window.removeEventListener('farm-harvest', handleFarmHarvest)
  }, [addItem, currentUser, addXP])

  useEffect(() => {
    const handleFishingCatch = (
      event: Event,
    ) => {
      const customEvent = event as CustomEvent<{
        fish?: { id: string; name: string }
        coins?: number
      }>
      const coinsReceived = customEvent.detail?.coins
      const fishObj = customEvent.detail?.fish

      if (!currentUser) {
        alert('🔒 Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận Coin và EXP khi câu cá.')
        setAuthModalOpen(true)
      } else {
        if (typeof coinsReceived === 'number') {
          setCoins((prev) => prev + coinsReceived)
        }
        addXP(25)
      }

      if (fishObj && ITEM_DEFINITIONS[fishObj.id as ToolId]) {
        addItem({ ...ITEM_DEFINITIONS[fishObj.id as ToolId], quantity: 1 })
      }
    }

    window.addEventListener('fishing-catch', handleFishingCatch)
    return () => window.removeEventListener('fishing-catch', handleFishingCatch)
  }, [addItem, currentUser, addXP])

  /*
   * ---------------------------------------------------------
   * Shop & Quest Handlers
   * ---------------------------------------------------------
   */
  const handleBuyShopItem = (item: ShopItem) => {
    if (coins < item.priceCoins) return
    setCoins((prev) => prev - item.priceCoins)
    soundEngine.playCoin()

    const def = ITEM_DEFINITIONS[item.id]
    if (def) {
      addItem({ ...def, quantity: item.bundleQuantity })
    }
  }

  const handleSellItem = (itemId: string, quantity: number, pricePerUnit: number) => {
    if (!currentUser) {
      alert('🔒 Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để bán nông sản nhận Coin.')
      setAuthModalOpen(true)
      return
    }

    let remainingToRemove = quantity

    // Trừ từ toolbar trước
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

    // Sau đó trừ tiếp từ inventory
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

    // Đồng bộ gọi API backend
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
    }).catch(() => {
      // offline fallback
    })
  }

  const handleClaimQuest = (questId: number, rewardCoins: number) => {
    if (!currentUser) {
      alert('🔒 Bạn chưa đăng nhập tài khoản! Vui lòng đăng nhập để nhận Coin thưởng nhiệm vụ.')
      setAuthModalOpen(true)
      return
    }
    if (completedQuestIds.includes(questId)) return
    setCoins((prev) => prev + rewardCoins)
    setCompletedQuestIds((prev) => [...prev, questId])
    soundEngine.playCoin()
    addXP(50)
  }

  /*
   * ---------------------------------------------------------
   * Web3 Handlers
   * ---------------------------------------------------------
   */
  const handleClaimFaucet = async () => {
    if (!account) {
      await connectWallet()
      return
    }
    setFaucetLoading(true)
    try {
      await claimFaucet()
      soundEngine.playCoin()
      alert('🎉 Đã nhận 100 $PIXEL thử nghiệm từ Faucet Contract!')
    } catch (err: any) {
      alert('Lỗi Faucet: ' + (err?.reason || err?.message || 'Không thể nhận faucet'))
    } finally {
      setFaucetLoading(false)
    }
  }

  const handleClaimSuccess = (claimedCoins: number, _txHash: string) => {
    setCoins((prev) => Math.max(0, prev - claimedCoins))
    refreshBalances()
  }

  const handleMintNftSuccess = (_itemType: number, _txHash: string) => {
    refreshBalances()
  }

  /*
   * ---------------------------------------------------------
   * Open / close inventory with keyboard I
   * ---------------------------------------------------------
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.key.toLowerCase() === 'i') {
        event.preventDefault()
        setInventoryOpen((prev) => !prev)
      } else if (event.key.toLowerCase() === 'h') {
        event.preventDefault()
        setGameFiHubOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /*
   * ---------------------------------------------------------
   * Select tool
   * ---------------------------------------------------------
   */
  const selectTool = (tool: ToolId) => {
    setSelectedTool(tool)
    window.dispatchEvent(
      new CustomEvent('farm-tool-changed', {
        detail: { tool },
      }),
    )
  }

  /*
   * ---------------------------------------------------------
   * Inventory & Toolbar Drag/Drop
   * ---------------------------------------------------------
   */
  const moveInventoryToToolbar = (inventoryIndex: number, toolbarIndex: number) => {
    const sourceItem = inventory[inventoryIndex]
    const targetItem = toolbar[toolbarIndex]

    if (!sourceItem) return

    setInventory((prevInventory) => {
      const nextInventory = [...prevInventory]
      nextInventory[inventoryIndex] = targetItem
      return nextInventory
    })

    setToolbar((prevToolbar) => {
      const nextToolbar = [...prevToolbar]
      nextToolbar[toolbarIndex] = sourceItem
      return nextToolbar
    })

    selectTool(sourceItem.id)
  }

  const moveToolbarToInventory = (toolbarIndex: number, inventoryIndex: number) => {
    const sourceItem = toolbar[toolbarIndex]
    const targetItem = inventory[inventoryIndex]

    if (!sourceItem) return

    setInventory((prevInventory) => {
      const nextInventory = [...prevInventory]
      nextInventory[inventoryIndex] = sourceItem
      return nextInventory
    })

    setToolbar((prevToolbar) => {
      const nextToolbar = [...prevToolbar]
      nextToolbar[toolbarIndex] = targetItem
      return nextToolbar
    })
  }

  const moveInventoryItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    setInventory((prev) => {
      const next = [...prev]
      const source = next[fromIndex]
      const target = next[toIndex]

      if (!source) return prev

      if (target && target.id === source.id && target.stackable) {
        next[toIndex] = {
          ...target,
          quantity: target.quantity + source.quantity,
        }
        next[fromIndex] = null
        return next
      }

      next[fromIndex] = target
      next[toIndex] = source
      return next
    })
  }

  const handleInventoryDragStart = (event: React.DragEvent, index: number) => {
    event.dataTransfer.setData(
      'application/x-inventory',
      JSON.stringify({ type: 'inventory', index }),
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleToolbarDragStart = (event: React.DragEvent, index: number) => {
    event.dataTransfer.setData(
      'application/x-inventory',
      JSON.stringify({ type: 'toolbar', index }),
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const readDragData = (event: React.DragEvent) => {
    try {
      return JSON.parse(event.dataTransfer.getData('application/x-inventory')) as {
        type: 'inventory' | 'toolbar'
        index: number
      }
    } catch {
      return null
    }
  }

  const resetInventory = () => {
    setInventory([...DEFAULT_INVENTORY])
    setToolbar([...DEFAULT_TOOLBAR])
    selectTool('watering-can')
  }

  const handleAuthSuccess = useCallback((user: AuthUser, token: string) => {
    setCurrentUser(user)
    try {
      localStorage.setItem('pixel_farm_user', JSON.stringify(user))
      localStorage.setItem('pixel_farm_jwt', token)
    } catch {
      // ignore
    }
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentUser(null)
    try {
      localStorage.removeItem('pixel_farm_user')
      localStorage.removeItem('pixel_farm_jwt')
    } catch {
      // ignore
    }
  }, [])

  return (
    <section className="game-page" aria-label="Pixel Farm game">
      {/* Top Web3 & Game Navigation Bar */}
      <AppNavbar
        coins={coins}
        account={account}
        pixelBalance={pixelBalance}
        ethBalance={ethBalance}
        isConnecting={isConnecting}
        faucetLoading={faucetLoading}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onConnect={connectWallet}
        onDisconnect={disconnect}
        onOpenClaim={() => setClaimModalOpen(true)}
        onOpenNftShop={() => setNftShopOpen(true)}
        onOpenGameFiHub={() => setGameFiHubOpen(true)}
        onClaimFaucet={handleClaimFaucet}
      />

      <GameCanvas />

      {/* Level Up & Energy Alerts */}
      {levelUpMessage && (
        <div className="level-up-banner">
          {levelUpMessage}
        </div>
      )}

      {energyAlert && (
        <div className={`energy-alert-toast ${energyAlert.type === 'success' ? 'energy-alert-toast--success' : ''}`}>
          {energyAlert.message}
        </div>
      )}

      {/* Left panel */}
      <StatsPanel
        energy={energy}
        maxEnergy={maxEnergy}
        coins={coins}
        gems={level}
        level={level}
        xp={xp}
        isLoggedIn={Boolean(currentUser)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Right panel */}
      <QuestPanel
        quests={quests}
        completedIds={completedQuestIds}
        isLoggedIn={Boolean(currentUser)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onClaimReward={handleClaimQuest}
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

      {/* Web3 Token Claim Modal (Sync Coins to $PIXEL) */}
      <ClaimTokenModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        inGameCoins={coins}
        account={account}
        pixelBalance={pixelBalance}
        claimFarmingReward={claimFarmingReward}
        onClaimSuccess={handleClaimSuccess}
      />

      {/* Web3 NFT Shop Modal (1-Click Mint) */}
      <NftShopModal
        isOpen={nftShopOpen}
        onClose={() => setNftShopOpen(false)}
        account={account}
        pixelBalance={pixelBalance}
        ownedNfts={ownedNfts}
        mintNft={mintNft}
        onMintSuccess={handleMintNftSuccess}
      />

      {/* Auth Modal (SIWE & Traditional Login / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        account={account}
        connectWallet={connectWallet}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      {/* Interactive NPC Dialogue Modal (Pixels.xyz Pillar 2) */}
      <DialogueModal
        isOpen={dialogueOpen}
        npcId={activeNpcId}
        onClose={() => setDialogueOpen(false)}
        onOpenShop={() => setShopOpen(true)}
        onClaimReward={handleClaimNpcReward}
      />

      {/* Web3 GameFi Vault & Dashboard Hub (Pixels.xyz Pillar 4) */}
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
        ownedNfts={ownedNfts}
        onOpenClaim={() => setClaimModalOpen(true)}
        onOpenNftShop={() => setNftShopOpen(true)}
        onConnectWallet={connectWallet}
      />

      {/* =====================================================
          INVENTORY POPUP
          ===================================================== */}
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
            {Array.from({ length: INVENTORY_SIZE }, (_, index) => {
              const item = inventory[index]

              return (
                <div
                  key={index}
                  className={`inventory-slot${item ? ' inventory-slot-filled' : ''}${selectedInvIndex === index ? ' inventory-slot-selected' : ''}`}
                  onClick={() => setSelectedInvIndex(index)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const data = readDragData(event)
                    if (!data) return

                    if (data.type === 'inventory') {
                      moveInventoryItem(data.index, index)
                    }

                    if (data.type === 'toolbar') {
                      moveToolbarToInventory(data.index, index)
                    }
                  }}
                >
                  {item && (
                    <div
                      className="inventory-item"
                      draggable
                      onDragStart={(event) => handleInventoryDragStart(event, index)}
                      title={item.label}
                    >
                      <img src={item.icon} alt={item.label} draggable={false} />
                      {item.stackable && (
                        <span className="item-quantity">{item.quantity}</span>
                      )}
                    </div>
                  )}

                  <small className="inventory-slot-number">{index + 1}</small>
                </div>
              )
            })}
          </div>

          {selectedInvIndex !== null && inventory[selectedInvIndex] && (
            <div className="inventory-eat-bar">
              <span>
                {inventory[selectedInvIndex]!.label}
                {EDIBLE_ITEMS[inventory[selectedInvIndex]!.id]
                  ? ` (+${EDIBLE_ITEMS[inventory[selectedInvIndex]!.id].energy} ⚡)`
                  : ''}
              </span>
              {EDIBLE_ITEMS[inventory[selectedInvIndex]!.id] ? (
                <button
                  type="button"
                  className="inventory-eat-btn"
                  onClick={() => handleEatItem('inventory', selectedInvIndex)}
                >
                  🍽️ Ăn (+{EDIBLE_ITEMS[inventory[selectedInvIndex]!.id].energy} ⚡)
                </button>
              ) : (
                <small style={{ color: '#8fa5cf' }}>Không thể ăn</small>
              )}
            </div>
          )}

          <div className="inventory-hint">
            💡 Kéo vật phẩm vào thanh công cụ hoặc nhấp để Ăn hồi phục thể lực
          </div>

          <button type="button" className="inventory-reset" onClick={resetInventory}>
            Reset kho đồ
          </button>
        </div>
      )}

      {/* Quick Eat Action pill if selected tool is edible */}
      {selectedTool && EDIBLE_ITEMS[selectedTool] && (
        <button
          type="button"
          className="toolbar-eat-pill"
          onClick={handleEatSelectedTool}
        >
          🍽️ Ăn {ITEM_DEFINITIONS[selectedTool]?.label || selectedTool} (+{EDIBLE_ITEMS[selectedTool].energy} ⚡)
        </button>
      )}

      {/* =====================================================
          BOTTOM TOOLBAR
          ===================================================== */}
      <div className="game-toolbar" role="toolbar" aria-label="Công cụ nông trại">
        {/* Inventory button */}
        <button
          type="button"
          className={`toolbar-menu${inventoryOpen ? ' toolbar-menu-active' : ''}`}
          aria-label="Kho đồ"
          aria-expanded={inventoryOpen}
          onClick={() => setInventoryOpen((prev) => !prev)}
        >
          •••
        </button>

        {/* Shop Button */}
        <button
          type="button"
          className={`toolbar-menu${shopOpen ? ' toolbar-menu-active' : ''}`}
          aria-label="Cửa hàng hạt giống"
          title="Cửa hàng hạt giống"
          onClick={() => setShopOpen((prev) => !prev)}
        >
          🛒
        </button>

        {/* NFT Shop Button (1-Click Mint) */}
        <button
          type="button"
          className={`toolbar-menu${nftShopOpen ? ' toolbar-menu-active' : ''}`}
          aria-label="Cửa hàng NFT Buff"
          title="Cửa hàng NFT (1-Click Mint)"
          onClick={() => setNftShopOpen(true)}
        >
          ✨
        </button>

        {/* GameFi Hub Button (Vault & Analytics) */}
        <button
          type="button"
          className={`toolbar-menu${gameFiHubOpen ? ' toolbar-menu-active' : ''}`}
          aria-label="GameFi Hub (H)"
          title="GameFi Hub Dashboard & Lịch sử giao dịch (H)"
          onClick={() => setGameFiHubOpen((prev) => !prev)}
        >
          📊
        </button>

        {/* Sync Coins to $PIXEL Claim Button */}
        <button
          type="button"
          className={`toolbar-menu${claimModalOpen ? ' toolbar-menu-active' : ''}`}
          aria-label="Rút $PIXEL on-chain"
          title="Đổi Coin lấy $PIXEL on-chain"
          onClick={() => setClaimModalOpen(true)}
        >
          🪙
        </button>

        {toolbar.map((tool, toolbarIndex) => {
          return (
            <button
              key={`${toolbarIndex}-${tool?.id ?? 'empty'}`}
              id={tool ? `tool-${tool.id}` : `tool-empty-${toolbarIndex}`}
              type="button"
              className={`toolbar-tool${tool?.id === selectedTool ? ' tool-selected' : ''}${!tool ? ' toolbar-empty' : ''}`}
              aria-label={tool?.label ?? 'Ô trống'}
              aria-pressed={tool?.id === selectedTool}
              draggable={Boolean(tool)}
              onClick={() => {
                if (tool) {
                  selectTool(tool.id)
                }
              }}
              onDragStart={(event) => {
                if (tool) {
                  handleToolbarDragStart(event, toolbarIndex)
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const data = readDragData(event)
                if (!data) return

                if (data.type === 'inventory') {
                  moveInventoryToToolbar(data.index, toolbarIndex)
                }

                if (data.type === 'toolbar') {
                  setToolbar((prev) => {
                    const next = [...prev]
                    const temp = next[data.index]
                    next[data.index] = next[toolbarIndex]
                    next[toolbarIndex] = temp
                    return next
                  })
                }
              }}
            >
              <small>{TOOL_KEYS[toolbarIndex]}</small>

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
      <div className="game-controls" aria-label="Phím điều hướng ảo">
        <button
          type="button"
          className="control-up"
          aria-label="Đi lên"
          onPointerDown={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: 'up' } }))}
          onPointerUp={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
          onPointerLeave={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
        >
          ▲
        </button>
        <button
          type="button"
          className="control-left"
          aria-label="Sang trái"
          onPointerDown={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: 'left' } }))}
          onPointerUp={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
          onPointerLeave={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
        >
          ◀
        </button>
        <button
          type="button"
          className="control-down"
          aria-label="Đi xuống"
          onPointerDown={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: 'down' } }))}
          onPointerUp={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
          onPointerLeave={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
        >
          ▼
        </button>
        <button
          type="button"
          className="control-right"
          aria-label="Sang phải"
          onPointerDown={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: 'right' } }))}
          onPointerUp={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
          onPointerLeave={() => document.dispatchEvent(new CustomEvent('farm-control', { detail: { direction: undefined } }))}
        >
          ▶
        </button>
      </div>
    </section>
  )
}
