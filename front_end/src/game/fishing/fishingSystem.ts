import Phaser from 'phaser'
import { Player } from '../objects/Player'
import type { FishingSpot, FishingState } from '../fishing/fishingType'
import { FISHING_SPOTS } from './fishingData'

export class FishingSystem {
  private readonly scene: Phaser.Scene
  private readonly player: Player

  private state: FishingState = 'idle'
  private currentSpot?: FishingSpot

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player

    const fishingKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )

    fishingKey?.on('down', () => {
      this.startFishing()
    })
  }

  update() {
    if (this.state !== 'idle') {
      return
    }

    const spot = this.getNearbyFishingSpot()

    if (spot) {
      // Debug tạm thời
      console.log('[Fishing] Player near:', spot.id)
    }
  }

  private getNearbyFishingSpot(): FishingSpot | null {
    const playerX = this.player.sprite.x
    const playerY = this.player.sprite.y

    for (const spot of FISHING_SPOTS) {
      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        spot.x,
        spot.y,
      )

      const maxDistance =
        Math.max(spot.radiusX, spot.radiusY) +
        spot.interactionRadius

      if (distance <= maxDistance) {
        return spot
      }
    }

    return null
  }

  startFishing() {
  // Đang idle → bắt đầu câu
  if (this.state === 'idle') {
    const spot = this.getNearbyFishingSpot()

    if (!spot) {
      return
    }

    this.currentSpot = spot
    this.state = 'casting'

    console.log(
      '[Fishing] Start fishing at:',
      spot.id,
    )

    this.scene.time.delayedCall(500, () => {
      if (this.state !== 'casting') {
        return
      }

      this.state = 'waiting'

      console.log('[Fishing] Waiting for a bite...')

      const biteDelay = Phaser.Math.Between(1500, 3500)

      this.scene.time.delayedCall(biteDelay, () => {
        if (this.state !== 'waiting') {
          return
        }

        this.state = 'bite'

        console.log('[Fishing] Fish bit!')
        console.log('[Fishing] Press E to reel in!')
      })
    })

    return
  }

  // Cá đã cắn → nhấn E để kéo cá
  if (this.state === 'bite') {
    this.state = 'reeling'

    console.log('[Fishing] Reeling in!')
  }
}

  getState(): FishingState {
    return this.state
  }
}