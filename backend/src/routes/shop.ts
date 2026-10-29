import { Router, Response } from 'express'
import { db } from '../db/database.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest, InventorySlot, ShopItem } from '../types/index.js'

export const shopRouter = Router()

// 1. GET Active Shop Items
shopRouter.get('/items', (_req, res) => {
  const items = db.prepare('SELECT * FROM shop_items WHERE is_active = 1 ORDER BY price_coins ASC').all() as ShopItem[]
  res.json({ success: true, items })
})

// 2. POST Buy Item with In-Game Coin
shopRouter.post('/buy', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const { itemId, bundleCount = 1 } = req.body

  if (!address || !itemId) {
    return res.status(400).json({ success: false, error: 'Thiếu address hoặc itemId' })
  }

  const normalizedAddr = address.toLowerCase()
  const shopItem = db.prepare('SELECT * FROM shop_items WHERE id = ? AND is_active = 1').get(itemId) as ShopItem | undefined

  if (!shopItem) {
    return res.status(404).json({ success: false, error: 'Vật phẩm không tồn tại trong cửa hàng' })
  }

  const totalCost = shopItem.price_coins * bundleCount
  const totalItemQty = shopItem.bundle_qty * bundleCount

  // Retrieve current game state
  const stateRow = db.prepare('SELECT * FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any
  if (!stateRow) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy dữ liệu nông trại của người chơi' })
  }

  if (stateRow.coins < totalCost) {
    return res.status(400).json({
      success: false,
      error: `Số dư Coin không đủ! Cần ${totalCost} Coins nhưng chỉ có ${stateRow.coins} Coins.`,
    })
  }

  let toolbar: (InventorySlot | null)[] = JSON.parse(stateRow.toolbar_json || '[]')
  let inventory: (InventorySlot | null)[] = JSON.parse(stateRow.inventory_json || '[]')

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
    return res.status(400).json({
      success: false,
      error: 'Kho đồ và Toolbar đã đầy! Vui lòng dọn chỗ trống trước khi mua thêm.',
    })
  }

  const nextCoins = stateRow.coins - totalCost

  // Run update in transaction
  const executeBuy = db.transaction(() => {
    db.prepare(`
      UPDATE game_states
      SET coins = ?, toolbar_json = ?, inventory_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE wallet_address = ?
    `).run(nextCoins, JSON.stringify(toolbar), JSON.stringify(inventory), normalizedAddr)

    db.prepare(`
      INSERT INTO transactions (wallet_address, type, amount, details, created_at)
      VALUES (?, 'buy_seed', ?, ?, CURRENT_TIMESTAMP)
    `).run(
      normalizedAddr,
      `-${totalCost} Coins`,
      `Mua ${bundleCount}x gói ${shopItem.name} (${totalItemQty} hạt)`,
    )
  })

  executeBuy()

  res.json({
    success: true,
    message: `Đã mua thành công ${bundleCount}x gói ${shopItem.name}!`,
    coins: nextCoins,
    toolbar,
    inventory,
    purchasedItem: newItem,
  })
})
