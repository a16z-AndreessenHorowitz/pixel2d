import Phaser from 'phaser'

export type FarmPlotStatus = 'initial' | 'tilled' | 'planted' | 'watered'

type FarmPlotOptions = {
  col: number
  row: number
  x: number
  y: number
  size: number
  status?: FarmPlotStatus
}

export class FarmPlot extends Phaser.GameObjects.Container {
  readonly col: number

  readonly row: number

  status: FarmPlotStatus

  private dirtImage: Phaser.GameObjects.Image

  private plantLayer: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, options: FarmPlotOptions) {
    super(scene, options.x, options.y)

    this.col = options.col
    this.row = options.row
    this.status = options.status ?? 'initial'
    this.setName(`farm-plot-${this.row}-${this.col}`)

    this.dirtImage = scene.add.image(0, 0, this.getTextureForStatus(this.status))
    this.dirtImage.setDisplaySize(options.size, options.size)
    this.dirtImage.setInteractive({ useHandCursor: true })
    this.dirtImage.on('pointerdown', () => {
      this.advance()
    })

    this.add([this.dirtImage])
    this.plantLayer = this.createPlantLayer(scene)
    this.add(this.plantLayer)
    this.renderStatus()
  }

  advance() {
    if (this.status === 'initial' || this.status === 'tilled') {
      this.setStatus('planted')
    } else if (this.status === 'planted') {
      this.setStatus('watered')
    } else {
      this.setStatus('initial')
    }
  }

  setStatus(status: FarmPlotStatus) {
    this.status = status
    this.renderStatus()
  }

  private getTextureForStatus(status: FarmPlotStatus): string {
    switch (status) {
      case 'planted':
        return 'dirt-planted'
      case 'watered':
        return 'dirt-watered'
      case 'initial':
      case 'tilled':
      default:
        return 'dirt-initial'
    }
  }

  private createPlantLayer(scene: Phaser.Scene) {
    // Sprout for planted state
    const sproutStem = scene.add.rectangle(0, 4, 3, 10, 0x3e7d32)
    const sproutLeaf1 = scene.add.ellipse(-5, -1, 8, 5, 0x76c953)
    const sproutLeaf2 = scene.add.ellipse(5, -3, 8, 5, 0x5eb140)
    const sproutGroup = scene.add.container(0, 0, [sproutStem, sproutLeaf1, sproutLeaf2])
    sproutGroup.setName('sprout-group')

    // Grown plant for watered state
    const stem = scene.add.rectangle(0, 6, 4, 20, 0x2e7131)
    const leafLeft = scene.add.ellipse(-9, -2, 14, 8, 0x67b84f)
    const leafRight = scene.add.ellipse(9, -5, 14, 8, 0x4e9f41)
    const bud = scene.add.circle(0, -13, 6, 0xf3d15c)
    const fruit = scene.add.circle(0, -13, 4, 0xe84a3f)
    stem.setStrokeStyle(1, 0x1c4d20)
    leafLeft.setStrokeStyle(1, 0x2f7132)
    leafRight.setStrokeStyle(1, 0x2f7132)
    bud.setStrokeStyle(1, 0x9b6e20)
    const grownGroup = scene.add.container(0, 0, [stem, leafLeft, leafRight, bud, fruit])
    grownGroup.setName('grown-group')

    return scene.add.container(0, 0, [sproutGroup, grownGroup])
  }

  private renderStatus() {
    this.dirtImage.setTexture(this.getTextureForStatus(this.status))

    const sprout = this.plantLayer.getByName('sprout-group') as Phaser.GameObjects.Container | null
    const grown = this.plantLayer.getByName('grown-group') as Phaser.GameObjects.Container | null

    if (this.status === 'initial' || this.status === 'tilled') {
      this.plantLayer.setVisible(false)
      if (sprout) sprout.setVisible(false)
      if (grown) grown.setVisible(false)
    } else if (this.status === 'planted') {
      this.plantLayer.setVisible(true)
      if (sprout) sprout.setVisible(true)
      if (grown) grown.setVisible(false)
    } else if (this.status === 'watered') {
      this.plantLayer.setVisible(true)
      if (sprout) sprout.setVisible(false)
      if (grown) grown.setVisible(true)
    }
  }
}
