import Phaser from 'phaser'

export class Farmer extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, tileSize: number) {
    super(scene, x, y)

    const shadow = scene.add.rectangle(0, tileSize * 0.28, 30, 8, 0x3f5a34, 0.34)
    const body = scene.add.rectangle(0, 4, 24, 28, 0x2d6f8f)
    const shirt = scene.add.rectangle(0, 12, 24, 12, 0xf4c95d)
    const head = scene.add.rectangle(0, -16, 18, 18, 0xe8b47a)
    const hat = scene.add.rectangle(0, -28, 26, 8, 0x7b4f2a)
    const brim = scene.add.rectangle(0, -23, 34, 5, 0x5f3b1d)

    body.setStrokeStyle(2, 0x17384a)
    shirt.setStrokeStyle(2, 0x7b551c)
    head.setStrokeStyle(2, 0x7b4a26)
    hat.setStrokeStyle(2, 0x352010)

    this.add([shadow, body, shirt, head, hat, brim])
    this.setDepth(20)
  }

  walkTo(x: number, y: number) {
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: 120,
      ease: 'Quad.easeOut',
    })
  }
}
