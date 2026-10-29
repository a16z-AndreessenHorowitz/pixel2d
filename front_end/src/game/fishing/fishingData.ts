import type { FishingSpot, FishDefinition, } from '../fishing/fishingType'

export const FISHING_SPOTS: FishingSpot[] = [
  {
    id: 'scenic-pond',
    x: 1780,
    y: 1040,
    radiusX: 260,
    radiusY: 160,

    // Player đứng ngoài bờ nhưng vẫn có thể câu
    interactionRadius: 90,
  },
]

export const FISH_DATA: FishDefinition[] = [
  {
    id: 'carp',
    name: 'Cá chép',
    icon: '🐟',
    rarity: 'common',
    sellPrice: 20,
    catchDifficulty: 1,
  },
  {
    id: 'tilapia',
    name: 'Cá rô phi',
    icon: '🐠',
    rarity: 'common',
    sellPrice: 30,
    catchDifficulty: 2,
  },
  {
    id: 'catfish',
    name: 'Cá trê',
    icon: '🐟',
    rarity: 'uncommon',
    sellPrice: 45,
    catchDifficulty: 3,
  },
  {
    id: 'salmon',
    name: 'Cá hồi',
    icon: '🐟',
    rarity: 'rare',
    sellPrice: 80,
    catchDifficulty: 4,
  },
  {
    id: 'golden-fish',
    name: 'Cá vàng',
    icon: '✨',
    rarity: 'legendary',
    sellPrice: 250,
    catchDifficulty: 5,
  },
]

export const FISH_CATCH_WEIGHTS = {
  carp: 50,
  tilapia: 30,
  catfish: 15,
  salmon: 4,
  'golden-fish': 1,
} as const