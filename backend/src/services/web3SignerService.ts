import { Wallet } from 'ethers'
import { CONFIG } from '../config/index.js'
import { ClaimModel, GameStateModel, TransactionModel } from '../db/models.js'
import { EXCHANGE_PACKAGES } from '../constants/exchangePackages.js'

export const signerWallet = new Wallet(CONFIG.SIGNER_PRIVATE_KEY)

export interface ClaimStatusResult {
  rateText: string
  ratio: number
  cap: number
  cooldownSeconds: number
  canClaim: boolean
  remainingCooldownSeconds: number
  currentCoins: number
  signerAddress: string
  contractAddress: string
  vaultAddress: string
  chainId: number
  packages: typeof EXCHANGE_PACKAGES
}

export interface ClaimSignatureResult {
  player: string
  coinAmount: number
  pixelAmount: number
  nonce: number
  deadline: number
  signature: string
  signerAddress: string
  verifyingContract: string
  chainId: number
  remainingCoins: number
}

/**
 * Kiểm tra trạng thái rút token và thời gian hồi (cooldown) của người chơi
 */
export async function getPlayerClaimStatus(address: string): Promise<ClaimStatusResult> {
  const normalizedAddr = address.toLowerCase()
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

  return {
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
  }
}

/**
 * Tạo chữ ký số EIP-712 Typed Data cho giao dịch rút $PIXEL token on-chain
 */
export async function generateClaimRewardSignature(
  address: string,
  rawCoinAmount: number,
): Promise<ClaimSignatureResult> {
  const normalizedAddr = address.toLowerCase()

  // 1. Kiểm tra thời gian hồi (Cooldown) trước
  const lastClaim = await ClaimModel.findOne({ wallet_address: normalizedAddr }).sort({ created_at: -1 })
  if (lastClaim && lastClaim.created_at) {
    const claimTime = lastClaim.created_at.getTime()
    const now = Date.now()
    const elapsedSeconds = Math.floor((now - claimTime) / 1000)

    if (elapsedSeconds < CONFIG.CLAIM_COOLDOWN_SECONDS) {
      const waitTime = CONFIG.CLAIM_COOLDOWN_SECONDS - elapsedSeconds
      const err: any = new Error(`Thời gian hồi chưa kết thúc! Vui lòng chờ ${waitTime} giây để tiếp tục rút.`)
      err.status = 429
      err.remainingSeconds = waitTime
      throw err
    }
  }

  // 2. Kiểm tra số lượng tối thiểu (1,000 coins = 10 $PIXEL)
  if (rawCoinAmount < 1000) {
    throw new Error('Số lượng quy đổi tối thiểu là 1,000 Coins (Tương đương 10 $PIXEL). Tỷ lệ: 1,000 Coins = 10 $PIXEL.')
  }

  // 3. Tính số lượng $PIXEL on-chain (100 coins = 1 $PIXEL)
  const pixelAmount = Math.floor(rawCoinAmount / 100)
  const actualCoinsDeducted = pixelAmount * 100

  // 4. Kiểm tra trần rút tối đa
  if (pixelAmount > CONFIG.CLAIM_CAP) {
    throw new Error(`Vượt quá giới hạn rút tối đa (${CONFIG.CLAIM_CAP} $PIXEL ~ ${CONFIG.CLAIM_CAP * 100} Coins mỗi lần)`)
  }

  // 5. Kiểm tra số dư Coin trong game
  const state = await GameStateModel.findOne({ wallet_address: normalizedAddr })
  if (!state || state.coins < actualCoinsDeducted) {
    const available = state ? state.coins : 0
    throw new Error(`Số dư In-Game Coin không đủ! Hiện có ${available} Coins, cần ${actualCoinsDeducted} Coins.`)
  }

  // 6. Tạo nonce duy nhất và deadline (hết hạn sau 1 giờ)
  const nonce = Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000)
  const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour

  // 7. Ký thông điệp chuẩn EIP-712 với Domain Separation
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
    amount: pixelAmount,
    nonce,
    deadline,
  }

  const signature = await signerWallet.signTypedData(domain, types, value)

  // 8. Khóa/trừ coin trong DB và lưu bản ghi claim pending
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

  return {
    player: normalizedAddr,
    coinAmount: actualCoinsDeducted,
    pixelAmount,
    nonce,
    deadline,
    signature,
    signerAddress: signerWallet.address,
    verifyingContract: CONFIG.CONTRACT_ADDRESS,
    chainId: CONFIG.CHAIN_ID,
    remainingCoins: state.coins,
  }
}
