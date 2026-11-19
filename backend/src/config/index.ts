import dotenv from 'dotenv'
import { Wallet } from 'ethers'
import path from 'path'
import fs from 'fs'

// Load .env explicitly from backend directory or project root
const envCandidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '../backend/.env'),
]

for (const p of envCandidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p })
  }
}

// Fallback to Sepolia backend signer (0xFB2355C56053A575158EB618834D5e902B49B7DF)
let rawKey =
  process.env.SIGNER_PRIVATE_KEY ||
  'af13353a31f74c7bfc9908bdf61db407c6718affcc2c5c65a8e52e2d04572ce9'

if (rawKey && !rawKey.startsWith('0x')) {
  rawKey = `0x${rawKey}`
}
const SIGNER_PRIVATE_KEY = rawKey

let signerAddress = ''
try {
  const signerWallet = new Wallet(SIGNER_PRIVATE_KEY)
  signerAddress = signerWallet.address
  console.log(`🔑 [Web3 Config] Backend Signer Address initialized: ${signerAddress}`)
} catch (err) {
  console.error('Invalid SIGNER_PRIVATE_KEY in environment:', err)
}

// Auto-detect deployment record from contracts/deployments/ (prefer Sepolia if deployed)
const sepoliaPaths = [
  path.resolve(process.cwd(), '../contracts/deployments/sepolia.json'),
  path.resolve(process.cwd(), 'contracts/deployments/sepolia.json'),
]
const hasSepoliaDeployment = sepoliaPaths.some((p) => fs.existsSync(p))
const NETWORK_NAME = process.env.NETWORK_NAME || (hasSepoliaDeployment ? 'sepolia' : 'sepolia')
let deployedAddress = process.env.CONTRACT_ADDRESS || '0x8350cac45079a5CA9781e8C8170bA82b54134B2A'
let deployedChainId = Number(process.env.CHAIN_ID) || 11155111

for (const dir of ['../contracts/deployments', 'contracts/deployments']) {
  const deploymentFile = path.resolve(process.cwd(), dir, `${NETWORK_NAME}.json`)
  if (fs.existsSync(deploymentFile)) {
    try {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
      if (deploymentData.contractAddress) {
        deployedAddress = deploymentData.contractAddress
        deployedChainId = Number(deploymentData.chainId)
        break
      }
    } catch {
      // fallback
    }
  }
}

console.log(`🌐 [Web3 Config] Network: ${NETWORK_NAME} | ChainId: ${deployedChainId} | Contract: ${deployedAddress}`)

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
}
