import { Router, Response } from 'express'
import { ShopItemModel, GameStateModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest, InventorySlot } from '../types/index.js'

export const shopRouter = Router()

// Crop / Fish selling price table
export const CROP_SELL_PRICES: Record<string, number> = {
  corn: 15,
  rice: 18,
  strawberry: 25,
  pumpkin: 40,
  watermelon: 50,
  carp: 35,
  goldfish: 60,
  bass: 45,
  salmon: 50,
}

// 1. GET Active Shop Items
shopRouter.get('/items', async (_req, res) => {
  try {
    const items = await ShopItemModel.find({ is_active: 1 }).sort({ price_coins: 1 })
    res.json({ success: true, items })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST Buy Item with In-Game Coin
shopRouter.post('/buy', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const { itemId, bundleCount = 1 } = req.body

  if (!address || !itemId) {
    return res.status(400).json({ success: false, error: 'Thiếu address hoặc itemId' })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    const shopItem = await ShopItemModel.findOne({ id: itemId, is_active: 1 })
    if (!shopItem) {
      return res.status(404).json({ success: false, error: 'Vật phẩm không tồn tại trong cửa hàng' })
    }

    const totalCost = shopItem.price_coins * bundleCount
    const totalItemQty = shopItem.bundle_qty * bundleCount

    // Retrieve current game state
    const gameState = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!gameState) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu nông trại của người chơi' })
    }

    if (gameState.coins < totalCost) {
      return res.status(400).json({
        success: false,
        error: `Số dư Coin không đủ! Cần ${totalCost} Coins nhưng chỉ có ${gameState.coins} Coins.`,
      })
    }

    const toolbar: (InventorySlot | null)[] = [...gameState.toolbar]
    const inventory: (InventorySlot | null)[] = [...gameState.inventory]

    // Helper to add item with stacking
    let placed = false
    const newItem: InventorySlot = {
      id: shopItem.id,
      name: shopItem.name,
      category: shopItem.category,
      icon: shopItem.image_url,
      quantity: totalItemQty,
      stackable: shopItem.type === 'seed' || shopItem.type === 'fertilizer',
    }

    // A. Check stack in toolbar
    if (newItem.stackable) {
      const tbIdx = toolbar.findIndex((slot) => slot && slot.id === newItem.id)
      if (tbIdx !== -1 && toolbar[tbIdx]) {
        toolbar[tbIdx] = {
          ...toolbar[tbIdx]!,
          quantity: toolbar[tbIdx]!.quantity + newItem.quantity,
        }
        placed = true
      }
    }

    // B. Check stack in inventory
    if (!placed && newItem.stackable) {
      const invIdx = inventory.findIndex((slot) => slot && slot.id === newItem.id)
      if (invIdx !== -1 && inventory[invIdx]) {
        inventory[invIdx] = {
          ...inventory[invIdx]!,
          quantity: inventory[invIdx]!.quantity + newItem.quantity,
        }
        placed = true
      }
    }

    // C. Find empty toolbar slot
    if (!placed) {
      const emptyTbIdx = toolbar.findIndex((slot) => slot === null)
      if (emptyTbIdx !== -1) {
        toolbar[emptyTbIdx] = newItem
        placed = true
      }
    }

    // D. Find empty inventory slot
    if (!placed) {
      const emptyInvIdx = inventory.findIndex((slot) => slot === null)
      if (emptyInvIdx !== -1) {
        inventory[emptyInvIdx] = newItem
        placed = true
      }
    }

    if (!placed) {
      return res.status(400).json({ success: false, error: 'Kho đồ và Toolbar đã đầy! Vui lòng dọn chỗ trống trước.' })
    }

    gameState.coins -= totalCost
    gameState.toolbar = toolbar
    gameState.inventory = inventory
    gameState.updated_at = new Date()
    await gameState.save()

    res.json({
      success: true,
      message: `Mua thành công ${totalItemQty}x ${shopItem.name}!`,
      remainingCoins: gameState.coins,
      purchasedItem: newItem,
      toolbar: gameState.toolbar,
      inventory: gameState.inventory,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 3. POST Sell Crop/Fish Item for In-Game Coins
shopRouter.post('/sell', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const { itemId, quantity = 1 } = req.body

  if (!address || !itemId || quantity <= 0) {
    return res.status(400).json({ success: false, error: 'Thiếu address, itemId hoặc số lượng hợp lệ' })
  }

  const normalizedAddr = address.toLowerCase()
  const pricePerUnit = CROP_SELL_PRICES[itemId] || 10

  try {
    const gameState = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!gameState) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu nông trại' })
    }

    const inventory: (InventorySlot | null)[] = [...gameState.inventory]
    const toolbar: (InventorySlot | null)[] = [...gameState.toolbar]

    let remainingToRemove = quantity
    let totalEarned = 0

    // Remove from inventory
    for (let i = 0; i < inventory.length; i++) {
      if (remainingToRemove <= 0) break
      const slot = inventory[i]
      if (slot && slot.id === itemId) {
        const canTake = Math.min(slot.quantity, remainingToRemove)
        slot.quantity -= canTake
        remainingToRemove -= canTake
        totalEarned += canTake * pricePerUnit
        if (slot.quantity <= 0) {
          inventory[i] = null
        }
      }
    }

    // Remove from toolbar if needed
    for (let i = 0; i < toolbar.length; i++) {
      if (remainingToRemove <= 0) break
      const slot = toolbar[i]
      if (slot && slot.id === itemId) {
        const canTake = Math.min(slot.quantity, remainingToRemove)
        slot.quantity -= canTake
        remainingToRemove -= canTake
        totalEarned += canTake * pricePerUnit
        if (slot.quantity <= 0) {
          toolbar[i] = null
        }
      }
    }

    if (totalEarned <= 0) {
      return res.status(400).json({ success: false, error: 'Bạn không có vật phẩm này trong kho để bán!' })
    }

    gameState.coins += totalEarned
    gameState.inventory = inventory
    gameState.toolbar = toolbar
    gameState.updated_at = new Date()
    await gameState.save()

    res.json({
      success: true,
      message: `Bán thành công! Nhận được +${totalEarned} Coins.`,
      coinsEarned: totalEarned,
      newCoinBalance: gameState.coins,
      inventory: gameState.inventory,
      toolbar: gameState.toolbar,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
