import { Router, Response } from 'express'
import { createSiweNonce, authenticateWalletLogin } from '../services/siweAuthService.js'
import {
  registerTraditionalUser,
  loginTraditionalUser,
  getUserProfile,
} from '../services/userAuthService.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const authRouter = Router()

// 1. GET Nonce for SIWE
authRouter.get('/nonce', async (req, res) => {
  const address = req.query.address as string
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số address' })
  }

  try {
    const nonce = await createSiweNonce(address)
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

  try {
    const result = await authenticateWalletLogin(address, signature, message)
    res.json({
      success: true,
      message: 'Xác thực ví MetaMask thành công!',
      ...result,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 3. POST Traditional Register
authRouter.post('/register', async (req, res) => {
  const { username, password, wallet_address } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập đầy đủ username và password' })
  }

  try {
    const result = await registerTraditionalUser(username, password, wallet_address)
    res.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      ...result,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 4. POST Traditional Login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Cần nhập đầy đủ username và password' })
  }

  try {
    const result = await loginTraditionalUser(username, password)
    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      ...result,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 5. GET Current User Profile
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.user?.address
  if (!address) {
    return res.status(401).json({ success: false, error: 'Chưa xác thực' })
  }

  try {
    const user = await getUserProfile(address)
    res.json({ success: true, user })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})
