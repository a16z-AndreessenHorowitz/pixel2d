import { Wallet } from 'ethers'
import app from './src/index.js'
import { CONFIG } from './src/config/index.js'
import http from 'http'

async function runTests() {
  console.log('🧪 Starting Pixel2D Backend Integration Tests...\n')
  const port = 4099
  const server = http.createServer(app)

  await new Promise<void>((resolve) => server.listen(port, resolve))
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    // 1. Test Healthcheck
    console.log('1️⃣ Testing Healthcheck...')
    const healthRes = await fetch(`${baseUrl}/api/health`).then((r) => r.json())
    if (healthRes.status !== 'ok' || !healthRes.signerAddress) {
      throw new Error('Healthcheck failed: ' + JSON.stringify(healthRes))
    }
    console.log('   ✅ Healthcheck OK. Signer:', healthRes.signerAddress)

    // 2. Test Shop Items
    console.log('\n2️⃣ Testing Shop Items...')
    const shopRes = await fetch(`${baseUrl}/api/shop/items`).then((r) => r.json())
    if (!shopRes.success || shopRes.items.length < 5) {
      throw new Error('Shop items failed: ' + JSON.stringify(shopRes))
    }
    console.log(`   ✅ Shop returned ${shopRes.items.length} items. First: ${shopRes.items[0].name} (${shopRes.items[0].price_coins} Coins)`)

    // 3. Test SIWE Auth (Sign-In with Ethereum)
    console.log('\n3️⃣ Testing SIWE Auth...')
    const testWallet = Wallet.createRandom()
    const address = testWallet.address

    // A. Get Nonce
    const nonceRes = await fetch(`${baseUrl}/api/auth/nonce?address=${address}`).then((r) => r.json())
    if (!nonceRes.success || !nonceRes.nonce) {
      throw new Error('Nonce generation failed: ' + JSON.stringify(nonceRes))
    }

    // B. Sign SIWE message
    const message = `Pixel2D GameFi Authentication\nAddress: ${address}\nNonce: ${nonceRes.nonce}`
    const signature = await testWallet.signMessage(message)

    // C. Login with Wallet
    const loginRes = await fetch(`${baseUrl}/api/auth/login-wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature, message }),
    }).then((r) => r.json())

    if (!loginRes.success || !loginRes.token) {
      throw new Error('Wallet login failed: ' + JSON.stringify(loginRes))
    }
    const token = loginRes.token
    console.log('   ✅ SIWE login successful. JWT token received. Initial coins:', loginRes.gameState.coins)

    // 4. Test Game State Save & Sync
    console.log('\n4️⃣ Testing Game State Sync...')
    const saveRes = await fetch(`${baseUrl}/api/game/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        coins: 150,
      }),
    }).then((r) => r.json())

    if (!saveRes.success || saveRes.state.coins !== 150) {
      throw new Error('Game state save failed: ' + JSON.stringify(saveRes))
    }

    const stateRes = await fetch(`${baseUrl}/api/game/state?address=${address}`).then((r) => r.json())
    if (!stateRes.success || stateRes.state.coins !== 150) {
      throw new Error('Game state fetch failed: ' + JSON.stringify(stateRes))
    }
    console.log('   ✅ Game state sync OK. Coins updated to:', stateRes.state.coins)

    // 5. Test Shop Buy (Seed Purchase)
    console.log('\n5️⃣ Testing Shop Purchase (Corn Seed)...')
    const buyRes = await fetch(`${baseUrl}/api/shop/buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        itemId: 'corn-seed',
        bundleCount: 1,
      }),
    }).then((r) => r.json())

    if (!buyRes.success || buyRes.coins !== 140) {
      throw new Error('Shop purchase failed: ' + JSON.stringify(buyRes))
    }
    console.log('   ✅ Purchase successful. Remaining coins:', buyRes.coins)

    // 6. Test Web3 Claim Signer (ECDSA)
    console.log('\n6️⃣ Testing Web3 Claim Signer...')
    // Claim 50 coins
    const claimRes = await fetch(`${baseUrl}/api/web3/create-claim-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: 50,
      }),
    }).then((r) => r.json())

    if (!claimRes.success || !claimRes.data.signature) {
      throw new Error('Claim signature failed: ' + JSON.stringify(claimRes))
    }
    console.log('   ✅ Claim signature generated successfully!')
    console.log('   📜 Nonce:', claimRes.data.nonce)
    console.log('   🔑 Signer Address:', claimRes.data.signerAddress)
    console.log('   ✍️  Signature:', claimRes.data.signature.slice(0, 30) + '...')
    console.log('   🪙 Remaining Coins in DB:', claimRes.data.remainingCoins)

    // Test Cooldown prevention
    console.log('\n7️⃣ Testing Cooldown Prevention...')
    const cooldownRes = await fetch(`${baseUrl}/api/web3/create-claim-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: 20,
      }),
    })
    if (cooldownRes.status !== 429) {
      throw new Error('Cooldown did not block immediate second claim!')
    }
    const cooldownData = await cooldownRes.json()
    console.log(`   ✅ Cooldown active as expected. HTTP 429: "${cooldownData.error}"`)

    // 8. Test Transaction History
    console.log('\n8️⃣ Testing Transaction History Log...')
    const txRes = await fetch(`${baseUrl}/api/transactions?address=${address}`).then((r) => r.json())
    if (!txRes.success || txRes.transactions.length < 2) {
      throw new Error('Transactions log check failed: ' + JSON.stringify(txRes))
    }
    console.log(`   ✅ Transaction history OK. Found ${txRes.transactions.length} records:`)
    txRes.transactions.forEach((tx: any) => {
      console.log(`      - [${tx.type}] ${tx.amount}: ${tx.details}`)
    })

    console.log('\n🎉 ALL 8 BACKEND API & SIGNER TESTS PASSED SUCCESSFULLY! 🚀\n')
  } finally {
    server.close(() => {
      process.exit(0)
    })
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
