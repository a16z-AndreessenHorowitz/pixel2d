import mongoose from 'mongoose'
import { CONFIG } from '../config/index.js'
import { ShopItemModel } from './models.js'
import type { ShopItem } from '../types/index.js'

let memoryServerInstance: any = null

export async function connectDatabase(): Promise<typeof mongoose> {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  // 1. Try connecting to configured MONGODB_URI (e.g. MongoDB Atlas or running local mongod)
  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${CONFIG.MONGODB_URI}...`)
    await mongoose.connect(CONFIG.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    })
    console.log(`🍃 Connected successfully to MongoDB: ${CONFIG.MONGODB_URI}`)
    await seedShopItems()
    return mongoose
  } catch (err: any) {
    console.warn(`[Database] Could not connect to external MongoDB: ${err.message}`)
    console.log('[Database] Starting built-in MongoDB Memory Server fallback...')
  }

  // 2. Fallback to MongoMemoryServer (Zero-config, works everywhere on localhost)
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServerInstance = await MongoMemoryServer.create()
    const memoryUri = memoryServerInstance.getUri()

    await mongoose.connect(memoryUri)
    console.log(`🍃 Connected successfully to MongoDB (Embedded Engine) at: ${memoryUri}`)
    await seedShopItems()
    return mongoose
  } catch (memErr: any) {
    console.error('[Database] Failed to initialize MongoDB embedded engine:', memErr)
    throw memErr
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (memoryServerInstance) {
    await memoryServerInstance.stop()
    memoryServerInstance = null
  }
}

export async function seedShopItems(): Promise<void> {
  const defaultShopItems: Omit<ShopItem, 'is_active'>[] = [
    {
      id: 'corn-seed',
      name: 'Hạt giống Bắp',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 15s. Thu hoạch: +12 Coins.',
      bundle_qty: 5,
      price_coins: 10,
      image_url: '/assets/tools/corn-seed.png',
    },
    {
      id: 'rice-seed',
      name: 'Hạt giống Lúa',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 20s. Thu hoạch: +15 Coins.',
      bundle_qty: 5,
      price_coins: 15,
      image_url: '/assets/tools/rice-seed.png',
    },
    {
      id: 'strawberry-seed',
      name: 'Hạt giống Dâu Tây',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 25s. Thu hoạch: +22 Coins.',
      bundle_qty: 5,
      price_coins: 25,
      image_url: '/assets/tools/strawberry-seed.png',
    },
    {
      id: 'pumpkin-seed',
      name: 'Hạt giống Bí Ngô',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 35s. Thu hoạch: +30 Coins.',
      bundle_qty: 5,
      price_coins: 35,
      image_url: '/assets/tools/pumpkin-seed.png',
    },
    {
      id: 'watermelon-seed',
      name: 'Hạt giống Dưa Hấu',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 45s. Thu hoạch: +45 Coins.',
      bundle_qty: 5,
      price_coins: 50,
      image_url: '/assets/tools/watermelon-seed.png',
    },
  ]

  for (const item of defaultShopItems) {
    await ShopItemModel.updateOne(
      { id: item.id },
      { $setOnInsert: { ...item, is_active: 1 } },
      { upsert: true },
    )
  }
  console.log(`[Database] Seeded default shop items into MongoDB.`)
}

export const DEFAULT_INITIAL_TOOLBAR = [
  { id: 'hoe', name: 'Cuốc đất', category: 'tool', icon: '/assets/tools/hoe.png', quantity: 1, stackable: false },
  { id: 'watering-can', name: 'Bình tưới', category: 'tool', icon: '/assets/tools/watering-can.png', quantity: 1, stackable: false },
  { id: 'sickle', name: 'Lưỡi liềm', category: 'tool', icon: '/assets/tools/sickle.png', quantity: 1, stackable: false },
  { id: 'corn-seed', name: 'Hạt Bắp', category: 'seed', icon: '/assets/tools/corn-seed.png', quantity: 5, stackable: true },
  { id: 'fishing-rod', name: 'Cần câu cá', category: 'tool', icon: '/assets/fishing/fishing-rod.png', quantity: 1, stackable: false },
  null,
  null,
  null,
]

export const DEFAULT_INITIAL_INVENTORY = Array(20).fill(null)
