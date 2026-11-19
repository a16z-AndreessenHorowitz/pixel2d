import { Router, Response } from 'express'
import { GameStateModel, ClaimModel } from '../db/models.js'
import { DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest, GameState } from '../types/index.js'

export const gameRouter = Router()

// GET Game State by Wallet Address
gameRouter.get('/state', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số address hoặc Bearer token' })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    let doc = await GameStateModel.findOne({ wallet_address: normalizedAddr })

    if (!doc) {
      doc = await GameStateModel.create({
        wallet_address: normalizedAddr,
        coins: 100,
        energy: 100,
        max_energy: 100,
        level: 1,
        xp: 0,
        inventory: DEFAULT_INITIAL_INVENTORY,
        toolbar: DEFAULT_INITIAL_TOOLBAR,
        plots: [],
        quests: [],
        updated_at: new Date(),
      })
    } else {
      // Tự động hoàn trả (Rollback) các phiên rút token bị pending gián đoạn (> 20s) mà chưa xác nhận on-chain
      const pendingClaims = await ClaimModel.find({
        wallet_address: normalizedAddr,
        status: 'pending',
        created_at: { $lt: new Date(Date.now() - 20 * 1000) },
      })

      if (pendingClaims.length > 0) {
        for (const pendingClaim of pendingClaims) {
          pendingClaim.status = 'cancelled'
          await pendingClaim.save()
          doc.coins += pendingClaim.coin_amount
        }
        doc.updated_at = new Date()
        await doc.save()
      }
    }

    const state: GameState = {
      wallet_address: normalizedAddr,
      coins: doc.coins,
      energy: doc.energy ?? 100,
      max_energy: doc.max_energy ?? 100,
      level: doc.level ?? 1,
      xp: doc.xp ?? 0,
      inventory: doc.inventory,
      toolbar: doc.toolbar,
      plots: doc.plots,
      quests: doc.quests,
      updated_at: doc.updated_at.toISOString(),
    }

    res.json({ success: true, state })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST Save / Synchronize Game State
gameRouter.post('/save', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu address hoặc Bearer token' })
  }

  const normalizedAddr = address.toLowerCase()
  const { coins, energy, max_energy, level, xp, inventory, toolbar, plots, quests } = req.body

  try {
    const updateData: any = { updated_at: new Date() }
    if (typeof coins === 'number') updateData.coins = coins
    if (typeof energy === 'number') updateData.energy = energy
    if (typeof max_energy === 'number') updateData.max_energy = max_energy
    if (typeof level === 'number') updateData.level = level
    if (typeof xp === 'number') updateData.xp = xp
    if (Array.isArray(inventory)) updateData.inventory = inventory
    if (Array.isArray(toolbar)) updateData.toolbar = toolbar
    if (Array.isArray(plots)) updateData.plots = plots
    if (Array.isArray(quests)) updateData.quests = quests

    const doc = await GameStateModel.findOneAndUpdate(
      { wallet_address: normalizedAddr },
      { $set: updateData },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )

    res.json({
      success: true,
      message: 'Đã đồng bộ trạng thái game thành công',
      state: {
        wallet_address: normalizedAddr,
        coins: doc.coins,
        energy: doc.energy,
        level: doc.level,
        xp: doc.xp,
        updated_at: doc.updated_at.toISOString(),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
