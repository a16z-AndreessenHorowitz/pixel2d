import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import path from 'path'
import * as dotenv from 'dotenv'

// Load .env explicitly from the contracts directory (works from any working directory)
dotenv.config({ path: path.resolve(__dirname, '.env') })

// Normalize Deployer Private Key: ensure 0x prefix if copied bare from MetaMask
let deployerKey =
  process.env.DEPLOYER_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

if (deployerKey && !deployerKey.startsWith('0x')) {
  deployerKey = `0x${deployerKey}`
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      evmVersion: 'cancun',
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: [deployerKey],
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      accounts: [deployerKey],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: [deployerKey],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
  sourcify: {
    enabled: false,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
