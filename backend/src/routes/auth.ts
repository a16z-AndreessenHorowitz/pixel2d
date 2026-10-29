import { Router, Response } from 'express'
import crypto from 'crypto'
import { verifyMessage } from 'ethers'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/index.js'
import { db, DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const authRouter = Router()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + CONFIG.JWT_SECRET).digest('hex')
}

// 1. GET Nonce for SIWE
authRouter.get('/nonce', (req, res) => {
  const address = req.query.address as string
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số address' })
  }

  const nonce = `pixel2d-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const normalizedAddr = address.toLowerCase()

  db.prepare(`
    INSERT INTO siwe_nonces (wallet_address, nonce, created_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(wallet_address) DO UPDATE SET nonce = excluded.nonce, created_at = CURRENT_TIMESTAMP
  `).run(normalizedAddr, nonce)

  res.json({ success: true, nonce })
})

// 2. POST SIWE Login with MetaMask Signature
authRouter.post('/login-wallet', (req, res) => {
  const { address, signature, message } = req.body
  if (!address || !signature || !message) {
    return res.status(400).json({ success: false, error: 'Thiếu address, signature hoặc message' })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    const recoveredAddress = verifyMessage(message, signature)
    if (recoveredAddress.toLowerCase() !== normalizedAddr) {
      return res.status(401).json({ success: false, error: 'Chữ ký ví không hợp lệ' })
    }

    // Ensure User exists in users table
    let user = db.prepare('SELECT * FROM users WHERE wallet_address = ?').get(normalizedAddr) as any
    if (!user) {
      const defaultUsername = `Farmer_${normalizedAddr.slice(2, 8)}`
      const result = db.prepare(`
        INSERT INTO users (username, wallet_address, created_at, last_login)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(defaultUsername, normalizedAddr)
      user = { id: result.lastInsertRowid, username: defaultUsername, wallet_address: normalizedAddr }
    } else {
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE wallet_address = ?').run(normalizedAddr)
    }

    // Ensure GameState exists in game_states table
    let gameState = db.prepare('SELECT * FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any
    if (!gameState) {
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
      gameState = {
        wallet_address: normalizedAddr,
        coins: 100,
        inventory: DEFAULT_INITIAL_INVENTORY,
        toolbar: DEFAULT_INITIAL_TOOLBAR,
        plots: [],
        quests: [],
      }
    } else {
      gameState = {
        ...gameState,
        inventory: JSON.parse(gameState.inventory_json || '[]'),
        toolbar: JSON.parse(gameState.toolbar_json || '[]'),
        plots: JSON.parse(gameState.plots_json || '[]'),
        quests: JSON.parse(gameState.quests_json || '[]'),
      }
    }

    // Issue JWT
    const token = jwt.sign(
      { address: normalizedAddr, username: user.username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        wallet_address: normalizedAddr,
      },
      gameState: {
        coins: gameState.coins,
        inventory: gameState.inventory,
        toolbar: gameState.toolbar,
        plots: gameState.plots,
        quests: gameState.quests,
      },
    })
  } catch (err: any) {
    console.error('SIWE Error:', err)
    res.status(500).json({ success: false, error: 'Xác thực chữ ký thất bại: ' + err.message })
  }
})

// 3. POST Traditional Register
authRouter.post('/register', (req, res) => {
  const { username, password, wallet_address } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập username và password' })
  }

  const normalizedAddr = wallet_address ? wallet_address.toLowerCase() : `0x${crypto.randomBytes(20).toString('hex')}`
  const passwordHash = hashPassword(password)

  try {
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, wallet_address, created_at, last_login)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(username, passwordHash, normalizedAddr)

    // Init game state
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

    const token = jwt.sign(
      { address: normalizedAddr, username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      token,
      user: { id: result.lastInsertRowid, username, wallet_address: normalizedAddr },
    })
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'Username hoặc Wallet Address đã tồn tại' })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// 4. POST Traditional Login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập username và password' })
  }

  const passwordHash = hashPassword(password)
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?').get(username, passwordHash) as any

  if (!user) {
    return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id)

  const token = jwt.sign(
    { address: user.wallet_address, username: user.username, role: 'player' },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' },
  )

  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, wallet_address: user.wallet_address },
  })
})

// 5. GET Current User Profile
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = req.user?.address
  const user = db.prepare('SELECT id, username, wallet_address, created_at, last_login FROM users WHERE wallet_address = ?').get(address)
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin người dùng' })
  }
  res.json({ success: true, user })
})
