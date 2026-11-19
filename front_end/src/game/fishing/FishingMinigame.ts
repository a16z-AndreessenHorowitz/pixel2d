import Phaser from 'phaser'

type FishingMinigameResult = 'success' | 'failed'

export class FishingMinigame {
  private readonly scene: Phaser.Scene

  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly spaceKey: Phaser.Input.Keyboard.Key

  private readonly barWidth = 360
  private readonly barHeight = 24

  private markerX = 0
  private markerDirection = 1
  private readonly markerSpeed = 260

  private targetX = 0
  private targetWidth = 90

  private progress = 0
  private readonly maxProgress = 5

  private misses = 0
  private readonly maxMisses = 3

  private active = false

  private readonly onComplete: (result: FishingMinigameResult) => void
  private getTargetWidth(catchDifficulty: number) {
  const widths = {
    1: 120,
    2: 105,
    3: 90,
    4: 70,
    5: 50,
  }

  return (
    widths[
      catchDifficulty as keyof typeof widths
    ] ?? 90
  )
}
  constructor(
    scene: Phaser.Scene,
    onComplete: (result: FishingMinigameResult) => void,
  ) {
    this.scene = scene
    this.onComplete = onComplete

    this.graphics = scene.add.graphics()
    this.graphics.setDepth(1000)

    this.spaceKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    )

    this.graphics.setVisible(false)
  }

  start(catchDifficulty: number) {
  this.active = true

  this.progress = 0
  this.misses = 0

  this.markerX = -this.barWidth / 2
  this.markerDirection = 1

  this.targetWidth = this.getTargetWidth(catchDifficulty)

  this.randomizeTarget()

  this.graphics.setVisible(true)

  console.log(
    '[FishingMinigame] Started!',
    'Difficulty:',
    catchDifficulty,
    'Target width:',
    this.targetWidth,
  )
}

  update(delta: number) {
    if (!this.active) {
      return
    }

    this.updateMarker(delta)
    this.handleInput()
    this.draw()
  }

  private updateMarker(delta: number) {
    const movement = this.markerSpeed * (delta / 1000)

    this.markerX += movement * this.markerDirection

    const leftLimit = -this.barWidth / 2
    const rightLimit = this.barWidth / 2

    if (this.markerX >= rightLimit) {
      this.markerX = rightLimit
      this.markerDirection = -1
    }

    if (this.markerX <= leftLimit) {
      this.markerX = leftLimit
      this.markerDirection = 1
    }
  }

  private handleInput() {
    if (!Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      return
    }

    const isInsideTarget =
      Math.abs(this.markerX - this.targetX) <=
      this.targetWidth / 2

    if (isInsideTarget) {
      this.progress += 1

      console.log(
        `[FishingMinigame] Hit! ${this.progress}/${this.maxProgress}`,
      )

      if (this.progress >= this.maxProgress) {
        this.finish('success')
        return
      }
      
      this.randomizeTarget()
    } else {
      this.misses += 1

      console.log(
        `[FishingMinigame] Miss! ${this.misses}/${this.maxMisses}`,
      )

      if (this.misses >= this.maxMisses) {
        this.finish('failed')
      }
    }
  }

  private randomizeTarget() {
    const minX =
      -this.barWidth / 2 + this.targetWidth / 2

    const maxX =
      this.barWidth / 2 - this.targetWidth / 2

    this.targetX = Phaser.Math.FloatBetween(minX, maxX)
  }

  private draw() {
    const camera = this.scene.cameras.main

    const centerX = camera.midPoint.x
    const centerY = camera.midPoint.y

    this.graphics.clear()

    // Background
    this.graphics.fillStyle(0x111827, 0.95)
    this.graphics.fillRoundedRect(
      centerX - 250,
      centerY - 100,
      500,
      200,
      16,
    )

    // Title
    this.graphics.fillStyle(0xffffff, 1)
    this.graphics.fillRect(
      centerX - 150,
      centerY - 70,
      300,
      4,
    )

    // Fishing bar
    const barX = centerX - this.barWidth / 2
    const barY = centerY - this.barHeight / 2

    this.graphics.fillStyle(0x374151, 1)
    this.graphics.fillRoundedRect(
      barX,
      barY,
      this.barWidth,
      this.barHeight,
      8,
    )

    // Target zone
    this.graphics.fillStyle(0x4ade80, 1)
    this.graphics.fillRoundedRect(
      centerX + this.targetX - this.targetWidth / 2,
      barY,
      this.targetWidth,
      this.barHeight,
      8,
    )

    // Marker
    this.graphics.fillStyle(0xffffff, 1)
    this.graphics.fillRect(
      centerX + this.markerX - 3,
      barY - 8,
      6,
      this.barHeight + 16,
    )

    // Progress
    const progressWidth = 300
    const progressHeight = 12

    const progressX =
      centerX - progressWidth / 2

    const progressY = centerY + 45

    this.graphics.fillStyle(0x374151, 1)
    this.graphics.fillRoundedRect(
      progressX,
      progressY,
      progressWidth,
      progressHeight,
      6,
    )

    this.graphics.fillStyle(0x60a5fa, 1)
    this.graphics.fillRoundedRect(
      progressX,
      progressY,
      progressWidth *
        (this.progress / this.maxProgress),
      progressHeight,
      6,
    )

    // Miss indicators
    for (let i = 0; i < this.maxMisses; i++) {
      const x =
        centerX - 30 + i * 30

      this.graphics.fillStyle(
        i < this.misses
          ? 0xef4444
          : 0x4b5563,
        1,
      )

      this.graphics.fillCircle(
        x,
        centerY + 75,
        6,
      )
    }
  }

  private finish(result: FishingMinigameResult) {
    if (!this.active) {
      return
    }

    this.active = false
    this.graphics.setVisible(false)

    console.log(
      `[FishingMinigame] ${result}`,
    )

    this.onComplete(result)
  }

  destroy() {
    this.graphics.destroy()
    this.spaceKey.destroy()
  }
}