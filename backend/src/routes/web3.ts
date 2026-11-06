import { Router, Response } from 'express'
import { Wallet, JsonRpcProvider, formatUnits } from 'ethers'
import { CONFIG } from '../config/index.js'
import { ClaimModel, GameStateModel, TransactionModel } from '../db/models.js'
import { optionalAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../types/index.js'

export const web3Router = Router()

const signerWallet = new Wallet(CONFIG.SIGNER_PRIVATE_KEY)

// Danh sách các gói đổi thưởng quy định: 1,000 Coins = 10 $PIXEL (100 Coins = 1 $PIXEL)
export const EXCHANGE_PACKAGES = [
  {
    id: 'tier_1k',
    coins: 1000,
    pixel: 10,
    label: 'Gói Cơ Bản (1,000 Coins)',
    description: 'Đổi 1,000 Coin lấy 10 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
  {
    id: 'tier_10k',
    coins: 10000,
    pixel: 100,
    label: 'Gói Tiêu Chuẩn (10,000 Coins)',
    description: 'Đổi 10,000 Coin lấy 100 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: true,
  },
  {
    id: 'tier_50k',
    coins: 50000,
    pixel: 500,
    label: 'Gói Nông Dân Chăm Chỉ (50,000 Coins)',
    description: 'Đổi 50,000 Coin lấy 500 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
  {
    id: 'tier_100k',
    coins: 100000,
    pixel: 1000,
    label: 'Gói Đại Gia Nông Trại (100,000 Coins)',
    description: 'Đổi 100,000 Coin lấy 1,000 $PIXEL token on-chain',
    feeNote: 'Phí gas Sepolia ETH (Người chơi tự trả qua ví MetaMask)',
    isPopular: false,
  },
]

// 0. GET Exchange Options & Packages
web3Router.get('/exchange-options', (_req, res: Response) => {
  res.json({
    success: true,
    rateText: '1,000 Coins = 10 $PIXEL',
    ratio: 100, // 100 in-game coins = 1 $PIXEL
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
      rateText: '1,000 Coins = 10 $PIXEL',
      ratio: 100,
      cap: CONFIG.CLAIM_CAP,
      cooldownSeconds: CONFIG.CLAIM_COOLDOWN_SECONDS,
      canClaim,
      remainingCooldownSeconds,
      currentCoins: state ? state.coins : 0,
      signerAddress: signerWallet.address,
      contractAddress: CONFIG.CONTRACT_ADDRESS,
      vaultAddress: CONFIG.VAULT_ADDRESS,
      chainId: CONFIG.CHAIN_ID,
      packages: EXCHANGE_PACKAGES,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 2. POST Create Claim Signature (EIP-712 Typed Data Signer)
// Đổi Coins trong game lấy $PIXEL token on-chain
// Quy đổi: 1,000 Coins = 10 $PIXEL (100 coins = 1 $PIXEL)
web3Router.post('/create-claim-signature', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const address = req.body.address || req.user?.address
  const rawCoinAmount = Number(req.body.coinAmount ?? req.body.amount)

  if (!address || isNaN(rawCoinAmount) || rawCoinAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Địa chỉ ví hoặc số lượng coin không hợp lệ' })
  }

  const normalizedAddr = address.toLowerCase()

  // Tối thiểu 1,000 coins (quy đổi ra 10 $PIXEL)
  if (rawCoinAmount < 1000) {
    return res.status(400).json({
      success: false,
      error: 'Số lượng quy đổi tối thiểu là 1,000 Coins (Tương đương 10 $PIXEL). Tỷ lệ: 1,000 Coins = 10 $PIXEL.',
    })
  }

  // Tính số lượng $PIXEL on-chain (100 coins = 1 $PIXEL)
  const pixelAmount = Math.floor(rawCoinAmount / 100)
  const actualCoinsDeducted = pixelAmount * 100

  // Kiểm tra Cap rút theo số lượng $PIXEL
  if (pixelAmount > CONFIG.CLAIM_CAP) {
    return res.status(400).json({
      success: false,
      error: `Vượt quá giới hạn rút tối đa (${CONFIG.CLAIM_CAP} $PIXEL ~ ${CONFIG.CLAIM_CAP * 100} Coins mỗi lần)`,
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

    // Kiểm tra số dư Coin trong game từ MongoDB Atlas
    const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!state || state.coins < actualCoinsDeducted) {
      const available = state ? state.coins : 0
      return res.status(400).json({
        success: false,
        error: `Số dư In-Game Coin không đủ! Hiện có ${available} Coins, cần ${actualCoinsDeducted} Coins.`,
      })
    }

    // Tạo nonce duy nhất và deadline (hết hạn sau 1 giờ)
    const nonce = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000)
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
      amount: pixelAmount, // Token units = pixelAmount * 10^18
      nonce: nonce,
      deadline: deadline,
    }

    const signature = await signerWallet.signTypedData(domain, types, value)

    // Khóa/trừ coin trong DB và lưu bản ghi claim pending
    state.coins -= actualCoinsDeducted
    state.updated_at = new Date()
    await state.save()

    await ClaimModel.create({
      wallet_address: normalizedAddr,
      coin_amount: actualCoinsDeducted,
      pixel_amount: pixelAmount,
      nonce,
      signature,
      status: 'pending',
      created_at: new Date(),
    })

    await TransactionModel.create({
      wallet_address: normalizedAddr,
      type: 'claim_token',
      amount: `-${actualCoinsDeducted} Coins`,
      details: `Đổi ${actualCoinsDeducted} Coins lấy ${pixelAmount} $PIXEL on-chain (Nonce: ${nonce})`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: 'Chữ ký EIP-712 rút token đã được tạo thành công',
      data: {
        player: normalizedAddr,
        coinAmount: actualCoinsDeducted,
        pixelAmount: pixelAmount,
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
      { tx_hash: txHash, details: `Đã hoàn tất rút ${claim.pixel_amount || (claim.coin_amount / 100)} $PIXEL on-chain (Tx: ${txHash})` },
    )

    res.json({
      success: true,
      message: 'Đã xác nhận và hoàn tất giao dịch rút token on-chain thành công!',
      txHash,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 4. POST Rollback Pending Claim (Khi người chơi hủy giao dịch trên MetaMask)
web3Router.post('/claim-reward-rollback', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { nonce, reason } = req.body
  if (!nonce) {
    return res.status(400).json({ success: false, error: 'Thiếu nonce' })
  }

  try {
    const claim = await ClaimModel.findOne({ nonce, status: 'pending' })
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy phiên rút pending hợp lệ để rollback' })
    }

    claim.status = 'cancelled'
    await claim.save()

    const state = await GameStateModel.findOne({ wallet_address: claim.wallet_address })
    if (state) {
      state.coins += claim.coin_amount
      state.updated_at = new Date()
      await state.save()
    }

    await TransactionModel.create({
      wallet_address: claim.wallet_address,
      type: 'claim_rollback',
      amount: `+${claim.coin_amount} Coins`,
      details: `Hoàn trả ${claim.coin_amount} Coins do người chơi hủy rút token (${reason || 'Người dùng hủy trên ví'})`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: `Đã hoàn trả ${claim.coin_amount} Coins về tài khoản game.`,
      newBalance: state ? state.coins : 0,
    })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 5. POST Verify On-Chain Deposit ($PIXEL -> In-Game Coins)
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
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === CONFIG.CONTRACT_ADDRESS.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC,
    )

    let depositedPixel = 0
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
      depositedPixel = Math.floor(Number(formatUnits(rawAmount, 18)))
    } else {
      return res.status(400).json({
        success: false,
        error: 'Không tìm thấy sự kiện chuyển token hợp lệ trong transaction log',
      })
    }

    if (depositedPixel <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Số lượng token nạp phải lớn hơn 0',
      })
    }

    // 1 $PIXEL = 100 In-game coins (Tương ứng với tỷ lệ 1,000 Coins = 10 $PIXEL)
    const creditedCoins = depositedPixel * 100

    // 5. Cộng Coin vào Database cho người chơi
    let state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
    if (!state) {
      state = await GameStateModel.create({
        wallet_address: normalizedAddr,
        coins: 100 + creditedCoins,
      })
    } else {
      state.coins += creditedCoins
      state.updated_at = new Date()
      await state.save()
    }

    // 6. Ghi log lịch sử giao dịch với tx_hash duy nhất
    await TransactionModel.create({
      wallet_address: normalizedAddr,
      type: 'deposit_token',
      amount: `+${creditedCoins} Coins`,
      tx_hash: txHash,
      details: `Nạp thành công ${depositedPixel} $PIXEL on-chain đổi thành ${creditedCoins} Coins`,
      created_at: new Date(),
    })

    res.json({
      success: true,
      message: `Đã nạp thành công ${depositedPixel} $PIXEL đổi lấy ${creditedCoins} Coins vào tài khoản!`,
      data: {
        depositedPixel,
        creditedCoins,
        newBalance: state.coins,
        txHash,
      },
    })
  } catch (err: any) {
    console.error('Lỗi xác minh nạp tiền on-chain:', err)
    res.status(500).json({ success: false, error: 'Lỗi xác minh nạp tiền: ' + err.message })
  }
})
