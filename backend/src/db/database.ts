import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { CONFIG } from '../config/index.js'
import type { GameState, ShopItem } from '../types/index.js'

// Ensure data directory exists
const dbDir = path.dirname(CONFIG.DATABASE_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export const db = new Database(CONFIG.DATABASE_PATH)
db.pragma('journal_mode = WAL')

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      wallet_address TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_states (
      wallet_address TEXT PRIMARY KEY,
      coins INTEGER NOT NULL DEFAULT 100,
      inventory_json TEXT NOT NULL DEFAULT '[]',
      toolbar_json TEXT NOT NULL DEFAULT '[]',
      plots_json TEXT NOT NULL DEFAULT '[]',
      quests_json TEXT NOT NULL DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shop_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price_coins INTEGER NOT NULL,
      bundle_qty INTEGER NOT NULL DEFAULT 5,
      image_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      coin_amount INTEGER NOT NULL,
      nonce INTEGER NOT NULL,
      signature TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS siwe_nonces (
      wallet_address TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  seedShopItems()
}

function seedShopItems() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM shop_items').get() as { count: number }
  if (countRow.count > 0) return

  const defaultShopItems: ShopItem[] = [
    {
      id: 'corn-seed',
      name: 'Hạt giống Bắp',
      type: 'seed',
      category: 'seed',
      description: 'Thời gian lớn: 15s. Thu hoạch: +12 Coins.',
      bundle_qty: 5,
      price_coins: 10,
      image_url: '/assets/tools/corn-seed.png',
      is_active: 1,
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
      is_active: 1,
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
      is_active: 1,
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
      is_active: 1,
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
      is_active: 1,
    },
  ]

  const insertStmt = db.prepare(`
    INSERT INTO shop_items (id, name, type, category, description, price_coins, bundle_qty, image_url, is_active)
    VALUES (@id, @name, @type, @category, @description, @price_coins, @bundle_qty, @image_url, @is_active)
  `)

  const insertMany = db.transaction((items: ShopItem[]) => {
    for (const item of items) {
      insertStmt.run(item)
    }
  })

  insertMany(defaultShopItems)
  console.log(`[Database] Seeded ${defaultShopItems.length} default shop items.`)
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
