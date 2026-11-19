import { Router, Response } from 'express'
import { TransactionModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const transactionsRouter = Router()

// 1. GET Transaction Logs
transactionsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const filter: any = {}
  if (address) {
    filter.wallet_address = address.toLowerCase()
  }

  try {
    const transactions = await TransactionModel.find(filter)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)

    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions.map((t) => ({
        id: t._id.toString(),
        wallet_address: t.wallet_address,
        type: t.type,
        amount: t.amount,
        tx_hash: t.tx_hash,
        details: t.details,
        created_at: t.created_at.toISOString(),
      })),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST Log a New Transaction
transactionsRouter.post('/log', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const { type, amount, txHash, details } = req.body

  if (!address || !type || !amount) {
    return res.status(400).json({ success: false, error: 'Thiếu address, type hoặc amount' })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    const record = await TransactionModel.create({
      wallet_address: normalizedAddr,
      type,
      amount,
      tx_hash: txHash || null,
      details: details || null,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: 'Đã lưu lịch sử giao dịch thành công',
      id: record._id.toString(),
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
