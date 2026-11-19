import Phaser from 'phaser'

export interface RoamingAnimal {
  sprite: Phaser.GameObjects.Sprite
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/**
 * Khởi tạo Animation cho Gà và Bò
 */
export function createAnimalAnimations(scene: Phaser.Scene) {
  if (!scene.anims.exists('chicken-peck')) {
    scene.anims.create({
      key: 'chicken-peck',
      frames: scene.anims.generateFrameNumbers('chicken', { start: 0, end: 1 }),
      frameRate: 3,
      repeat: -1,
    })
  }

  if (!scene.anims.exists('cow-idle')) {
    scene.anims.create({
      key: 'cow-idle',
      frames: scene.anims.generateFrameNumbers('cow', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
    })
  }
}

/**
 * Sinh đàn gà và đàn bò trong khu vực đồng cỏ
 */
export function spawnPastureAnimals(
  scene: Phaser.Scene,
  pastX: number,
  pastY: number,
  pastW: number,
  pastH: number,
): { chickens: RoamingAnimal[]; cows: RoamingAnimal[] } {
  const chickens: RoamingAnimal[] = []
  const cows: RoamingAnimal[] = []

  // Đàn gà (Chickens)
  const chickenPositions = [
    { x: 300, y: 890 },
    { x: 360, y: 940 },
    { x: 420, y: 900 },
    { x: 260, y: 970 },
    { x: 480, y: 960 },
  ]

  for (const pos of chickenPositions) {
    const ch = scene.add.sprite(pos.x, pos.y, 'chicken', 0)
    ch.setScale(1.6)
    ch.setDepth(pos.y)
    ch.play('chicken-peck')
    chickens.push({
      sprite: ch,
      minX: pastX + 60,
      maxX: pastX + 440,
      minY: pastY + 70,
      maxY: pastY + pastH - 60,
    })
  }

  // Đàn bò (Cows)
  const cowPositions = [
    { x: 720, y: 1020 },
    { x: 820, y: 1080 },
  ]

  for (const pos of cowPositions) {
    const cow = scene.add.sprite(pos.x, pos.y, 'cow', 0)
    cow.setScale(1.8)
    cow.setDepth(pos.y)
    cow.play('cow-idle')
    cows.push({
      sprite: cow,
      minX: pastX + 520,
      maxX: pastX + pastW - 70,
      minY: pastY + 120,
      maxY: pastY + pastH - 70,
    })
  }

  return { chickens, cows }
}

/**
 * Kích hoạt AI di chuyển tự động (Wandering AI) ngẫu nhiên cho gà và bò
 */
export function startAnimalAI(
  scene: Phaser.Scene,
  chickens: RoamingAnimal[],
  cows: RoamingAnimal[],
) {
  // Gà đi dạo ngẫu nhiên
  scene.time.addEvent({
    delay: 3500,
    loop: true,
    callback: () => {
      for (const chicken of chickens) {
        if (Phaser.Math.Between(0, 10) > 3) {
          const targetX = Phaser.Math.Between(chicken.minX, chicken.maxX)
          const targetY = Phaser.Math.Between(chicken.minY, chicken.maxY)
          chicken.sprite.setFlipX(targetX < chicken.sprite.x)

          scene.tweens.add({
            targets: chicken.sprite,
            x: targetX,
            y: targetY,
            duration: Phaser.Math.Between(1500, 2600),
            ease: 'Sine.easeInOut',
            onUpdate: () => {
              chicken.sprite.setDepth(chicken.sprite.y)
            },
          })
        }
      }
    },
  })

  // Bò đi dạo chậm rãi
  scene.time.addEvent({
    delay: 6000,
    loop: true,
    callback: () => {
      for (const cow of cows) {
        if (Phaser.Math.Between(0, 10) > 4) {
          const targetX = Phaser.Math.Between(cow.minX, cow.maxX)
          const targetY = Phaser.Math.Between(cow.minY, cow.maxY)
          cow.sprite.setFlipX(targetX < cow.sprite.x)

          scene.tweens.add({
            targets: cow.sprite,
            x: targetX,
            y: targetY,
            duration: Phaser.Math.Between(2500, 4000),
            ease: 'Sine.easeInOut',
            onUpdate: () => {
              cow.sprite.setDepth(cow.sprite.y)
            },
          })
        }
      }
    },
  })
}
