import express from 'express'
import cors from 'cors'
import { CONFIG } from './config/index.js'
import { initDatabase } from './db/database.js'
import { authRouter } from './routes/auth.js'
import { gameRouter } from './routes/game.js'
import { shopRouter } from './routes/shop.js'
import { web3Router } from './routes/web3.js'
import { transactionsRouter } from './routes/transactions.js'

const app = express()

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or localhost
      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true)
      } else {
        callback(null, true) // Open in dev mode
      }
    },
    credentials: true,
  }),
)

app.use(express.json())

// Initialize Database & Seed data
initDatabase()

// Routes
app.use('/api/auth', authRouter)
app.use('/api/game', gameRouter)
app.use('/api/shop', shopRouter)
app.use('/api/web3', web3Router)
app.use('/api/transactions', transactionsRouter)

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Pixel2D GameFi Backend API & Signer',
    serverTime: new Date().toISOString(),
    signerAddress: CONFIG.SIGNER_ADDRESS,
    claimCap: CONFIG.CLAIM_CAP,
    claimCooldownSeconds: CONFIG.CLAIM_COOLDOWN_SECONDS,
  })
})

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err)
  res.status(500).json({ success: false, error: 'Internal Server Error: ' + (err.message || 'Unknown') })
})

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(CONFIG.PORT, () => {
    console.log(`====================================================`)
    console.log(`🌾 Pixel2D GameFi Backend Server running on port ${CONFIG.PORT}`)
    console.log(`🔑 ECDSA Signer Address: ${CONFIG.SIGNER_ADDRESS}`)
    console.log(`🛡️  Claim Cap: ${CONFIG.CLAIM_CAP} Coins | Cooldown: ${CONFIG.CLAIM_COOLDOWN_SECONDS}s`)
    console.log(`💾 Database: ${CONFIG.DATABASE_PATH}`)
    console.log(`====================================================`)
  })
}

export default app
