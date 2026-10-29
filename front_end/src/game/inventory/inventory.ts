import type { FishId } from '../fishing/fishingType'

export type ToolId =
  | 'watering-can'
  | 'sickle'
  | 'hoe'
  | 'fishing-rod'
  | 'gold-watering-can'
  | 'gold-sickle'
  | 'gold-hoe'

export type SeedId =
  | 'corn-seed'
  | 'rice-seed'
  | 'strawberry-seed'
  | 'pumpkin-seed'
  | 'watermelon-seed'

export type HarvestedCropId =
  | 'corn'
  | 'rice'
  | 'strawberry'
  | 'pumpkin'
  | 'watermelon'

export type InventoryItemId =
  | ToolId
  | SeedId
  | HarvestedCropId
  | FishId

export type InventoryItem = {
  id: InventoryItemId
  label: string
  icon: string
  quantity: number
  stackable: boolean
}

export type InventorySlot = InventoryItem | null

export const INVENTORY_SIZE = 20

/*
 * Danh sách định nghĩa item (Database item đầy đủ của game).
 */
export const ITEM_DEFINITIONS: Record<
  InventoryItemId,
  Omit<InventoryItem, 'quantity'>
> = {
  // ── Standard Tools ──
  'watering-can': {
    id: 'watering-can',
    label: 'BÌNH TƯỚI',
    icon: '/assets/tools/watering-can.png',
    stackable: false,
  },
  sickle: {
    id: 'sickle',
    label: 'LIỀM',
    icon: '/assets/tools/sickle.png',
    stackable: false,
  },
  hoe: {
    id: 'hoe',
    label: 'CUỐC',
    icon: '/assets/tools/hoe.png',
    stackable: false,
  },
  'fishing-rod': {
    id: 'fishing-rod',
    label: 'CẦN CÂU',
    icon: '/assets/fishing/fishing-rod.png',
    stackable: false,
  },

  // ── Gold Tools (NFT Buffs) ──
  'gold-watering-can': {
    id: 'gold-watering-can',
    label: 'BÌNH VÀNG',
    icon: '/assets/tools/bloomseed/Watering_Can/Watering_Can_Gold_Down.png',
    stackable: false,
  },
  'gold-sickle': {
    id: 'gold-sickle',
    label: 'LIỀM VÀNG',
    icon: '/assets/tools/bloomseed/Sickle/Sickle_Gold_Down.png',
    stackable: false,
  },
  'gold-hoe': {
    id: 'gold-hoe',
    label: 'CUỐC VÀNG',
    icon: '/assets/tools/bloomseed/Hoe/Hoe_Gold_Down.png',
    stackable: false,
  },

  // ── Seeds ──
  'corn-seed': {
    id: 'corn-seed',
    label: 'HẠT BẮP',
    icon: '/assets/tools/corn-seed.png',
    stackable: true,
  },
  'rice-seed': {
    id: 'rice-seed',
    label: 'HẠT LÚA',
    icon: '/assets/tools/rice-seed.png',
    stackable: true,
  },
  'strawberry-seed': {
    id: 'strawberry-seed',
    label: 'HẠT DÂU',
    icon: '/assets/tools/strawberry-seed.png',
    stackable: true,
  },
  'pumpkin-seed': {
    id: 'pumpkin-seed',
    label: 'HẠT BÍ',
    icon: '/assets/tools/pumpkin-seed.png',
    stackable: true,
  },
  'watermelon-seed': {
    id: 'watermelon-seed',
    label: 'HẠT DƯA',
    icon: '/assets/tools/watermelon-seed.png',
    stackable: true,
  },

  // ── Harvested Crops (Nông sản thu hoạch) ──
  corn: {
    id: 'corn',
    label: 'BẮP (CỦ)',
    icon: '/assets/crops/corn-3.png',
    stackable: true,
  },
  rice: {
    id: 'rice',
    label: 'BÓ LÚA',
    icon: '/assets/crops/rice-3.png',
    stackable: true,
  },
  strawberry: {
    id: 'strawberry',
    label: 'DÂU TÂY',
    icon: '/assets/crops/strawberry-3.png',
    stackable: true,
  },
  pumpkin: {
    id: 'pumpkin',
    label: 'BÍ NGÔ',
    icon: '/assets/crops/pumpkin-3.png',
    stackable: true,
  },
  watermelon: {
    id: 'watermelon',
    label: 'DƯA HẤU',
    icon: '/assets/crops/watermelon-3.png',
    stackable: true,
  },

  // ── Fish (Cá từ minigame câu cá) ──
  carp: {
    id: 'carp',
    label: 'CÁ CHÉP',
    icon: '/assets/fishing/fish1_processed/koi.png',
    stackable: true,
  },
  tilapia: {
    id: 'tilapia',
    label: 'CÁ RÔ PHI',
    icon: '/assets/fishing/fish1_processed/tilapia.png',
    stackable: true,
  },
  catfish: {
    id: 'catfish',
    label: 'CÁ TRÊ',
    icon: '/assets/fishing/fish1_processed/catfish.png',
    stackable: true,
  },
  salmon: {
    id: 'salmon',
    label: 'CÁ HỒI',
    icon: '/assets/fishing/fish1_processed/tuna.png',
    stackable: true,
  },
  'golden-fish': {
    id: 'golden-fish',
    label: 'CÁ VÀNG',
    icon: '/assets/fishing/golden-fish.png',
    stackable: true,
  },
}

/*
 * Inventory mặc định ban đầu
 */
export const DEFAULT_INVENTORY: InventorySlot[] = [
  null,
  null,
  null,
  { ...ITEM_DEFINITIONS['corn-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['rice-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['strawberry-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['pumpkin-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['watermelon-seed'], quantity: 5 },
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]

/*
 * Toolbar mặc định 8 slot (phím tắt 1 - 8)
 */
export const DEFAULT_TOOLBAR: (InventoryItem | null)[] = [
  { ...ITEM_DEFINITIONS['watering-can'], quantity: 1 },
  { ...ITEM_DEFINITIONS['sickle'], quantity: 1 },
  { ...ITEM_DEFINITIONS['hoe'], quantity: 1 },
  { ...ITEM_DEFINITIONS['fishing-rod'], quantity: 1 },
  { ...ITEM_DEFINITIONS['corn-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['rice-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['strawberry-seed'], quantity: 5 },
  { ...ITEM_DEFINITIONS['pumpkin-seed'], quantity: 5 },
]

const STORAGE_KEY_PREFIX = 'pixel-farm-inventory-v3'

type SavedInventory = {
  inventory: InventorySlot[]
  toolbar: (InventoryItem | null)[]
}

export function getStorageKey(account?: string | null): string {
  if (account && account.startsWith('0x')) {
    return `${STORAGE_KEY_PREFIX}-${account.toLowerCase()}`
  }
  return `${STORAGE_KEY_PREFIX}-guest`
}

export function loadInventory(account?: string | null): SavedInventory {
  try {
    const key = getStorageKey(account)
    const raw = localStorage.getItem(key)

    if (!raw) {
      return {
        inventory: [...DEFAULT_INVENTORY],
        toolbar: [...DEFAULT_TOOLBAR],
      }
    }

    const parsed = JSON.parse(raw) as SavedInventory

    if (!Array.isArray(parsed.inventory) || !Array.isArray(parsed.toolbar)) {
      throw new Error('Invalid inventory data')
    }

    const inventory = [...parsed.inventory]
    while (inventory.length < INVENTORY_SIZE) {
      inventory.push(null)
    }

    const toolbar = [...parsed.toolbar]
    while (toolbar.length < 8) {
      toolbar.push(null)
    }

    return {
      inventory: inventory.slice(0, INVENTORY_SIZE),
      toolbar: toolbar.slice(0, 8),
    }
  } catch {
    return {
      inventory: [...DEFAULT_INVENTORY],
      toolbar: [...DEFAULT_TOOLBAR],
    }
  }
}

export function saveInventory(
  inventory: InventorySlot[],
  toolbar: (InventoryItem | null)[],
  account?: string | null,
) {
  const data: SavedInventory = {
    inventory,
    toolbar,
  }

  const key = getStorageKey(account)
  localStorage.setItem(key, JSON.stringify(data))
}
