export type FishRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'

export type FishId =
  | 'carp'
  | 'tilapia'
  | 'catfish'
  | 'salmon'
  | 'golden-fish'

export type FishDefinition = {
  id: FishId
  name: string
  icon: string
  rarity: FishRarity
  sellPrice: number
  catchDifficulty: number
}

export type FishingState =
  | 'idle'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'reeling'
  | 'success'
  | 'failed'

export type FishingSpot = {
  id: string
  x: number
  y: number
  radiusX: number
  radiusY: number
  interactionRadius: number
}