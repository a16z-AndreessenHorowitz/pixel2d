import mongoose, { Schema, Document } from 'mongoose'
import type { InventorySlot } from '../types/index.js'

// 1. User
export interface IUser extends Document {
  id: number
  username: string
  password_hash?: string | null
  wallet_address?: string | null
  created_at: Date
  last_login: Date
}

const UserSchema = new Schema<IUser>({
  id: { type: Number, index: true },
  username: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, default: null },
  wallet_address: { type: String, default: null, index: true, lowercase: true },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now },
})

export const UserModel = mongoose.model<IUser>('User', UserSchema)

// 2. Game State
export interface IGameState extends Document {
  wallet_address: string
  coins: number
  energy: number
  max_energy: number
  level: number
  xp: number
  inventory: (InventorySlot | null)[]
  toolbar: (InventorySlot | null)[]
  plots: any[]
  quests: any[]
  quiz_answered?: number[]
  updated_at: Date
}

const GameStateSchema = new Schema<IGameState>({
  wallet_address: { type: String, required: true, unique: true, index: true, lowercase: true },
  coins: { type: Number, default: 100 },
  energy: { type: Number, default: 100 },
  max_energy: { type: Number, default: 100 },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  inventory: { type: Schema.Types.Mixed, default: [] },
  toolbar: { type: Schema.Types.Mixed, default: [] },
  plots: { type: Schema.Types.Mixed, default: [] },
  quests: { type: Schema.Types.Mixed, default: [] },
  quiz_answered: { type: Schema.Types.Mixed, default: [] },
  updated_at: { type: Date, default: Date.now },
})

export const GameStateModel = mongoose.model<IGameState>('GameState', GameStateSchema)

// 3. Shop Item
export interface IShopItem extends Document {
  id: string
  name: string
  type: string
  category: string
  description: string
  price_coins: number
  bundle_qty: number
  image_url: string
  is_active: number
}

const ShopItemSchema = new Schema<IShopItem>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, default: 'seed' },
  description: { type: String, default: '' },
  price_coins: { type: Number, required: true },
  bundle_qty: { type: Number, default: 5 },
  image_url: { type: String, required: true },
  is_active: { type: Number, default: 1 },
})

export const ShopItemModel = mongoose.model<IShopItem>('ShopItem', ShopItemSchema)

// 4. Claim Record
export interface IClaim extends Document {
  wallet_address: string
  coin_amount: number
  pixel_amount?: number
  nonce: number
  signature: string
  status: string
  created_at: Date
}

const ClaimSchema = new Schema<IClaim>({
  wallet_address: { type: String, required: true, index: true, lowercase: true },
  coin_amount: { type: Number, required: true },
  pixel_amount: { type: Number, default: 0 },
  nonce: { type: Number, required: true, unique: true, index: true },
  signature: { type: String, required: true },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now },
})

export const ClaimModel = mongoose.model<IClaim>('Claim', ClaimSchema)

// 5. Transaction Record
export interface ITransaction extends Document {
  wallet_address: string
  type: string
  amount: string
  tx_hash?: string | null
  details?: string | null
  created_at: Date
}

const TransactionSchema = new Schema<ITransaction>({
  wallet_address: { type: String, required: true, index: true, lowercase: true },
  type: { type: String, required: true },
  amount: { type: String, required: true },
  tx_hash: { type: String, default: null },
  details: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
})

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema)

// 6. SIWE Nonce
export interface ISiweNonce extends Document {
  wallet_address: string
  nonce: string
  created_at: Date
}

const SiweNonceSchema = new Schema<ISiweNonce>({
  wallet_address: { type: String, required: true, unique: true, index: true, lowercase: true },
  nonce: { type: String, required: true },
  created_at: { type: Date, default: Date.now, expires: 600 }, // TTL 10 minutes
})

export const SiweNonceModel = mongoose.model<ISiweNonce>('SiweNonce', SiweNonceSchema)
