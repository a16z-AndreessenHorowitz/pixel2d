import Phaser from 'phaser'

export type FacingDirection = 'down' | 'up' | 'left' | 'right'

export type FacingTile = {
  x: number
  y: number
  direction: FacingDirection
}

const playerSpeed = 145
const interactionDistance = 34
const stopDistance = 8

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys

  private wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private facing: FacingDirection = 'down'

  private target?: Phaser.Math.Vector2

  private virtualDirection?: FacingDirection

  private readonly onControl = (event: Event) => {
    const direction = (event as CustomEvent<{ direction?: FacingDirection }>).detail.direction
    this.virtualDirection = direction
    if (direction) {
      this.target = undefined
    }
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.createTextures(scene)
    this.createAnimations(scene)

    this.sprite = scene.physics.add.sprite(x, y, 'player-idle', 0)
    this.sprite.setScale(2.5)
    this.sprite.setDepth(100)
    this.sprite.setCollideWorldBounds(true)
    this.sprite.play('player-idle-down')

    this.cursors = scene.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    document.addEventListener('farm-control', this.onControl)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('farm-control', this.onControl)
    })
  }

  update() {
    const left = this.virtualDirection === 'left' || this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.virtualDirection === 'right' || this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.virtualDirection === 'up' || this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.virtualDirection === 'down' || this.cursors.down.isDown || this.wasd.down.isDown

    let velocityX = 0
    let velocityY = 0

    if (left) {
      velocityX -= 1
    }

    if (right) {
      velocityX += 1
    }

    if (up) {
      velocityY -= 1
    }

    if (down) {
      velocityY += 1
    }

    if (!velocityX && !velocityY && this.target) {
      const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.x, this.target.y)
      if (distance <= stopDistance) {
        this.target = undefined
      } else {
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.target.x, this.target.y)
        velocityX = Math.cos(angle)
        velocityY = Math.sin(angle)
      }
    }

    const isMoving = velocityX !== 0 || velocityY !== 0

    if (isMoving) {
      const velocity = new Phaser.Math.Vector2(velocityX, velocityY)
        .normalize()
        .scale(playerSpeed)

      this.sprite.setVelocity(velocity.x, velocity.y)
      this.updateFacing(velocityX, velocityY)
      this.sprite.setFlipX(this.facing === 'left')
      this.sprite.play(`player-walk-${this.facing}`, true)
      return
    }

    this.sprite.setVelocity(0, 0)
    this.sprite.setFlipX(this.facing === 'left')
    this.sprite.play(`player-idle-${this.facing}`, true)
  }

  moveTo(x: number, y: number) {
    this.target = new Phaser.Math.Vector2(x, y)
    this.virtualDirection = undefined
  }

  getFacingTile(distance = interactionDistance): FacingTile {
    const offsets: Record<FacingDirection, { x: number; y: number }> = {
      down: { x: 0, y: distance },
      up: { x: 0, y: -distance },
      left: { x: -distance, y: 0 },
      right: { x: distance, y: 0 },
    }
    const offset = offsets[this.facing]

    return {
      x: this.sprite.x + offset.x,
      y: this.sprite.y + offset.y,
      direction: this.facing,
    }
  }

  getFacing(): FacingDirection {
    return this.facing
  }

  private updateFacing(velocityX: number, velocityY: number) {
    if (Math.abs(velocityX) >= Math.abs(velocityY) && velocityX !== 0) {
      this.facing = velocityX > 0 ? 'right' : 'left'
      return
    }

    if (velocityY !== 0) {
      this.facing = velocityY > 0 ? 'down' : 'up'
    } else if (velocityX !== 0) {
      this.facing = velocityX > 0 ? 'right' : 'left'
    }
  }

  private createTextures(scene: Phaser.Scene) {
    if (!scene.textures.exists('player-idle') || !scene.textures.exists('player-walk')) {
      throw new Error('Player spritesheets were not loaded before the scene was created.')
    }
  }

  private createAnimations(scene: Phaser.Scene) {
    const directions: FacingDirection[] = ['down', 'up', 'left', 'right']
    // Row 0: Down (hướng xuống), Row 1: Up (hướng lên/lưng), Row 2: Side/Right (hướng sang phải, lật cho trái)
    const rows: Record<FacingDirection, number> = { down: 0, up: 1, left: 2, right: 2 }

    for (const direction of directions) {
      if (!scene.anims.exists(`player-idle-${direction}`)) {
        scene.anims.create({
          key: `player-idle-${direction}`,
          frames: scene.anims.generateFrameNumbers('player-idle', {
            start: rows[direction] * 4,
            end: rows[direction] * 4 + 3,
          }),
          frameRate: 4,
          repeat: -1,
        })
      }

      if (!scene.anims.exists(`player-walk-${direction}`)) {
        scene.anims.create({
          key: `player-walk-${direction}`,
          frames: scene.anims.generateFrameNumbers('player-walk', {
            start: rows[direction] * 6,
            end: rows[direction] * 6 + 5,
          }),
          frameRate: 8,
          repeat: -1,
        })
      }
    }
  }

}
