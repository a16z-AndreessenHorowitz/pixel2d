export type CropId = 'rice' | 'carrot' | 'tomato'

export type CropDefinition = {
  id: CropId
  name: string
  stageDurationMs: number
  harvestCoins: number
  frames: [string, string, string]
}

export const crops: CropDefinition[] = [
  {
    id: 'rice',
    name: 'Lúa',
    stageDurationMs: 10000,
    harvestCoins: 10,
    frames: ['rice-stage-1', 'rice-stage-2', 'rice-stage-3'],
  },
  {
    id: 'carrot',
    name: 'Cà rốt',
    stageDurationMs: 10000,
    harvestCoins: 14,
    frames: ['carrot-stage-1', 'carrot-stage-2', 'carrot-stage-3'],
  },
  {
    id: 'tomato',
    name: 'Cà chua',
    stageDurationMs: 10000,
    harvestCoins: 18,
    frames: ['tomato-stage-1', 'tomato-stage-2', 'tomato-stage-3'],
  },
]
