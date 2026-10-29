import { useCallback, useEffect, useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { StatsPanel } from '../components/StatsPanel'
import { QuestPanel } from '../components/QuestPanel'
import { ShopModal, type ShopItem } from '../components/ShopModal'
import { AppNavbar } from '../components/AppNavbar'
import { ClaimTokenModal } from '../components/ClaimTokenModal'
import { NftShopModal } from '../components/NftShopModal'
import { useWeb3 } from '../web3/useWeb3'
import { player } from '../mock-data/player'
import {
  DEFAULT_INVENTORY,
  DEFAULT_TOOLBAR,
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
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [nftShopOpen, setNftShopOpen] = useState(false)
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
            setCoins(data.state.coins)
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

      if (crop && typeof crop.harvestCoins === 'number') {
        setCoins((prev) => prev + crop.harvestCoins)

        // Cộng nông sản thu hoạch vào kho đồ
        const cropDef = ITEM_DEFINITIONS[crop.id as ToolId]
        if (cropDef) {
          addItem({ ...cropDef, quantity: 1 })
        }
      }
    }

    window.addEventListener('farm-harvest', handleFarmHarvest)
    return () => window.removeEventListener('farm-harvest', handleFarmHarvest)
  }, [addItem])

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

      if (typeof coinsReceived === 'number') {
        setCoins((prev) => prev + coinsReceived)
      }

      if (fishObj && ITEM_DEFINITIONS[fishObj.id as ToolId]) {
        addItem({ ...ITEM_DEFINITIONS[fishObj.id as ToolId], quantity: 1 })
      }
    }

    window.addEventListener('fishing-catch', handleFishingCatch)
    return () => window.removeEventListener('fishing-catch', handleFishingCatch)
  }, [addItem])

  /*
   * ---------------------------------------------------------
   * Shop & Quest Handlers
   * ---------------------------------------------------------
   */
  const handleBuyShopItem = (item: ShopItem) => {
    if (coins < item.priceCoins) return
    setCoins((prev) => prev - item.priceCoins)

    const def = ITEM_DEFINITIONS[item.id]
    if (def) {
      addItem({ ...def, quantity: item.bundleQuantity })
    }
  }

  const handleClaimQuest = (questId: number, rewardCoins: number) => {
    if (completedQuestIds.includes(questId)) return
    setCoins((prev) => prev + rewardCoins)
    setCompletedQuestIds((prev) => [...prev, questId])
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
        onConnect={connectWallet}
        onDisconnect={disconnect}
        onOpenClaim={() => setClaimModalOpen(true)}
        onOpenNftShop={() => setNftShopOpen(true)}
        onClaimFaucet={handleClaimFaucet}
      />

      <GameCanvas />

      {/* Left panel */}
      <StatsPanel
        energy={player.energy}
        maxEnergy={100}
        coins={coins}
        gems={player.level}
      />

      {/* Right panel */}
      <QuestPanel
        quests={quests}
        completedIds={completedQuestIds}
        onClaimReward={handleClaimQuest}
      />

      {/* Seed & Item Shop Modal */}
      <ShopModal
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        coins={coins}
        onBuyItem={handleBuyShopItem}
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
                  className={`inventory-slot${item ? ' inventory-slot-filled' : ''}`}
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

          <div className="inventory-hint">
            💡 Kéo vật phẩm vào thanh công cụ để truy cập nhanh
          </div>

          <button type="button" className="inventory-reset" onClick={resetInventory}>
            Reset kho đồ
          </button>
        </div>
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
