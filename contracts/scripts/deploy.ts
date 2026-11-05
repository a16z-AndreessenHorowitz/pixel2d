import { ethers, network, artifacts } from 'hardhat'
import fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function main() {
  const currentNetwork = await ethers.provider.getNetwork()
  const chainId = Number(currentNetwork.chainId)
  const networkName = network.name === 'polygonAmoy' ? 'polygon-amoy' : network.name

  console.log(`\n======================================================================`)
  console.log(`🚀 PIXELFARMTOKEN DEPLOYMENT MANAGER`)
  console.log(`======================================================================`)
  console.log(`🌐 Target Network : [${networkName}] (ChainId: ${chainId})`)

  const deploymentsDir = path.resolve(__dirname, '../deployments')
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true })
  }

  const deploymentFilePath = path.join(deploymentsDir, `${networkName}.json`)
  const isForce = process.env.FORCE_DEPLOY === 'true' || process.argv.includes('--force') || process.argv.includes('--reset')

  // Check if contract already deployed for this network
  if (fs.existsSync(deploymentFilePath) && !isForce) {
    const existing = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'))
    console.log(`\n⚠️  CONTRACT ALREADY DEPLOYED FOR NETWORK: [${networkName}]`)
    console.log(`📍 Contract Address : ${existing.contractAddress}`)
    console.log(`🔗 Transaction Hash : ${existing.transactionHash}`)
    console.log(`🧱 Block Number     : ${existing.blockNumber}`)
    console.log(`⏰ Deployed At       : ${existing.deployedAt}`)

    const onChainCode = await ethers.provider.getCode(existing.contractAddress)
    if (onChainCode && onChainCode !== '0x') {
      console.log(`\n✅ Contract verified on-chain at ${existing.contractAddress}.`)
      console.log(`🛡️  Deployment skipped to prevent duplicate contracts and address loss.`)
      console.log(`💡 To force a new deployment, run with: FORCE_DEPLOY=true pnpm run deploy:${networkName}`)

      if (networkName === 'sepolia') {
        console.log(`\n🔍 Block Explorer: https://sepolia.etherscan.io/address/${existing.contractAddress}`)
      } else if (networkName === 'polygon-amoy') {
        console.log(`\n🔍 Block Explorer: https://amoy.polygonscan.com/address/${existing.contractAddress}`)
      }

      // Ensure frontend ABI and address are in sync with existing deployment
      syncFrontendAndBackend(existing.contractAddress, existing.abi, chainId, networkName)
      return
    } else {
      console.warn(`\n⚠️  No bytecode found at ${existing.contractAddress} on chain (node might have reset).`)
      console.log(`Proceeding to deploy a fresh contract...`)
    }
  }

  const [deployer] = await ethers.getSigners()
  console.log(`👤 Deployer Address: ${deployer.address}`)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} ETH\n`)

  if (balance === 0n && networkName !== 'hardhat' && networkName !== 'localhost') {
    console.error(`\n❌ LỖI SỐ DƯ: Ví deployer (${deployer.address}) chưa có ETH để trả phí gas trên mạng [${networkName}]!`)
    if (networkName === 'sepolia') {
      console.log(`💡 Vui lòng nhận SepoliaETH miễn phí tại một trong các trang sau:`)
      console.log(`   1. Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia`)
      console.log(`   2. Sepolia Faucet: https://sepoliafaucet.com/`)
      console.log(`   3. Infura Faucet: https://www.infura.io/faucet/sepolia`)
      console.log(`Sau khi ví có SepoliaETH, hãy chạy lại lệnh deploy!`)
    }
    process.exit(1)
  }

  // Hardhat Account #0 or configured via env
  const backendSignerAddress =
    process.env.BACKEND_SIGNER_ADDRESS || deployer.address
  console.log(`🔑 Backend Signer Address: ${backendSignerAddress}`)

  // 1. Deploy PixelFarmToken ERC-20
  console.log('\nDeploying single ERC-20 contract: PixelFarmToken ($PIXEL)...')
  const TokenFactory = await ethers.getContractFactory('PixelFarmToken')
  const pixelToken = await TokenFactory.deploy(deployer.address, backendSignerAddress)
  await pixelToken.waitForDeployment()

  const pixelTokenAddress = await pixelToken.getAddress()
  const deployTx = pixelToken.deploymentTransaction()
  const receipt = deployTx ? await deployTx.wait() : null

  console.log(`✅ PixelFarmToken deployed successfully at: ${pixelTokenAddress}`)
  console.log(`📜 Tx Hash: ${deployTx?.hash}`)
  console.log(`🧱 Block Number: ${receipt?.blockNumber}`)

  // Block explorer links
  if (networkName === 'sepolia') {
    console.log(`\n🔍 SEPOLIA ETHERSCAN EXPLORER:`)
    console.log(`   -> Contract: https://sepolia.etherscan.io/address/${pixelTokenAddress}`)
    console.log(`   -> Tx Hash : https://sepolia.etherscan.io/tx/${deployTx?.hash}`)
  } else if (networkName === 'polygon-amoy') {
    console.log(`\n🔍 POLYGON AMOY EXPLORER:`)
    console.log(`   -> Contract: https://amoy.polygonscan.com/address/${pixelTokenAddress}`)
    console.log(`   -> Tx Hash : https://amoy.polygonscan.com/tx/${deployTx?.hash}`)
  }

  const tokenArtifact = artifacts.readArtifactSync('PixelFarmToken')

  // 2. Save deployment record to contracts/deployments/<network>.json
  const deploymentRecord = {
    network: networkName,
    chainId: chainId,
    contractName: 'PixelFarmToken',
    contractAddress: pixelTokenAddress,
    deployer: deployer.address,
    backendSigner: backendSignerAddress,
    transactionHash: deployTx ? deployTx.hash : null,
    blockNumber: receipt ? Number(receipt.blockNumber) : null,
    deployedAt: new Date().toISOString(),
    explorer: networkName === 'sepolia' ? `https://sepolia.etherscan.io/address/${pixelTokenAddress}` : undefined,
    abi: tokenArtifact.abi,
  }

  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentRecord, null, 2))
  console.log(`\n💾 Saved deployment record to:\n   -> ${deploymentFilePath}`)

  // 3. Export to Frontend and Backend
  syncFrontendAndBackend(pixelTokenAddress, tokenArtifact.abi, chainId, networkName)

  console.log('\n======================================================================')
  console.log('🎉 DEPLOYMENT COMPLETED & ASSETS SYNCED SUCCESSFULLY!')
  console.log('======================================================================\n')
}

function syncFrontendAndBackend(
  contractAddress: string,
  abi: any,
  chainId: number,
  networkName: string,
) {
  // Sync to Frontend
  const targetDir = path.resolve(__dirname, '../../front_end/src/web3/abis')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const oldNftJson = path.join(targetDir, 'FarmItemNFT.json')
  if (fs.existsSync(oldNftJson)) {
    fs.unlinkSync(oldNftJson)
    console.log(`🗑️  Deleted legacy FarmItemNFT.json from Frontend`)
  }

  fs.writeFileSync(
    path.join(targetDir, 'PixelFarmToken.json'),
    JSON.stringify(abi, null, 2),
  )

  const tsContent = `// Auto-generated by Hardhat deploy script
// Network: ${networkName} | ChainId: ${chainId} | Timestamp: ${new Date().toISOString()}

export const CONTRACT_ADDRESSES = {
  PIXEL_TOKEN: '${contractAddress}',
} as const

export const PIXEL_TOKEN_ABI = ${JSON.stringify(abi, null, 2)} as const

export const CHAIN_CONFIG = {
  chainId: ${chainId},
  networkName: '${networkName}',
} as const
`
  fs.writeFileSync(path.join(targetDir, 'contracts.ts'), tsContent)
  console.log(`📁 Synced contract configuration to Frontend:\n   -> ${path.join(targetDir, 'contracts.ts')}`)

  // Sync to Backend
  const backendDeploymentsDir = path.resolve(__dirname, '../../backend/deployments')
  if (!fs.existsSync(backendDeploymentsDir)) {
    fs.mkdirSync(backendDeploymentsDir, { recursive: true })
  }
  const backendRecordPath = path.join(backendDeploymentsDir, `${networkName}.json`)
  fs.writeFileSync(
    backendRecordPath,
    JSON.stringify(
      {
        network: networkName,
        chainId,
        contractAddress,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
  console.log(`📁 Synced contract address to Backend:\n   -> ${backendRecordPath}`)
}

main().catch((err) => {
  console.error('❌ Deployment script failed:', err)
  process.exit(1)
})
