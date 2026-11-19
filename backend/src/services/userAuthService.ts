import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { CONFIG } from '../config/index.js'
import { UserModel, GameStateModel } from '../db/models.js'
import { DEFAULT_INITIAL_INVENTORY, DEFAULT_INITIAL_TOOLBAR } from '../db/database.js'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + CONFIG.JWT_SECRET).digest('hex')
}

/**
 * Đăng ký tài khoản truyền thống (Username + Password) và liên kết ví nếu có
 */
export async function registerTraditionalUser(username: string, password: string, walletAddress?: string) {
  const cleanUsername = String(username).trim()
  if (cleanUsername.length < 3) {
    const err: any = new Error('Tên đăng nhập phải có ít nhất 3 ký tự')
    err.status = 400
    throw err
  }

  const passwordHash = hashPassword(password)
  const normalizedAddr = walletAddress ? String(walletAddress).toLowerCase().trim() : null

  // 1. Kiểm tra username đã tồn tại chưa
  const existingUser = await UserModel.findOne({ username: cleanUsername })
  if (existingUser) {
    const err: any = new Error('Tên đăng nhập này đã được sử dụng! Vui lòng chọn tên khác.')
    err.status = 409
    throw err
  }

  let finalWallet = normalizedAddr

  // 2. Nếu có ví gửi lên, kiểm tra xem ví đã tồn tại chưa
  if (finalWallet) {
    const existingWalletUser = await UserModel.findOne({ wallet_address: finalWallet })
    if (existingWalletUser) {
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

        return {
          token,
          user: {
            id: existingWalletUser.id,
            username: cleanUsername,
            wallet_address: finalWallet,
            address: finalWallet,
          },
        }
      } else {
        const err: any = new Error('Địa chỉ ví này đã được liên kết với một tài khoản khác!')
        err.status = 409
        throw err
      }
    }
  } else {
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

  // 4. Khởi tạo GameState an toàn
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

  return {
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      wallet_address: finalWallet,
      address: finalWallet,
    },
  }
}

/**
 * Đăng nhập truyền thống bằng Username & Password
 */
export async function loginTraditionalUser(username: string, password: string) {
  const cleanUsername = String(username).trim()
  const passwordHash = hashPassword(password)

  const user = await UserModel.findOne({ username: cleanUsername, password_hash: passwordHash })
  if (!user) {
    const err: any = new Error('Tên đăng nhập hoặc mật khẩu không chính xác')
    err.status = 401
    throw err
  }

  user.last_login = new Date()
  await user.save()

  const addr = user.wallet_address || ''

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

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      wallet_address: addr,
      address: addr,
    },
  }
}

/**
 * Lấy thông tin hồ sơ người dùng hiện tại
 */
export async function getUserProfile(address: string) {
  const user = await UserModel.findOne({ wallet_address: address.toLowerCase() })
  if (!user) {
    const err: any = new Error('Không tìm thấy thông tin người dùng')
    err.status = 404
    throw err
  }

  return {
    id: user.id,
    username: user.username,
    wallet_address: user.wallet_address,
    address: user.wallet_address,
    created_at: user.created_at,
    last_login: user.last_login,
  }
}
