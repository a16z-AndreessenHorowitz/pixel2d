export type InventoryItemId =
  | 'watering-can'
  | 'sickle'
  | 'hoe'
  | 'corn-seed'
  | 'rice-seed'
  | 'strawberry-seed'
  | 'pumpkin-seed'
  | 'watermelon-seed'

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
 * Danh sách định nghĩa item.
 *
 * Đây là "database" nhỏ của item.
 * Toolbar có thể lấy thông tin icon/label từ đây
 * mà không cần item phải tồn tại trong Inventory.
 */
export const ITEM_DEFINITIONS: Record<
  InventoryItemId,
  Omit<InventoryItem, 'quantity'>
> = {
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

  'corn-seed': {
    id: 'corn-seed',
    label: 'BẮP',
    icon: '/assets/tools/corn-seed.png',
    stackable: true,
  },

  'rice-seed': {
    id: 'rice-seed',
    label: 'LÚA',
    icon: '/assets/tools/rice-seed.png',
    stackable: true,
  },

  'strawberry-seed': {
    id: 'strawberry-seed',
    label: 'DÂU',
    icon: '/assets/tools/strawberry-seed.png',
    stackable: true,
  },

  'pumpkin-seed': {
    id: 'pumpkin-seed',
    label: 'BÍ NGÔ',
    icon: '/assets/tools/pumpkin-seed.png',
    stackable: true,
  },

  'watermelon-seed': {
    id: 'watermelon-seed',
    label: 'DƯA HẤU',
    icon: '/assets/tools/watermelon-seed.png',
    stackable: true,
  },
}

/*
 * Inventory mặc định.
 *
 * Toolbar và Inventory KHÔNG dùng chung item nữa.
 * Đây là hai khu vực chứa item độc lập.
 */
export const DEFAULT_INVENTORY: InventorySlot[] = [
  null,
  null,
  null,
  {
    ...ITEM_DEFINITIONS['corn-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['rice-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['strawberry-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['pumpkin-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['watermelon-seed'],
    quantity: 10,
  },
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
 * Toolbar mặc định.
 *
 * Toolbar tự chứa item, không phụ thuộc Inventory.
 */
export const DEFAULT_TOOLBAR: (InventoryItem | null)[] = [
  {
    ...ITEM_DEFINITIONS['watering-can'],
    quantity: 1,
  },
  {
    ...ITEM_DEFINITIONS['sickle'],
    quantity: 1,
  },
  {
    ...ITEM_DEFINITIONS['hoe'],
    quantity: 1,
  },
  {
    ...ITEM_DEFINITIONS['corn-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['rice-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['strawberry-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['pumpkin-seed'],
    quantity: 10,
  },
  {
    ...ITEM_DEFINITIONS['watermelon-seed'],
    quantity: 10,
  },
]

const STORAGE_KEY = 'pixel-farm-inventory-v2'

type SavedInventory = {
  inventory: InventorySlot[]
  toolbar: (InventoryItem | null)[]
}

export function loadInventory(): SavedInventory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return {
        inventory: [...DEFAULT_INVENTORY],
        toolbar: [...DEFAULT_TOOLBAR],
      }
    }

    const parsed = JSON.parse(raw) as SavedInventory

    if (
      !Array.isArray(parsed.inventory) ||
      !Array.isArray(parsed.toolbar)
    ) {
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
) {
  const data: SavedInventory = {
    inventory,
    toolbar,
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data),
  )
}