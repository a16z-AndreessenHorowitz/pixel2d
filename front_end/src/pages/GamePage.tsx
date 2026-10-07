import { useEffect, useState } from 'react'
import { GameCanvas } from '../components/GameCanvas'
import { StatsPanel } from '../components/StatsPanel'
import { QuestPanel } from '../components/QuestPanel'
import { player } from '../mock-data/player'
import {
  DEFAULT_INVENTORY,
  DEFAULT_TOOLBAR,
  INVENTORY_SIZE,
  loadInventory,
  saveInventory,
  type InventoryItem,
  type InventoryItemId,
  type InventorySlot,
} from '../game/inventory/inventory'
import {
  FISH_DATA,
} from '../game/fishing/fishingData'
import { quests } from '../mock-data/quests'
import './GamePage.css'

type ToolId = InventoryItemId

const TOOL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8]

export function GamePage() {
  const [selectedTool, setSelectedTool] = useState<ToolId>('watering-can')
  const [coins, setCoins] = useState(player.coins)

  const [inventory, setInventory] = useState<InventorySlot[]>(() => {
    return loadInventory().inventory
  })

  const [toolbar, setToolbar] = useState<(InventoryItem | null)[]>(() => {
  return loadInventory().toolbar
})

  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [selectedFishId, setSelectedFishId] = useState<InventoryItemId | null>(null)
  /*
   * ---------------------------------------------------------
   * Inventory helpers
   * ---------------------------------------------------------
   */
  const getFishDefinition = (
  id: InventoryItemId,
) => {
  return FISH_DATA.find(
    (fish) => fish.id === id,
  )
}
  const findInventoryItem = (id: ToolId): InventoryItem | null => {
    const item = inventory.find((entry) => entry?.id === id)
    return item ?? null
  }

  const getToolbarItem = (id: ToolId | null): InventoryItem | null => {
    if (!id) return null
    return findInventoryItem(id)
  }

  /*
   * ---------------------------------------------------------
   * Save inventory whenever it changes
   * ---------------------------------------------------------
   */

  useEffect(() => {
    saveInventory(inventory, toolbar)
  }, [inventory, toolbar])

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

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
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
   * Inventory -> Toolbar
   * ---------------------------------------------------------
   */

  const moveInventoryToToolbar = (
  inventoryIndex: number,
  toolbarIndex: number,
) => {
  const sourceItem = inventory[inventoryIndex]
  const targetItem = toolbar[toolbarIndex]

  if (!sourceItem) return

  // Inventory nhận item đang nằm ở Toolbar
  setInventory((prevInventory) => {
    const nextInventory = [...prevInventory]

    nextInventory[inventoryIndex] = targetItem

    return nextInventory
  })

  // Toolbar nhận item đang nằm ở Inventory
  setToolbar((prevToolbar) => {
    const nextToolbar = [...prevToolbar]

    nextToolbar[toolbarIndex] = sourceItem

    return nextToolbar
  })

  // Item vừa kéo sang toolbar trở thành tool đang chọn
  selectTool(sourceItem.id)
}

  /*
   * ---------------------------------------------------------
   * Toolbar -> Inventory
   * ---------------------------------------------------------
   */

  const moveToolbarToInventory = (
  toolbarIndex: number,
  inventoryIndex: number,
) => {
  const sourceItem = toolbar[toolbarIndex]
  const targetItem = inventory[inventoryIndex]

  if (!sourceItem) return

  // Inventory nhận item từ Toolbar
  setInventory((prevInventory) => {
    const nextInventory = [...prevInventory]

    nextInventory[inventoryIndex] = sourceItem

    return nextInventory
  })

  // Toolbar nhận item đang nằm ở Inventory
  setToolbar((prevToolbar) => {
    const nextToolbar = [...prevToolbar]

    nextToolbar[toolbarIndex] = targetItem

    return nextToolbar
  })
}
  /*
   * ---------------------------------------------------------
   * Move item inside inventory
   * ---------------------------------------------------------
   */

  const moveInventoryItem = (
  fromIndex: number,
  toIndex: number,
) => {
  if (fromIndex === toIndex) return

  setInventory((prev) => {
    const next = [...prev]

    const source = next[fromIndex]
    const target = next[toIndex]

    if (!source) return prev

    /*
     * Cùng loại item có thể stack
     */
    if (
      target &&
      target.id === source.id &&
      target.stackable
    ) {
      next[toIndex] = {
        ...target,
        quantity:
          target.quantity + source.quantity,
      }

      next[fromIndex] = null

      return next
    }

    /*
     * Khác item -> swap
     */
    next[fromIndex] = target
    next[toIndex] = source

    return next
  })
}

  /*
   * ---------------------------------------------------------
   * Drag data
   * ---------------------------------------------------------
   */

  const handleInventoryDragStart = (
    event: React.DragEvent,
    index: number,
  ) => {
    event.dataTransfer.setData(
      'application/x-inventory',
      JSON.stringify({
        type: 'inventory',
        index,
      }),
    )

    event.dataTransfer.effectAllowed = 'move'
  }

  const handleToolbarDragStart = (
    event: React.DragEvent,
    index: number,
  ) => {
    event.dataTransfer.setData(
      'application/x-inventory',
      JSON.stringify({
        type: 'toolbar',
        index,
      }),
    )

    event.dataTransfer.effectAllowed = 'move'
  }

  const readDragData = (event: React.DragEvent) => {
    try {
      return JSON.parse(
        event.dataTransfer.getData('application/x-inventory'),
      ) as {
        type: 'inventory' | 'toolbar'
        index: number
      }
    } catch {
      return null
    }
  }

  /*
   * ---------------------------------------------------------
   * Harvest event
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleFarmHarvest = (event: Event) => {
      const customEvent = event as CustomEvent
      const crop = customEvent.detail?.crop

      if (
        crop &&
        typeof crop.harvestCoins === 'number'
      ) {
        setCoins(
          (prevCoins) =>
            prevCoins + crop.harvestCoins,
        )
      }
    }

    window.addEventListener(
      'farm-harvest',
      handleFarmHarvest,
    )

    return () => {
      window.removeEventListener(
        'farm-harvest',
        handleFarmHarvest,
      )
    }
  }, [])
  
  useEffect(() => {
  const handleFishingCatch = (event: Event) => {
    const customEvent = event as CustomEvent
    const coins = customEvent.detail?.coins

    if (typeof coins !== 'number') {
      return
    }

    setCoins((prevCoins) => prevCoins + coins)
  }

  window.addEventListener(
    'fishing-catch',
    handleFishingCatch,
  )

  return () => {
    window.removeEventListener(
      'fishing-catch',
      handleFishingCatch,
    )
  }
}, [])
  /*
   * ---------------------------------------------------------
   * Reset inventory
   * ---------------------------------------------------------
   *
   * Không bắt buộc dùng.
   * Giữ lại để debug khi cần.
   */

  const resetInventory = () => {
    setInventory([...DEFAULT_INVENTORY])
    setToolbar([...DEFAULT_TOOLBAR])
    selectTool('watering-can')
  }

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <section
      className="game-page"
      aria-label="Pixel Farm game"
    >
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
        completedIds={[1]}
      />

      {/* =====================================================
          INVENTORY POPUP
          ===================================================== */}

      {inventoryOpen && (
        <div className="inventory-panel">
          <div className="inventory-header">
            <div>
              <strong>KHO ĐỒ</strong>
              <span>
                Kéo thả vật phẩm để sắp xếp
              </span>
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
            {Array.from(
              { length: INVENTORY_SIZE },
              (_, index) => {
                const item = inventory[index]

                return (
                  <div
                    key={index}
                    className={`inventory-slot${
                      item ? ' inventory-slot-filled' : ''
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(event) => {
                      event.preventDefault()

                      const data = readDragData(event)

                      if (!data) return

                      if (data.type === 'inventory') {
                        moveInventoryItem(
                          data.index,
                          index,
                        )
                      }

                      if (data.type === 'toolbar') {
                        moveToolbarToInventory(
                          data.index,
                          index,
                        )
                      }
                    }}
                  >
                    {item && (
                      <div
                        className="inventory-item"
                        draggable
                        onDragStart={(event) =>
                          handleInventoryDragStart(
                            event,
                            index,
                          )
                        }
                        title={item.label}
                      >
                        <img
                          src={item.icon}
                          alt={item.label}
                          draggable={false}
                        />

                        {item.stackable && (
                          <span className="item-quantity">
                            {item.quantity}
                          </span>
                        )}
                      </div>
                    )}

                    <small className="inventory-slot-number">
                      {index + 1}
                    </small>
                  </div>
                )
              },
            )}
          </div>

          <div className="inventory-hint">
            💡 Kéo vật phẩm vào thanh công cụ để truy cập nhanh
          </div>

          {/* Chỉ để debug trong quá trình phát triển */}
          <button
            type="button"
            className="inventory-reset"
            onClick={resetInventory}
          >
            Reset kho đồ
          </button>
        </div>
      )}

      {/* =====================================================
          BOTTOM TOOLBAR
          ===================================================== */}

      <div
        className="game-toolbar"
        role="toolbar"
        aria-label="Công cụ nông trại"
      >
        {/* Inventory button */}
        <button
          type="button"
          className={`toolbar-menu${
            inventoryOpen
              ? ' toolbar-menu-active'
              : ''
          }`}
          aria-label="Kho đồ"
          aria-expanded={inventoryOpen}
          onClick={() =>
            setInventoryOpen((prev) => !prev)
          }
        >
          •••
        </button>

        {toolbar.map((tool, toolbarIndex) => {

          return (
            <button
              key={`${toolbarIndex}-${tool?.id ?? 'empty'}`}
              id={
  tool
    ? `tool-${tool.id}`
    : `tool-empty-${toolbarIndex}`
}
              type="button"
              className={`toolbar-tool${
  tool?.id === selectedTool
                  ? ' tool-selected'
                  : ''
              }${
                !tool
                  ? ' toolbar-empty'
                  : ''
              }`}
              aria-label={
                tool?.label ?? 'Ô trống'
              }
              aria-pressed={
                tool?.id === selectedTool
              }
              draggable={Boolean(tool)}
              onClick={() => {
  if (tool) {
    selectTool(tool.id)
  }
}}
              onDragStart={(event) => {
                if (tool) {
                  handleToolbarDragStart(
                    event,
                    toolbarIndex,
                  )
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
    moveInventoryToToolbar(
      data.index,
      toolbarIndex,
    )
  }

  if (data.type === 'toolbar') {
    setToolbar((prev) => {
      const next = [...prev]

      const temp = next[data.index]

      next[data.index] =
        next[toolbarIndex]

      next[toolbarIndex] = temp

      return next
    })
  }
}}
            >
              <small>
                {TOOL_KEYS[toolbarIndex]}
              </small>

              {tool ? (
  <>
    <img
      src={tool.icon}
      alt={tool.label}
      className="tool-icon"
      draggable={false}
    />

    <span>{tool.label}</span>
  </>
) : (
                <span className="toolbar-empty-label">
                  TRỐNG
                </span>
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
    </section>
  )
}