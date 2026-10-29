import { Router, Response } from 'express'
import { db } from '../db/database.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest, TransactionRecord } from '../types/index.js'

export const transactionsRouter = Router()

// 1. GET Transaction Logs
transactionsRouter.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  let query = 'SELECT * FROM transactions'
  const params: any[] = []

  if (address) {
    query += ' WHERE wallet_address = ?'
    params.push(address.toLowerCase())
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const transactions = db.prepare(query).all(...params) as TransactionRecord[]
  res.json({ success: true, count: transactions.length, transactions })
})

// 2. POST Log a New Transaction
transactionsRouter.post('/log', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const { type, amount, txHash, details } = req.body

  if (!address || !type || !amount) {
    return res.status(400).json({ success: false, error: 'Thiếu address, type hoặc amount' })
  }

  const normalizedAddr = address.toLowerCase()
  const result = db.prepare(`
    INSERT INTO transactions (wallet_address, type, amount, tx_hash, details, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(normalizedAddr, type, amount, txHash || null, details || null)

  res.json({
    success: true,
    message: 'Đã lưu lịch sử giao dịch thành công',
    id: result.lastInsertRowid,
  })
})
