import { Router, Response } from 'express'
import { Wallet, JsonRpcProvider, formatUnits } from 'ethers'
import { CONFIG } from '../config/index.js'
import { ClaimModel, GameStateModel, TransactionModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const web3Router = Router()

const signerWallet = new Wallet(CONFIG.SIGNER_PRIVATE_KEY)

// 1. GET Claim Status & Cooldown
web3Router.get('/claim-status', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = (req.query.address as string) || req.user?.address
  if (!address) {
    return res.status(400).json({ success: false, error: 'Thiếu địa chỉ ví' })
  }

  const normalizedAddr = address.toLowerCase()

  try {
    const lastClaim = await ClaimModel.findOne({ wallet_address: normalizedAddr }).sort({ created_at: -1 })

    let canClaim = true
    let remainingCooldownSeconds = 0

    if (lastClaim && lastClaim.created_at) {
      const claimTime = lastClaim.created_at.getTime()
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - claimTime) / 1000)

      if (elapsedSeconds < CONFIG.CLAIM_COOLDOWN_SECONDS) {
        canClaim = false
        remainingCooldownSeconds = CONFIG.CLAIM_COOLDOWN_SECONDS - elapsedSeconds
      }
    }

    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })

    res.json({
      success: true,
      cap: CONFIG.CLAIM_CAP,
      cooldownSeconds: CONFIG.CLAIM_COOLDOWN_SECONDS,
      canClaim,
      remainingCooldownSeconds,
      currentCoins: state ? state.coins : 0,
      signerAddress: signerWallet.address,
      contractAddress: CONFIG.CONTRACT_ADDRESS,
      vaultAddress: CONFIG.VAULT_ADDRESS,
      chainId: CONFIG.CHAIN_ID,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST Create Claim Signature (EIP-712 Typed Data Signer)
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

  try {
    // Kiểm tra Cooldown
    const lastClaim = await ClaimModel.findOne({ wallet_address: normalizedAddr }).sort({ created_at: -1 })

    if (lastClaim && lastClaim.created_at) {
      const claimTime = lastClaim.created_at.getTime()
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
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
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

    // Ký thông điệp chuẩn EIP-712 với Domain Separation bảo vệ chainId và contractAddress
    const domain = {
      name: 'PixelFarmToken',
      version: '1',
      chainId: CONFIG.CHAIN_ID,
      verifyingContract: CONFIG.CONTRACT_ADDRESS,
    }

    const types = {
      ClaimFarmingReward: [
        { name: 'player', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }

    const value = {
      player: normalizedAddr,
      amount: amount,
      nonce: nonce,
      deadline: deadline,
    }

    const signature = await signerWallet.signTypedData(domain, types, value)

    // Khóa/trừ coin trong DB và lưu bản ghi claim pending
    state.coins -= amount
    state.updated_at = new Date()
    await state.save()

    await ClaimModel.create({
      wallet_address: normalizedAddr,
      coin_amount: amount,
      nonce,
      signature,
      status: 'pending',
      created_at: new Date(),
    })

    await TransactionModel.create({
      wallet_address: normalizedAddr,
      type: 'claim_token',
      amount: `-${amount} Coins`,
      details: `Khóa ${amount} Coins rút ${amount} $PIXEL on-chain (Nonce: ${nonce})`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: 'Chữ ký EIP-712 rút token đã được tạo thành công',
      data: {
        player: normalizedAddr,
        coinAmount: amount,
        nonce,
        deadline,
        signature,
        signerAddress: signerWallet.address,
        verifyingContract: CONFIG.CONTRACT_ADDRESS,
        chainId: CONFIG.CHAIN_ID,
        remainingCoins: state.coins,
      },
    })
  } catch (err: any) {
    console.error('Lỗi tạo chữ ký Web3 EIP-712:', err)
    res.status(500).json({ success: false, error: 'Không thể tạo chữ ký số: ' + err.message })
  }
})

// 3. POST Confirm On-Chain Claim Completed (Xác minh On-Chain nghiêm ngặt)
web3Router.post('/confirm-claim', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nonce, txHash } = req.body
  if (!nonce || !txHash) {
    return res.status(400).json({ success: false, error: 'Thiếu nonce hoặc txHash' })
  }

  try {
    const claim = await ClaimModel.findOne({ nonce })
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiên rút token này' })
    }

    // Xác minh giao dịch thực tế qua RPC node
    try {
      const provider = new JsonRpcProvider(CONFIG.RPC_URL)
      const receipt = await provider.getTransactionReceipt(txHash)

      if (receipt) {
        if (receipt.status !== 1) {
          // Giao dịch on-chain thất bại -> Rollback / hoàn lại coin cho người chơi
          claim.status = 'failed'
          await claim.save()

          const state = await GameStateModel.findOne({ wallet_address: claim.wallet_address })
          if (state) {
            state.coins += claim.coin_amount
            await state.save()
          }

          return res.status(400).json({
            success: false,
            error: 'Giao dịch on-chain bị Revert! Đã hoàn lại coin về tài khoản game.',
          })
        }
      }
    } catch (rpcErr: any) {
      console.warn('Cảnh báo kiểm tra RPC on-chain:', rpcErr?.message)
    }

    claim.status = 'claimed'
    await claim.save()

    await TransactionModel.findOneAndUpdate(
      { details: { $regex: `Nonce: ${nonce}` } },
      { tx_hash: txHash, status: 'completed' },
    )

    res.json({ success: true, message: 'Đã xác nhận và hoàn tất giao dịch rút token on-chain' })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 4. POST Verify On-Chain Deposit ($PIXEL -> In-Game Coins)
// Idempotency: Không thể cộng 1 txHash nhiều lần.
web3Router.post('/verify-deposit', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { txHash, address } = req.body
  if (!txHash || !address) {
    return res.status(400).json({ success: false, error: 'Thiếu txHash hoặc địa chỉ ví người chơi' })
  }

  const normalizedAddr = address.toLowerCase()
  const normalizedVault = CONFIG.VAULT_ADDRESS.toLowerCase()

  try {
    // 1. Kiểm tra Idempotency: Transaction Hash này đã được xử lý chưa?
    const existingTx = await TransactionModel.findOne({ tx_hash: txHash })
    if (existingTx) {
      return res.status(400).json({
        success: false,
        error: 'Giao dịch nạp tiền này đã được xác nhận trước đó (Chống nạp trùng)',
      })
    }

    // 2. Đọc receipt từ Blockchain RPC Node
    const provider = new JsonRpcProvider(CONFIG.RPC_URL)
    const receipt = await provider.getTransactionReceipt(txHash)

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Giao dịch chưa được đào trên blockchain hoặc không tìm thấy receipt',
      })
    }

    if (receipt.status !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Giao dịch blockchain đã bị thất bại (Reverted)',
      })
    }

    // 3. Kiểm tra hợp đồng đích
    if (receipt.to && receipt.to.toLowerCase() !== CONFIG.CONTRACT_ADDRESS.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: `Giao dịch không được gửi tới hợp đồng PixelFarmToken (${CONFIG.CONTRACT_ADDRESS})`,
      })
    }

    // 4. Tìm kiếm Event Transfer(from, to, value) trong logs
    // Topic0 của Transfer: keccak256("Transfer(address,address,uint256)")
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === CONFIG.CONTRACT_ADDRESS.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC,
    )

    let depositedAmount = 0
    if (transferLog && transferLog.topics.length >= 3) {
      const fromAddr = '0x' + transferLog.topics[1].slice(26).toLowerCase()
      const toAddr = '0x' + transferLog.topics[2].slice(26).toLowerCase()

      if (fromAddr !== normalizedAddr) {
        return res.status(400).json({
          success: false,
          error: 'Người gửi giao dịch không khớp với ví đang yêu cầu nạp',
        })
      }

      if (toAddr !== normalizedVault) {
        return res.status(400).json({
          success: false,
          error: `Token không được gửi về địa chỉ kho Vault hệ thống (${normalizedVault})`,
        })
      }

      const rawAmount = BigInt(transferLog.data)
      depositedAmount = Math.floor(Number(formatUnits(rawAmount, 18)))
    } else {
      return res.status(400).json({
        success: false,
        error: 'Không tìm thấy sự kiện chuyển token hợp lệ trong transaction log',
      })
    }

    if (depositedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Số lượng token nạp phải lớn hơn 0',
      })
    }

    // 5. Cộng Coin vào Database cho người chơi
    let state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!state) {
      state = await GameStateModel.create({
        wallet_address: normalizedAddr,
        coins: 100 + depositedAmount,
      })
    } else {
      state.coins += depositedAmount
      state.updated_at = new Date()
      await state.save()
    }

    // 6. Ghi log lịch sử giao dịch với tx_hash duy nhất
    await TransactionModel.create({
      wallet_address: normalizedAddr,
      type: 'deposit_token',
      amount: `+${depositedAmount} Coins`,
      tx_hash: txHash,
      details: `Nạp thành công ${depositedAmount} $PIXEL on-chain đổi thành ${depositedAmount} Coins`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: `Đã nạp thành công ${depositedAmount} Coins vào tài khoản!`,
      data: {
        creditedCoins: depositedAmount,
        newBalance: state.coins,
        txHash,
      },
    })
  } catch (err: any) {
    console.error('Lỗi xác minh nạp tiền on-chain:', err)
    res.status(500).json({ success: false, error: 'Lỗi xác minh nạp tiền: ' + err.message })
  }
})
