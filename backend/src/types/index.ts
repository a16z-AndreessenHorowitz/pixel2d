import { Request } from 'express'

export interface User {
  id: number
  username: string
  password_hash: string | null
  wallet_address: string
  created_at: string
  last_login: string
}

export interface InventorySlot {
  id: string
  name: string
  category: string
  icon: string
  quantity: number
  stackable: boolean
}

export interface GameState {
  wallet_address: string
  coins: number
  inventory: (InventorySlot | null)[]
  toolbar: (InventorySlot | null)[]
  plots?: any[]
  quests?: any[]
  updated_at?: string
}

export interface ShopItem {
  id: string
  name: string
  type: 'seed' | 'tool' | 'fertilizer' | 'special'
  category: string
  description: string
  price_coins: number
  bundle_qty: number
  image_url: string
  is_active: number
}

export interface TransactionRecord {
  id?: number
  wallet_address: string
  type: 'buy_seed' | 'claim_token' | 'faucet' | 'mint_nft' | 'quest_reward' | 'crop_harvest' | 'fishing_catch'
  amount: string
  tx_hash?: string
  details?: string
  created_at?: string
}

export interface ClaimRecord {
  id?: number
  wallet_address: string
  coin_amount: number
  nonce: number
  signature: string
  status: 'pending' | 'claimed' | 'expired'
  created_at?: string
}

export interface JwtPayload {
  address: string
  username?: string
  role?: string
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload
}
