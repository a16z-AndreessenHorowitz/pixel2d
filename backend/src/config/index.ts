import dotenv from 'dotenv'
import { Wallet } from 'ethers'
import path from 'path'
import fs from 'fs'

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

// Auto-detect deployment record from contracts/deployments/
const NETWORK_NAME = process.env.NETWORK_NAME || 'localhost'
let deployedAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
let deployedChainId = Number(process.env.CHAIN_ID) || 31337

try {
  const deploymentFile = path.resolve(process.cwd(), `../contracts/deployments/${NETWORK_NAME}.json`)
  if (fs.existsSync(deploymentFile)) {
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
    if (deploymentData.contractAddress) {
      deployedAddress = deploymentData.contractAddress
      deployedChainId = Number(deploymentData.chainId)
    }
  }
} catch {
  // fallback to defaults
}

export const CONFIG = {
  PORT: Number(process.env.PORT) || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'pixel2d_gamefi_jwt_super_secret_dev_key_2026',
  SIGNER_PRIVATE_KEY,
  SIGNER_ADDRESS: signerAddress,
  VAULT_ADDRESS: process.env.VAULT_ADDRESS || signerAddress,
  CONTRACT_ADDRESS: deployedAddress,
  CHAIN_ID: deployedChainId,
  RPC_URL: process.env.RPC_URL || 'http://127.0.0.1:8545',
  CLAIM_CAP: Number(process.env.CLAIM_CAP) || 100,
  CLAIM_COOLDOWN_SECONDS: Number(process.env.CLAIM_COOLDOWN_SECONDS) || 300,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixel2d',
  DATABASE_PATH: process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve(process.cwd(), 'data', 'pixel_farm.db'),
}
