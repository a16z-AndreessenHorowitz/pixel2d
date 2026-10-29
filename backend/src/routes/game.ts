import { Router, Response } from 'express'
import { db, DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest, GameState } from '../types/index.js'

export const gameRouter = Router()

// GET Game State by Wallet Address
gameRouter.get('/state', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số address hoặc Bearer token' })
  }

  const normalizedAddr = address.toLowerCase()
  let row = db.prepare('SELECT * FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any

  if (!row) {
    // Auto initialize if not exists
    db.prepare(`
      INSERT INTO game_states (wallet_address, coins, inventory_json, toolbar_json, plots_json, quests_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      normalizedAddr,
      100,
      JSON.stringify(DEFAULT_INITIAL_INVENTORY),
      JSON.stringify(DEFAULT_INITIAL_TOOLBAR),
      JSON.stringify([]),
      JSON.stringify([]),
    )

    return res.json({
      success: true,
      state: {
        wallet_address: normalizedAddr,
        coins: 100,
        inventory: DEFAULT_INITIAL_INVENTORY,
        toolbar: DEFAULT_INITIAL_TOOLBAR,
        plots: [],
        quests: [],
      },
    })
  }

  const state: GameState = {
    wallet_address: normalizedAddr,
    coins: row.coins,
    inventory: JSON.parse(row.inventory_json || '[]'),
    toolbar: JSON.parse(row.toolbar_json || '[]'),
    plots: JSON.parse(row.plots_json || '[]'),
    quests: JSON.parse(row.quests_json || '[]'),
    updated_at: row.updated_at,
  }

  res.json({ success: true, state })
})

// POST Save / Synchronize Game State
gameRouter.post('/save', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu address hoặc Bearer token' })
  }

  const normalizedAddr = address.toLowerCase()
  const { coins, inventory, toolbar, plots, quests } = req.body

  const current = db.prepare('SELECT * FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any

  const coinsVal = typeof coins === 'number' ? coins : current ? current.coins : 100
  const invVal = inventory ? JSON.stringify(inventory) : current ? current.inventory_json : JSON.stringify(DEFAULT_INITIAL_INVENTORY)
  const tbVal = toolbar ? JSON.stringify(toolbar) : current ? current.toolbar_json : JSON.stringify(DEFAULT_INITIAL_TOOLBAR)
  const plotsVal = plots ? JSON.stringify(plots) : current ? current.plots_json : JSON.stringify([])
  const questsVal = quests ? JSON.stringify(quests) : current ? current.quests_json : JSON.stringify([])

  db.prepare(`
    INSERT INTO game_states (wallet_address, coins, inventory_json, toolbar_json, plots_json, quests_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(wallet_address) DO UPDATE SET
      coins = excluded.coins,
      inventory_json = excluded.inventory_json,
      toolbar_json = excluded.toolbar_json,
      plots_json = excluded.plots_json,
      quests_json = excluded.quests_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(normalizedAddr, coinsVal, invVal, tbVal, plotsVal, questsVal)

  res.json({
    success: true,
    message: 'Đã đồng bộ trạng thái game thành công',
    state: {
      wallet_address: normalizedAddr,
      coins: coinsVal,
      updated_at: new Date().toISOString(),
    },
  })
})
