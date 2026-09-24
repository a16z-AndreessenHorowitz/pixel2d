import Phaser from 'phaser'

export type PlotStatus = 'empty' | 'planted' | 'harvested'

const tileColors: Record<PlotStatus, number> = {
  empty: 0x8b5a2b,
  planted: 0x5f8f3d,
  harvested: 0xd8a542,
}

export class PlotTile extends Phaser.GameObjects.Container {
  status: PlotStatus = 'empty'

  private background: Phaser.GameObjects.Rectangle

  private furrow: Phaser.GameObjects.Rectangle

  private sprout: Phaser.GameObjects.Container

  private harvestMark: Phaser.GameObjects.Text

  private onHarvest: () => void

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    x: number,
    y: number,
    size: number,
    onHarvest: () => void,
  ) {
    super(scene, x, y)
    this.onHarvest = onHarvest
    this.setName(`plot-${row}-${col}`)

    this.background = scene.add
      .rectangle(0, 0, size, size, tileColors.empty)
      .setStrokeStyle(3, 0x4f361d)
      .setInteractive({ useHandCursor: true })

    this.furrow = scene.add.rectangle(0, 0, size - 14, 8, 0x6e431f, 0.6)
    const stem = scene.add.rectangle(0, 7, 5, 18, 0x2e6d2f)
    const leftLeaf = scene.add.circle(-8, 1, 7, 0x65b84d)
    const rightLeaf = scene.add.circle(8, -3, 7, 0x4f9e3d)
    this.sprout = scene.add.container(0, -2, [stem, leftLeaf, rightLeaf])
    this.sprout.setVisible(false)

    this.harvestMark = scene.add
      .text(0, -3, '+', {
        color: '#5a3716',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '28px',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.add([this.background, this.furrow, this.sprout, this.harvestMark])
    this.background.on('pointerdown', () => this.advance())
  }

  private advance() {
    if (this.status === 'empty') {
      this.setStatus('planted')
      return
    }

    if (this.status === 'planted') {
      this.setStatus('harvested')
      this.onHarvest()
    }
  }

  private setStatus(status: PlotStatus) {
    this.status = status
    this.background.setFillStyle(tileColors[status])
    this.furrow.setVisible(status !== 'harvested')
    this.sprout.setVisible(status === 'planted')
    this.harvestMark.setVisible(status === 'harvested')
  }
}
