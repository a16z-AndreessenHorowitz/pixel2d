import Phaser from 'phaser'
import { Player } from '../objects/Player'
import type {
  FishDefinition,
  FishingSpot,
  FishingState,
} from '../fishing/fishingType'
import { FishingResult } from './FishingResult'
import {
  FISHING_SPOTS,
  FISH_DATA,
  FISH_CATCH_WEIGHTS,
} from './fishingData'
import { FishingMinigame } from './FishingMinigame'
import { FishingPrompt } from './FishingPrompt'
export class FishingSystem {
  private readonly scene: Phaser.Scene
  private readonly player: Player
  private readonly minigame: FishingMinigame
  private state: FishingState = 'idle'
  private currentFish?: FishDefinition
  private currentSpot?: FishingSpot
  private readonly resultUI: FishingResult
  private readonly prompt: FishingPrompt

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player
    this.prompt = new FishingPrompt(scene)
    this.minigame = new FishingMinigame(
  scene,
  (result) => {
    if (result === 'success') {
      this.state = 'success'

      console.log(
        '[Fishing] Successfully caught a fish!',
      )

      if (this.currentFish) {
        this.resultUI.showSuccess(
          this.currentFish,
        )
      }
    } else {
      this.state = 'failed'

      console.log(
        '[Fishing] The fish escaped!',
      )

      this.resultUI.showFailed()
    }
  },
)
    this.resultUI = new FishingResult(
  scene,
  () => {
    this.state = 'idle'
    this.currentSpot = undefined
    this.currentFish = undefined

    console.log('[Fishing] Ready to fish again!')
  },
)
    const fishingKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )

    fishingKey?.on('down', () => {
      this.startFishing()
    })
  }

  update() {
  this.minigame.update(
    this.scene.game.loop.delta,
  )
  this.updateFishingPrompt()
  if (this.state !== 'idle') {
    return
  }

  const spot = this.getNearbyFishingSpot()

  if (spot) {
    console.log(
      '[Fishing] Player near:',
      spot.id,
    )
  }
}
  private updateFishingPrompt() {
  const spot = this.getNearbyFishingSpot()

  if (!spot) {
    this.prompt.hide()
    return
  }

  const playerX = this.player.sprite.x
  const playerY = this.player.sprite.y

  const promptX = playerX
  const promptY = playerY - 85

  switch (this.state) {
    case 'idle':
      this.prompt.showIdle(
        promptX,
        promptY,
      )
      break

    case 'casting':
      this.prompt.showCasting(
        promptX,
        promptY,
      )
      break

    case 'waiting':
      this.prompt.showWaiting(
        promptX,
        promptY,
      )
      break

    case 'bite':
      this.prompt.showBite(
        promptX,
        promptY,
      )
      break

    default:
      this.prompt.hide()
      break
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
  private selectRandomFish(): FishDefinition {
  const totalWeight = Object.values(
    FISH_CATCH_WEIGHTS,
  ).reduce(
    (sum, weight) => sum + weight,
    0,
  )

  let random =
    Math.random() * totalWeight

  for (const fish of FISH_DATA) {
    const weight =
      FISH_CATCH_WEIGHTS[fish.id]

    random -= weight

    if (random <= 0) {
      return fish
    }
  }

  return FISH_DATA[0]
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

  if (this.state === 'bite') {
  this.state = 'reeling'

  console.log('[Fishing] Reeling in!')

  this.currentFish =
    this.selectRandomFish()

  console.log(
    '[Fishing] Fish selected:',
    this.currentFish.name,
    '| Rarity:',
    this.currentFish.rarity,
    '| Difficulty:',
    this.currentFish.catchDifficulty,
  )

  this.minigame.start(
    this.currentFish.catchDifficulty,
  )
}
}

  getState(): FishingState {
    return this.state
  }
}