import dotenv from 'dotenv'
import { Wallet } from 'ethers'
import path from 'path'

dotenv.config()

const SIGNER_PRIVATE_KEY =
  process.env.SIGNER_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

let signerAddress = ''
try {
  const signerWallet = new Wallet(SIGNER_PRIVATE_KEY)
  signerAddress = signerWallet.address
} catch (err) {
  console.error('Invalid SIGNER_PRIVATE_KEY in environment:', err)
}

export const CONFIG = {
  PORT: Number(process.env.PORT) || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'pixel2d_gamefi_jwt_super_secret_dev_key_2026',
  SIGNER_PRIVATE_KEY,
  SIGNER_ADDRESS: signerAddress,
  CLAIM_CAP: Number(process.env.CLAIM_CAP) || 100,
  CLAIM_COOLDOWN_SECONDS: Number(process.env.CLAIM_COOLDOWN_SECONDS) || 300,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE_PATH: process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'data', 'pixel_farm.db'),
}
