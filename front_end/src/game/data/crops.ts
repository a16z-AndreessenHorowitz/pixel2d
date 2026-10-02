export type CropId = 'corn' | 'rice' | 'strawberry' | 'pumpkin' | 'watermelon'

export type CropDefinition = {
  id: CropId
  name: string
  /** Thời gian (ms) để cây trưởng thành sau khi tưới (watered → mature) */
  growDurationMs: number
  harvestCoins: number
  frames: [string, string, string] // [seed, sprout, mature]
  scale?: number // Tỉ lệ kích thước cây (mặc định 0.28)
}

export const crops: CropDefinition[] = [
  {
    id: 'corn',
    name: 'Bắp',
    growDurationMs: 180000, // 15 giây
    scale: 0.2,
    harvestCoins: 12,
    frames: ['crop-corn-1', 'crop-corn-2', 'crop-corn-3'],
  },
  {
    id: 'rice',
    name: 'Lúa',
    growDurationMs: 180000, // 20 giây
    scale: 0.17,
    harvestCoins: 15,
    frames: ['crop-rice-1', 'crop-rice-2', 'crop-rice-3'],
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    growDurationMs: 180000, // 25 giây
    scale: 0.2,
    harvestCoins: 22,
    frames: ['crop-strawberry-1', 'crop-strawberry-2', 'crop-strawberry-3'],
  },
  {
    id: 'pumpkin',
    name: 'Bí ngô',
    growDurationMs: 180000, // 35 giây
    scale: 0.2,
    harvestCoins: 30,
    frames: ['crop-pumpkin-1', 'crop-pumpkin-2', 'crop-pumpkin-3'],
  },
  {
    id: 'watermelon',
    name: 'Dưa hấu',
    scale: 0.14,
    growDurationMs: 180000, // 50 giây
    harvestCoins: 40,
    frames: ['crop-watermelon-1', 'crop-watermelon-2', 'crop-watermelon-3'],
  },
]

export const cropMap: Record<CropId, CropDefinition> = crops.reduce(
  (acc, crop) => {
    acc[crop.id] = crop
    return acc
  },
  {} as Record<CropId, CropDefinition>,
)

export function getCropById(id: CropId): CropDefinition {
  return cropMap[id] ?? crops[0]
}
