import Phaser from 'phaser'
import { Player } from '../objects/Player'
import type {
  FishDefinition,
  FishingSpot,
  FishingState,
} from '../fishing/fishingType'
import {
  FISHING_SPOTS,
  FISH_DATA,
  FISH_CATCH_WEIGHTS,
} from './fishingData'
import { FishingPrompt } from './FishingPrompt'

export class FishingSystem {
  private readonly scene: Phaser.Scene
  private readonly player: Player
  private readonly prompt: FishingPrompt

  private state: FishingState = 'idle'
  private currentFish?: FishDefinition
  private currentSpot?: FishingSpot
  private fishSprite?: Phaser.GameObjects.Sprite
  private rodSprite?: Phaser.GameObjects.Sprite

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene
    this.player = player
    this.prompt = new FishingPrompt(scene)

    const fishingKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )

    fishingKey?.on('down', () => {
      this.startFishing()
    })

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy()
    })
  }

  update() {
    this.updateFishingPrompt()

    if (this.state === 'idle') {
      if (this.rodSprite) {
        this.destroyRod()
      }

      const spot = this.getNearbyFishingSpot()

      if (spot) {
        console.log('[Fishing] Player near:', spot.id)
      }
      return
    }

    this.updateRodPosition()
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
    // ─────────────────────────────
    // IDLE → CASTING
    // ─────────────────────────────
    if (this.state === 'idle') {
      const spot = this.getNearbyFishingSpot()

      if (!spot) {
        return
      }

      this.currentSpot = spot
      this.state = 'casting'

      this.showRod('rod-cast')

      console.log(
        '[Fishing] Start fishing at:',
        spot.id,
      )

      this.scene.time.delayedCall(500, () => {
        if (this.state !== 'casting') {
          return
        }

        // CASTING → WAITING
        this.state = 'waiting'
        this.playRodAnim('rod-idle')

        this.currentFish =
          this.selectRandomFish()

        console.log(
          '[Fishing] Waiting for a bite...',
        )

        console.log(
          '[Fishing] Fish approaching:',
          this.currentFish.name,
        )

        this.showFish()

        const biteDelay =
          Phaser.Math.Between(1500, 3500)

        this.scene.time.delayedCall(
          biteDelay,
          () => {
            if (this.state !== 'waiting') {
              return
            }

            // WAITING → BITE
            this.state = 'bite'

            console.log(
              '[Fishing] Fish bit!',
            )

            console.log(
              '[Fishing] Press E to reel in!',
            )
          },
        )
      })

      return
    }

    // ─────────────────────────────
    // BITE → REELING
    // ─────────────────────────────
    if (this.state === 'bite') {
      this.state = 'reeling'
      this.playRodAnim('rod-reel')

      console.log(
        '[Fishing] Reeling in!',
      )

      if (this.fishSprite && this.currentFish) {
        const visual =
          this.getFishVisualConfig(
            this.currentFish,
          )

        this.fishSprite.play(
          visual.hookedAnimation,
        )
      }

      console.log(
        '[Fishing] Fish selected:',
        this.currentFish?.name,
        '| Rarity:',
        this.currentFish?.rarity,
        '| Sell price:',
        this.currentFish?.sellPrice,
      )

      this.scene.time.delayedCall(
        1000,
        () => {
          if (this.state !== 'reeling') {
            return
          }

          this.catchFish()
        },
      )
    }
  }

  private catchFish() {
    if (!this.currentFish) {
      return
    }

    const fish = this.currentFish

    console.log(
      '[Fishing] Successfully caught:',
      fish.name,
    )

    console.log(
      '[Fishing] Earned:',
      fish.sellPrice,
      'coins',
    )

    // Gửi sự kiện để GamePage cộng tiền.
    window.dispatchEvent(
      new CustomEvent('fishing-catch', {
        detail: {
          fish,
          coins: fish.sellPrice,
        },
      }),
    )

    this.destroyFish()
    this.destroyRod()

    // Chuyển sang trạng thái success trong khi feedback đang hiển thị
    this.state = 'success'
    this.prompt.hide()

    // Hiển thị feedback cá và số tiền bay lên trên đầu player (style FarmPlot)
    this.showCatchFeedback(fish)

    // Đợi feedback kết thúc rồi mới reset trạng thái về idle
    this.scene.time.delayedCall(850, () => {
      if (this.state === 'success') {
        this.state = 'idle'
        this.currentSpot = undefined
        this.currentFish = undefined

        console.log(
          '[Fishing] Ready to fish again!',
        )
      }
    })
  }

  getState(): FishingState {
    return this.state
  }
  private getFishVisualConfig(
  fish: FishDefinition,
) {
  switch (fish.id) {
    case 'carp':
      return {
        textureKey: 'fish-koi',
        swimAnimation: 'koi-swim',
        hookedAnimation: 'koi-hooked',
        displayWidth: 60,
      }

    case 'tilapia':
      return {
        textureKey: 'fish-tilapia',
        swimAnimation: 'tilapia-swim',
        hookedAnimation: 'tilapia-hooked',
        displayWidth: 60,
      }

    case 'catfish':
      return {
        textureKey: 'fish-catfish',
        swimAnimation: 'catfish-swim',
        hookedAnimation: 'catfish-hooked',
        displayWidth: 60,
      }

    case 'salmon':
      return {
        textureKey: 'fish-tuna',
        swimAnimation: 'tuna-swim',
        hookedAnimation: 'tuna-hooked',
        displayWidth: 60,
      }

    case 'golden-fish':
      return {
        textureKey: 'golden-fish',
        swimAnimation: 'golden-fish-swim',
        hookedAnimation: 'golden-fish-hooked',
        displayWidth: 60,
      }

    default:
      return {
        textureKey: 'golden-fish',
        swimAnimation: 'golden-fish-swim',
        hookedAnimation: 'golden-fish-hooked',
        displayWidth: 60,
      }
  }
}
  private showFish() {
    if (!this.currentSpot) {
      return
    }

    this.destroyFish()

    const fishX = this.currentSpot.x
    const fishY = this.currentSpot.y

    if (!this.currentFish) {
  return
}

const visual = this.getFishVisualConfig(
  this.currentFish,
)

this.fishSprite = this.scene.add.sprite(
  fishX,
  fishY,
  visual.textureKey,
  0,
)

this.fishSprite.setDisplaySize(
  visual.displayWidth,
  this.fishSprite.displayHeight *
    (visual.displayWidth /
      this.fishSprite.displayWidth),
)

this.fishSprite.setDepth(5)

this.fishSprite.play(
  visual.swimAnimation,
)

console.log(
  '[Fishing] Fish visual spawned:',
  this.currentFish.id,
)

    console.log(
      '[Fishing] Fish visual spawned',
    )
  }

  private destroyFish() {
    if (!this.fishSprite) {
      return
    }

    this.fishSprite.destroy()
    this.fishSprite = undefined
  }

  private showRod(animKey: string) {
    if (!this.rodSprite) {
      this.createRodSprite()
    }
    if (this.rodSprite) {
      this.rodSprite.setVisible(true)
      this.updateRodPosition()
      this.playRodAnim(animKey)
    }
  }

  private playRodAnim(animKey: string) {
    if (!this.rodSprite) {
      return
    }
    if (this.scene.anims.exists(animKey)) {
      this.rodSprite.play(animKey)
    }
  }

  private createRodSprite() {
    if (this.rodSprite) {
      return
    }

    this.ensureRodAnimations()

    this.rodSprite = this.scene.add.sprite(
      this.player.sprite.x,
      this.player.sprite.y,
      'fishing-rod',
      0,
    )
    this.rodSprite.setScale(2.5)
    this.updateRodPosition()
  }

  private ensureRodAnimations() {
    if (!this.scene.anims.exists('rod-idle')) {
      this.scene.anims.create({
        key: 'rod-idle',
        frames: this.scene.anims.generateFrameNumbers('fishing-rod', { frames: [0, 1] }),
        frameRate: 2,
        repeat: -1,
      })
    }
    if (!this.scene.anims.exists('rod-cast')) {
      this.scene.anims.create({
        key: 'rod-cast',
        frames: this.scene.anims.generateFrameNumbers('fishing-rod', { frames: [6, 7, 8, 9] }),
        frameRate: 6,
        repeat: 0,
      })
    }
    if (!this.scene.anims.exists('rod-reel')) {
      this.scene.anims.create({
        key: 'rod-reel',
        frames: this.scene.anims.generateFrameNumbers('fishing-rod', { frames: [12, 13, 14, 15, 16, 17] }),
        frameRate: 8,
        repeat: -1,
      })
    }
  }

  private updateRodPosition() {
    if (!this.rodSprite) {
      return
    }

    const facing = this.player.getFacing ? this.player.getFacing() : this.player.getFacingTile().direction
    const isFacingLeft =
      facing === 'left' ||
      (this.currentSpot ? this.currentSpot.x < this.player.sprite.x : this.player.sprite.flipX)

    // Origin: grip center is at X=25, Y=46 in un-flipped 64x64 frame.
    // When flipped horizontally across center (32), grip center reflects to X=39.
    const originX = isFacingLeft ? 39 / 64 : 25 / 64
    const originY = 46 / 64

    this.rodSprite.setOrigin(originX, originY)
    this.rodSprite.setFlipX(isFacingLeft)

    // Hand offset in world coordinates relative to player center (scale 2.5)
    let offsetX = 10
    let offsetY = 8
    let depth = 101

    if (facing === 'up') {
      offsetX = isFacingLeft ? -8 : 8
      offsetY = 4
      depth = 99 // Behind player body
    } else if (facing === 'down') {
      offsetX = isFacingLeft ? -8 : 8
      offsetY = 12
      depth = 101
    } else if (isFacingLeft) {
      offsetX = -10
      offsetY = 8
      depth = 101
    } else {
      offsetX = 10
      offsetY = 8
      depth = 101
    }

    this.rodSprite.setPosition(
      this.player.sprite.x + offsetX,
      this.player.sprite.y + offsetY,
    )
    this.rodSprite.setDepth(depth)
  }

  private destroyRod() {
    if (!this.rodSprite) {
      return
    }

    this.rodSprite.destroy()
    this.rodSprite = undefined
  }

  private showCatchFeedback(fish: FishDefinition) {
    const playerX = this.player.sprite.x
    const playerY = this.player.sprite.y
    const visual = this.getFishVisualConfig(fish)

    // 1. Animation cá trên đầu player (style animatePop giống FarmPlot)
    const fishSprite = this.scene.add.sprite(
      playerX,
      playerY - 26,
      visual.textureKey,
      0,
    )
    fishSprite.setDepth(501)

    const aspect =
      fishSprite.height > 0 && fishSprite.width > 0
        ? fishSprite.height / fishSprite.width
        : 0.6
    fishSprite.setDisplaySize(38, 38 * aspect)

    if (this.scene.anims.exists(visual.swimAnimation)) {
      fishSprite.play(visual.swimAnimation)
    }

    const baseScaleX = fishSprite.scaleX
    const baseScaleY = fishSprite.scaleY

    this.scene.tweens.add({
      targets: fishSprite,
      scaleX: baseScaleX * 1.4,
      scaleY: baseScaleY * 1.4,
      y: playerY - 34,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: fishSprite,
          alpha: 0,
          y: playerY - 44,
          duration: 350,
          delay: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => fishSprite.destroy(),
        })
      },
    })

    // 2. Hiển thị số tiền bay lên trên đầu player (dùng lại style và timing của FarmPlot)
    this.showFloatingText(
      playerX,
      playerY - 38,
      `+${fish.sellPrice} 🪙`,
      '#ffd700',
    )
  }

  private showFloatingText(
    x: number,
    y: number,
    text: string,
    color = '#ffffff',
  ) {
    const t = this.scene.add
      .text(x, y - 10, text, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(502)

    this.scene.tweens.add({
      targets: t,
      y: y - 45,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
  }

  destroy() {
    this.destroyFish()
    this.destroyRod()
    this.prompt.destroy()
  }
}