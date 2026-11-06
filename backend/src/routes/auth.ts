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

    // Ensure GameState exists in game_states collection (safe upsert)
    const gameState = await GameStateModel.findOneAndUpdate(
      { wallet_address: normalizedAddr },
      {
        $setOnInsert: {
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
          quiz_answered: [],
          updated_at: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )

    // Issue JWT
    const token = jwt.sign(
      { address: normalizedAddr, username: user.username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      message: 'Xác thực ví MetaMask thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        wallet_address: normalizedAddr,
        address: normalizedAddr,
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
    return res.status(400).json({ success: false, error: 'Cần nhập đầy đủ username và password' })
  }

  const cleanUsername = String(username).trim()
  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  }

  const passwordHash = hashPassword(password)
  const normalizedAddr = wallet_address ? String(wallet_address).toLowerCase().trim() : null

  try {
    // 1. Kiểm tra username đã tồn tại chưa
    const existingUser = await UserModel.findOne({ username: cleanUsername })
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Tên đăng nhập này đã được sử dụng! Vui lòng chọn tên khác.' })
    }

    let finalWallet = normalizedAddr

    // 2. Nếu có ví gửi lên, kiểm tra xem ví đã tồn tại chưa
    if (finalWallet) {
      const existingWalletUser = await UserModel.findOne({ wallet_address: finalWallet })
      if (existingWalletUser) {
        // Nếu ví này trước đó chỉ đăng nhập nhanh bằng MetaMask (chưa có password hoặc là Farmer_...)
        // thì nâng cấp tài khoản đó thành username và password mới này!
        if (!existingWalletUser.password_hash || existingWalletUser.username.startsWith('Farmer_')) {
          existingWalletUser.username = cleanUsername
          existingWalletUser.password_hash = passwordHash
          existingWalletUser.last_login = new Date()
          await existingWalletUser.save()

          const token = jwt.sign(
            { address: finalWallet, username: cleanUsername, role: 'player' },
            CONFIG.JWT_SECRET,
            { expiresIn: '7d' },
          )

          return res.json({
            success: true,
            message: 'Đăng ký và liên kết ví thành công!',
            token,
            user: {
              id: existingWalletUser.id,
              username: cleanUsername,
              wallet_address: finalWallet,
              address: finalWallet,
            },
          })
        } else {
          return res.status(409).json({
            success: false,
            error: 'Địa chỉ ví này đã được liên kết với một tài khoản khác!',
          })
        }
      }
    } else {
      // Nếu không có ví, tạo địa chỉ ví ảo nội bộ để định danh dữ liệu GameState
      finalWallet = `0x${crypto.randomBytes(20).toString('hex')}`
    }

    // 3. Tạo tài khoản User mới trong MongoDB
    const count = await UserModel.countDocuments()
    const newUser = await UserModel.create({
      id: count + 1,
      username: cleanUsername,
      password_hash: passwordHash,
      wallet_address: finalWallet,
      created_at: new Date(),
      last_login: new Date(),
    })

    // 4. Khởi tạo GameState an toàn (upsert chống lỗi duplicate)
    await GameStateModel.findOneAndUpdate(
      { wallet_address: finalWallet },
      {
        $setOnInsert: {
          wallet_address: finalWallet,
          coins: 100,
          energy: 100,
          max_energy: 100,
          level: 1,
          xp: 0,
          inventory: DEFAULT_INITIAL_INVENTORY,
          toolbar: DEFAULT_INITIAL_TOOLBAR,
          plots: [],
          quests: [],
          quiz_answered: [],
          updated_at: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )

    const token = jwt.sign(
      { address: finalWallet, username: cleanUsername, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        wallet_address: finalWallet,
        address: finalWallet,
      },
    })
  } catch (err: any) {
    console.error('Lỗi đăng ký user:', err)
    res.status(500).json({ success: false, error: 'Không thể tạo tài khoản: ' + err.message })
  }
})

// 4. POST Traditional Login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập đầy đủ username và password' })
  }

  const cleanUsername = String(username).trim()
  const passwordHash = hashPassword(password)

  try {
    const user = await UserModel.findOne({ username: cleanUsername, password_hash: passwordHash })
    if (!user) {
      return res.status(401).json({ success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác' })
    }

    user.last_login = new Date()
    await user.save()

    const addr = user.wallet_address || ''

    // Đảm bảo GameState tồn tại
    if (addr) {
      await GameStateModel.findOneAndUpdate(
        { wallet_address: addr },
        {
          $setOnInsert: {
            wallet_address: addr,
            coins: 100,
            energy: 100,
            max_energy: 100,
            level: 1,
            xp: 0,
            inventory: DEFAULT_INITIAL_INVENTORY,
            toolbar: DEFAULT_INITIAL_TOOLBAR,
            plots: [],
            quests: [],
            quiz_answered: [],
            updated_at: new Date(),
          },
        },
        { upsert: true },
      )
    }

    const token = jwt.sign(
      { address: addr, username: user.username, role: 'player' },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user.id,
        username: user.username,
        wallet_address: addr,
        address: addr,
      },
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
        address: user.wallet_address,
        created_at: user.created_at,
        last_login: user.last_login,
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})
