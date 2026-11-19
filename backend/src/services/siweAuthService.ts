import crypto from 'crypto'
import { verifyMessage } from 'ethers'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/index.js'
import { UserModel, GameStateModel, SiweNonceModel } from '../db/models.js'
import { DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'

/**
 * Sinh mã nonce ngẫu nhiên phục vụ cơ chế SIWE (Sign-In With Ethereum)
 */
export async function createSiweNonce(address: string): Promise<string> {
  const nonce = `pixel2d-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const normalizedAddr = address.toLowerCase()

  await SiweNonceModel.findOneAndUpdate(
    { wallet_address: normalizedAddr },
    { nonce, created_at: new Date() },
    { upsert: true, returnDocument: 'after' },
  )

  return nonce
}

/**
 * Xác thực chữ ký ví MetaMask theo chuẩn SIWE và cấp JWT Token
 */
export async function authenticateWalletLogin(address: string, signature: string, message: string) {
  const normalizedAddr = address.toLowerCase()

  const recoveredAddress = verifyMessage(message, signature)
  if (recoveredAddress.toLowerCase() !== normalizedAddr) {
    const err: any = new Error('Chữ ký ví không hợp lệ')
    err.status = 401
    throw err
  }

  // Đảm bảo User tồn tại trong users collection
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

  // Đảm bảo GameState tồn tại trong game_states collection
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

  // Phát hành JWT Token 7 ngày
  const token = jwt.sign(
    { address: normalizedAddr, username: user.username, role: 'player' },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' },
  )

  return {
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
  }
}
