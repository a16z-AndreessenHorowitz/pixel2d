import { Router, Response } from 'express'
import crypto from 'crypto'
import { verifyMessage } from 'ethers'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/index.js'
import { UserModel, GameStateModel, SiweNonceModel } from '../db/models.js'
import { DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const authRouter = Router()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + CONFIG.JWT_SECRET).digest('hex')
}

// 1. GET Nonce for SIWE
authRouter.get('/nonce', async (req, res) => {
  const address = req.query.address as string
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số address' })
  }

  const nonce = `pixel2d-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const normalizedAddr = address.toLowerCase()

  try {
    await SiweNonceModel.findOneAndUpdate(
      { wallet_address: normalizedAddr },
      { nonce, created_at: new Date() },
      { upsert: true, returnDocument: 'after' },
    )

    res.json({ success: true, nonce })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST SIWE Login with MetaMask Signature
authRouter.post('/login-wallet', async (req, res) => {
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

    // Ensure User exists in users collection
    let user = await UserModel.findOne({ wallet_address: normalizedAddr })
    if (!user) {
      const count = await UserModel.countDocuments()
      const defaultUsername = `Farmer_${normalizedAddr.slice(2, 8)}`
      user = await UserModel.create({
        id: count + 1,
        username: defaultUsername,
        wallet_address: normalizedAddr,
        created_at: new Date(),
        last_login: new Date(),
      })
    } else {
      user.last_login = new Date()
      await user.save()
    }

    // Ensure GameState exists in game_states collection
    let gameState = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!gameState) {
      gameState = await GameStateModel.create({
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
      })
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
        energy: gameState.energy,
        max_energy: gameState.max_energy,
        level: gameState.level,
        xp: gameState.xp,
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
authRouter.post('/register', async (req, res) => {
  const { username, password, wallet_address } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập username và password' })
  }

  const normalizedAddr = wallet_address ? wallet_address.toLowerCase() : `0x${crypto.randomBytes(20).toString('hex')}`
  const passwordHash = hashPassword(password)

  try {
    const existing = await UserModel.findOne({
      $or: [{ username }, { wallet_address: normalizedAddr }],
    })
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username hoặc Wallet Address đã tồn tại' })
    }

    const count = await UserModel.countDocuments()
    const user = await UserModel.create({
      id: count + 1,
      username,
      password_hash: passwordHash,
      wallet_address: normalizedAddr,
      created_at: new Date(),
      last_login: new Date(),
    })

    // Init game state
    await GameStateModel.create({
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
    })

    const token = jwt.sign(
      { address: normalizedAddr, username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      token,
      user: { id: user.id, username, wallet_address: normalizedAddr },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 4. POST Traditional Login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập username và password' })
  }

  const passwordHash = hashPassword(password)

  try {
    const user = await UserModel.findOne({ username, password_hash: passwordHash })
    if (!user) {
      return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
    }

    user.last_login = new Date()
    await user.save()

    const token = jwt.sign(
      { address: user.wallet_address || '', username: user.username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, wallet_address: user.wallet_address },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 5. GET Current User Profile
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.user?.address
  if (!address) {
    return res.status(401).json({ success: false, error: 'Chưa xác thực' })
  }

  try {
    const user = await UserModel.findOne({ wallet_address: address.toLowerCase() })
    if (!user) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thông tin người dùng' })
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        wallet_address: user.wallet_address,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
