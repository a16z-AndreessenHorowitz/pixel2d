import { JsonRpcProvider, formatUnits } from 'ethers'
import { CONFIG } from '../config/index.js'
import { ClaimModel, GameStateModel, TransactionModel } from '../db/models.js'

/**
 * Xác nhận giao dịch rút token on-chain đã thành công qua RPC
 */
export async function confirmClaimOnChain(nonce: number, txHash: string) {
  const claim = await ClaimModel.findOne({ nonce })
  if (!claim) {
    const err: any = new Error('Không tìm thấy phiên rút token này')
    err.status = 404
    throw err
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

        const err: any = new Error('Giao dịch on-chain bị Revert! Đã hoàn lại coin về tài khoản game.')
        err.status = 400
        throw err
      }
    }
  } catch (rpcErr: any) {
    if (rpcErr.status === 400) throw rpcErr
    console.warn('Cảnh báo kiểm tra RPC on-chain:', rpcErr?.message)
  }

  claim.status = 'claimed'
  await claim.save()

  await TransactionModel.findOneAndUpdate(
    { details: { $regex: `Nonce: ${nonce}` } },
    { tx_hash: txHash, details: `Đã hoàn tất rút ${claim.pixel_amount || (claim.coin_amount / 100)} $PIXEL on-chain (Tx: ${txHash})` },
  )

  return { success: true, txHash }
}

/**
 * Hoàn trả Coin khi người chơi hủy rút trên ví MetaMask
 */
export async function rollbackPendingClaim(nonce: number, reason?: string) {
  const claim = await ClaimModel.findOne({ nonce, status: 'pending' })
  if (!claim) {
    const err: any = new Error('Không tìm thấy phiên rút pending hợp lệ để rollback')
    err.status = 404
    throw err
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

  return {
    coinAmount: claim.coin_amount,
    newBalance: state ? state.coins : 0,
  }
}

/**
 * Xác minh giao dịch nạp $PIXEL token on-chain vào Vault và cộng Coin game
 */
export async function verifyDepositOnChain(txHash: string, address: string) {
  const normalizedAddr = address.toLowerCase()
  const normalizedVault = CONFIG.VAULT_ADDRESS.toLowerCase()

  // 1. Kiểm tra Idempotency: Transaction Hash này đã được xử lý chưa?
  const existingTx = await TransactionModel.findOne({ tx_hash: txHash })
  if (existingTx) {
    const err: any = new Error('Giao dịch nạp tiền này đã được xác nhận trước đó (Chống nạp trùng)')
    err.status = 400
    throw err
  }

  // 2. Đọc receipt từ Blockchain RPC Node
  const provider = new JsonRpcProvider(CONFIG.RPC_URL)
  const receipt = await provider.getTransactionReceipt(txHash)

  if (!receipt) {
    const err: any = new Error('Giao dịch chưa được đào trên blockchain hoặc không tìm thấy receipt')
    err.status = 404
    throw err
  }

  if (receipt.status !== 1) {
    const err: any = new Error('Giao dịch blockchain đã bị thất bại (Reverted)')
    err.status = 400
    throw err
  }

  // 3. Kiểm tra hợp đồng đích
  if (receipt.to && receipt.to.toLowerCase() !== CONFIG.CONTRACT_ADDRESS.toLowerCase()) {
    const err: any = new Error(`Giao dịch không được gửi tới hợp đồng PixelFarmToken (${CONFIG.CONTRACT_ADDRESS})`)
    err.status = 400
    throw err
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
      const err: any = new Error('Người gửi giao dịch không khớp với ví đang yêu cầu nạp')
      err.status = 400
      throw err
    }

    if (toAddr !== normalizedVault) {
      const err: any = new Error(`Token không được gửi về địa chỉ kho Vault hệ thống (${normalizedVault})`)
      err.status = 400
      throw err
    }

    const rawAmount = BigInt(transferLog.data)
    depositedPixel = Math.floor(Number(formatUnits(rawAmount, 18)))
  } else {
    const err: any = new Error('Không tìm thấy sự kiện chuyển token hợp lệ trong transaction log')
    err.status = 400
    throw err
  }

  if (depositedPixel <= 0) {
    const err: any = new Error('Số lượng token nạp phải lớn hơn 0')
    err.status = 400
    throw err
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

  return {
    depositedPixel,
    creditedCoins,
    newBalance: state.coins,
    txHash,
  }
}
