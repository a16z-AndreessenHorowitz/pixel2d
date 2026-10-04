import type { FishingSpot } from '../fishing/fishingType'

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