import { useCallback, useEffect, useState } from 'react'
import { soundEngine } from '../audio/SoundEngine'
import {
  DEFAULT_INVENTORY,
  DEFAULT_TOOLBAR,
  EDIBLE_ITEMS,
  loadInventory,
  saveInventory,
  type InventoryItem,
  type InventoryItemId,
  type InventorySlot,
} from '../game/inventory/inventory'

export type ToolId = InventoryItemId

interface UseInventoryManagerOptions {
  effectiveAddress?: string | null
  energy: number
  maxEnergy: number
  setEnergy: (val: number | ((prev: number) => number)) => void
  setEnergyAlert: (val: { message: string; type: 'error' | 'success' } | null) => void
}

export function useInventoryManager({
  effectiveAddress,
  energy,
  maxEnergy,
  setEnergy,
  setEnergyAlert,
}: UseInventoryManagerOptions) {
  const [selectedTool, setSelectedTool] = useState<ToolId>('watering-can')
  const [selectedInvIndex, setSelectedInvIndex] = useState<number | null>(null)

  const [inventory, setInventory] = useState<InventorySlot[]>(() => {
    return loadInventory(effectiveAddress || undefined).inventory
  })

  const [toolbar, setToolbar] = useState<(InventoryItem | null)[]>(() => {
    return loadInventory(effectiveAddress || undefined).toolbar
  })

  // Đồng bộ kho đồ khi đổi tài khoản ví
  useEffect(() => {
    const timer = setTimeout(() => {
      const loaded = loadInventory(effectiveAddress || undefined)
      setInventory(loaded.inventory)
      setToolbar(loaded.toolbar)
    }, 0)
    return () => clearTimeout(timer)
  }, [effectiveAddress])

  // Tự động lưu kho đồ vào LocalStorage khi có thay đổi
  useEffect(() => {
    saveInventory(inventory, toolbar, effectiveAddress || undefined)
  }, [inventory, toolbar, effectiveAddress])

  // Chọn công cụ và bắn sự kiện sang Phaser
  const selectTool = useCallback((tool: ToolId) => {
    setSelectedTool(tool)
    window.dispatchEvent(
      new CustomEvent('farm-tool-changed', {
        detail: { tool },
      }),
    )
  }, [])

  // Thêm vật phẩm vào túi đồ (Hỗ trợ cộng dồn stackable)
  const addItem = useCallback(
    (item: InventoryItem) => {
      if (item.stackable) {
        // 1. Cố gắng gộp stack vào Toolbar trước
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
    },
    [toolbar, inventory],
  )

  // Tiêu hao 1 hạt giống khi gieo trồng
  const consumeSeed = useCallback(
    (seedId: ToolId): boolean => {
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
            selectTool('watering-can')
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
    },
    [toolbar, inventory, selectTool],
  )

  // Ăn nông sản hoặc cá để hồi phục Năng lượng
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
            selectTool('watering-can')
          }
          return next
        })
      }

      const restored = Math.min(maxEnergy, energy + edible.energy)
      setEnergy(restored)
      soundEngine.playEat()
      setEnergyAlert({
        message: `🍽️ Bạn đã ăn ${slot.label}! Hồi phục +${edible.energy} ⚡ Năng lượng.`,
        type: 'success',
      })
      setTimeout(() => setEnergyAlert(null), 3000)
    },
    [energy, maxEnergy, inventory, toolbar, selectTool, setEnergy, setEnergyAlert],
  )

  // Di chuyển vật phẩm giữa kho đồ và thanh toolbar
  const moveInventoryToToolbar = useCallback(
    (inventoryIndex: number, toolbarIndex: number) => {
      const sourceItem = inventory[inventoryIndex]
      const targetItem = toolbar[toolbarIndex]
      if (!sourceItem) return

      setInventory((prev) => {
        const next = [...prev]
        next[inventoryIndex] = targetItem
        return next
      })

      setToolbar((prev) => {
        const next = [...prev]
        next[toolbarIndex] = sourceItem
        return next
      })

      selectTool(sourceItem.id)
    },
    [inventory, toolbar, selectTool],
  )

  const moveToolbarToInventory = useCallback(
    (toolbarIndex: number, inventoryIndex: number) => {
      const sourceItem = toolbar[toolbarIndex]
      const targetItem = inventory[inventoryIndex]
      if (!sourceItem) return

      setInventory((prev) => {
        const next = [...prev]
        next[inventoryIndex] = sourceItem
        return next
      })

      setToolbar((prev) => {
        const next = [...prev]
        next[toolbarIndex] = targetItem
        return next
      })
    },
    [inventory, toolbar],
  )

  const moveInventoryItem = useCallback(
    (fromIndex: number, toIndex: number) => {
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
    },
    [],
  )

  const resetInventory = useCallback(() => {
    setInventory([...DEFAULT_INVENTORY])
    setToolbar([...DEFAULT_TOOLBAR])
    selectTool('watering-can')
  }, [selectTool])

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

  return {
    inventory,
    setInventory,
    toolbar,
    setToolbar,
    selectedTool,
    setSelectedTool,
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
  }
}
