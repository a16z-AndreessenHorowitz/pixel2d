import { Router, Response } from 'express'
import { getBytes, solidityPackedKeccak256, Wallet } from 'ethers'
import { CONFIG } from '../config/index.js'
import { db } from '../db/database.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const web3Router = Router()

const signerWallet = new Wallet(CONFIG.SIGNER_PRIVATE_KEY)

// 1. GET Claim Status & Cooldown
web3Router.get('/claim-status', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu địa chỉ ví' })
  }

  const normalizedAddr = address.toLowerCase()
  const lastClaim = db.prepare(`
    SELECT * FROM claims 
    WHERE wallet_address = ? 
    ORDER BY id DESC LIMIT 1
  `).get(normalizedAddr) as any

  let canClaim = true
  let remainingCooldownSeconds = 0

  if (lastClaim && lastClaim.created_at) {
    const claimTime = new Date(lastClaim.created_at + 'Z').getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - claimTime) / 1000)

    if (elapsedSeconds < CONFIG.CLAIM_COOLDOWN_SECONDS) {
      canClaim = false
      remainingCooldownSeconds = CONFIG.CLAIM_COOLDOWN_SECONDS - elapsedSeconds
    }
  }

  const state = db.prepare('SELECT coins FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any

  res.json({
    success: true,
    cap: CONFIG.CLAIM_CAP,
    cooldownSeconds: CONFIG.CLAIM_COOLDOWN_SECONDS,
    canClaim,
    remainingCooldownSeconds,
    currentCoins: state ? state.coins : 0,
    signerAddress: signerWallet.address,
  })
})

// 2. POST Create Claim Signature (ECDSA Signer)
web3Router.post('/create-claim-signature', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const amount = Number(req.body.amount)

  if (!address || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Địa chỉ ví hoặc số lượng coin không hợp lệ' })
  }

  const normalizedAddr = address.toLowerCase()

  // Kiểm tra Cap rút
  if (amount > CONFIG.CLAIM_CAP) {
    return res.status(400).json({
      success: false,
      error: `Vượt quá giới hạn rút tối đa (${CONFIG.CLAIM_CAP} Coins mỗi lần)`,
    })
  }

  // Kiểm tra Cooldown
  const lastClaim = db.prepare(`
    SELECT * FROM claims 
    WHERE wallet_address = ? 
    ORDER BY id DESC LIMIT 1
  `).get(normalizedAddr) as any

  if (lastClaim && lastClaim.created_at) {
    const claimTime = new Date(lastClaim.created_at + 'Z').getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - claimTime) / 1000)

    if (elapsedSeconds < CONFIG.CLAIM_COOLDOWN_SECONDS) {
      const waitTime = CONFIG.CLAIM_COOLDOWN_SECONDS - elapsedSeconds
      return res.status(429).json({
        success: false,
        error: `Thời gian hồi chưa kết thúc! Vui lòng chờ ${waitTime} giây để tiếp tục rút.`,
        remainingSeconds: waitTime,
      })
    }
  }

  // Kiểm tra số dư Coin trong game
  const state = db.prepare('SELECT coins FROM game_states WHERE wallet_address = ?').get(normalizedAddr) as any
  if (!state || state.coins < amount) {
    const available = state ? state.coins : 0
    return res.status(400).json({
      success: false,
      error: `Số dư In-Game Coin không đủ! Hiện có ${available} Coins, cần ${amount} Coins.`,
    })
  }

  // Tạo nonce duy nhất và deadline (hết hạn sau 1 giờ)
  const nonce = Math.floor(Date.now() / 1000) * 100 + Math.floor(Math.random() * 100)
  const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour

  try {
    // 1. Hash thông điệp theo chuẩn Solidity keccak256(abi.encodePacked(player, amount, nonce, deadline))
    const messageHash = solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256'],
      [normalizedAddr, amount, nonce, deadline],
    )

    // 2. Ký ECDSA bằng Private Key của Backend Server
    const signature = await signerWallet.signMessage(getBytes(messageHash))

    // 3. Trừ coin trong DB và lưu bản ghi claim
    const remainingCoins = state.coins - amount

    const executeClaim = db.transaction(() => {
      db.prepare(`
        UPDATE game_states 
        SET coins = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE wallet_address = ?
      `).run(remainingCoins, normalizedAddr)

      db.prepare(`
        INSERT INTO claims (wallet_address, coin_amount, nonce, signature, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `).run(normalizedAddr, amount, nonce, signature)

      db.prepare(`
        INSERT INTO transactions (wallet_address, type, amount, details, created_at)
        VALUES (?, 'claim_token', ?, ?, CURRENT_TIMESTAMP)
      `).run(
        normalizedAddr,
        `-${amount} Coins`,
        `Quy đổi ${amount} In-Game Coins lấy ${amount} $PIXEL on-chain (Nonce: ${nonce})`,
      )
    })

    executeClaim()

    res.json({
      success: true,
      message: 'Chữ ký rút token đã được tạo thành công',
      data: {
        player: normalizedAddr,
        coinAmount: amount,
        nonce,
        deadline,
        signature,
        signerAddress: signerWallet.address,
        remainingCoins,
      },
    })
  } catch (err: any) {
    console.error('Lỗi tạo chữ ký Web3:', err)
    res.status(500).json({ success: false, error: 'Không thể tạo chữ ký số: ' + err.message })
  }
})

// 3. POST Confirm On-Chain Claim Completed
web3Router.post('/confirm-claim', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { nonce, txHash } = req.body
  if (!nonce || !txHash) {
    return res.status(400).json({ success: false, error: 'Thiếu nonce hoặc txHash' })
  }

  const result = db.prepare(`
    UPDATE claims 
    SET status = 'claimed' 
    WHERE nonce = ?
  `).run(nonce)

  if (result.changes > 0) {
    db.prepare(`
      UPDATE transactions 
      SET tx_hash = ? 
      WHERE details LIKE ?
    `).run(txHash, `%Nonce: ${nonce}%`)
  }

  res.json({ success: true, message: 'Đã cập nhật trạng thái giao dịch on-chain' })
})
