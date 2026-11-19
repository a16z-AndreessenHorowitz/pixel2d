import { Router, Response } from 'express'
import { EXCHANGE_PACKAGES } from '../constants/exchangePackages.js'
import {
  getPlayerClaimStatus,
  generateClaimRewardSignature,
} from '../services/web3SignerService.js'
import {
  confirmClaimOnChain,
  rollbackPendingClaim,
  verifyDepositOnChain,
} from '../services/transactionService.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export { EXCHANGE_PACKAGES } from '../constants/exchangePackages.js'
export const web3Router = Router()

// 0. GET Exchange Options & Packages
web3Router.get('/exchange-options', (_req, res: Response) => {
  res.json({
    success: true,
    rateText: '1,000 Coins = 10 $PIXEL',
    ratio: 100,
    minCoins: 1000,
    packages: EXCHANGE_PACKAGES,
  })
})

// 1. GET Claim Status & Cooldown
web3Router.get('/claim-status', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu địa chỉ ví' })
  }

  try {
    const status = await getPlayerClaimStatus(address)
    res.json({ success: true, ...status })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST Create Claim Signature (EIP-712 Typed Data Signer)
web3Router.post('/create-claim-signature', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const rawCoinAmount = Number(req.body.coinAmount ?? req.body.amount)

  if (!address || isNaN(rawCoinAmount) || rawCoinAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Địa chỉ ví hoặc số lượng coin không hợp lệ' })
  }

  try {
    const data = await generateClaimRewardSignature(address, rawCoinAmount)
    res.json({
      success: true,
      message: 'Chữ ký EIP-712 rút token đã được tạo thành công',
      data,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({
      success: false,
      error: err.message,
      remainingSeconds: err.remainingSeconds,
    })
  }
})

// 3. POST Confirm On-Chain Claim Completed
web3Router.post('/confirm-claim', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nonce, txHash } = req.body
  if (!nonce || !txHash) {
    return res.status(400).json({ success: false, error: 'Thiếu nonce hoặc txHash' })
  }

  try {
    const result = await confirmClaimOnChain(nonce, txHash)
    res.json({
      success: true,
      message: 'Đã xác nhận và hoàn tất giao dịch rút token on-chain thành công!',
      txHash: result.txHash,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 4. POST Rollback Pending Claim (Khi người chơi hủy giao dịch trên MetaMask)
web3Router.post('/claim-reward-rollback', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nonce, reason } = req.body
  if (!nonce) {
    return res.status(400).json({ success: false, error: 'Thiếu nonce' })
  }

  try {
    const result = await rollbackPendingClaim(nonce, reason)
    res.json({
      success: true,
      message: `Đã hoàn trả ${result.coinAmount} Coins về tài khoản game.`,
      newBalance: result.newBalance,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})

// 5. POST Verify On-Chain Deposit ($PIXEL -> In-Game Coins)
web3Router.post('/verify-deposit', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { txHash, address } = req.body
  if (!txHash || !address) {
    return res.status(400).json({ success: false, error: 'Thiếu txHash hoặc địa chỉ ví người chơi' })
  }

  try {
    const data = await verifyDepositOnChain(txHash, address)
    res.json({
      success: true,
      message: `Đã nạp thành công ${data.depositedPixel} $PIXEL đổi lấy ${data.creditedCoins} Coins vào tài khoản!`,
      data,
    })
  } catch (err: any) {
    const status = err.status || 500
    res.status(status).json({ success: false, error: err.message })
  }
})
