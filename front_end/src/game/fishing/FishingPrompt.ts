import Phaser from 'phaser'

export class FishingPrompt {
  private readonly scene: Phaser.Scene

  private container?: Phaser.GameObjects.Container
  private titleText?: Phaser.GameObjects.Text
  private actionText?: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  showIdle(x: number, y: number) {
    this.show(
      x,
      y,
      '🎣 CÂU CÁ',
      '[E] Bắt đầu câu cá',
    )
  }

  showCasting(x: number, y: number) {
    this.show(
      x,
      y,
      '🎣 Đang thả câu...',
      '',
    )
  }

  showWaiting(x: number, y: number) {
    this.show(
      x,
      y,
      '🎣 Đang chờ cá...',
      'Hãy chờ cá cắn câu',
    )
  }

  showBite(x: number, y: number) {
    this.show(
      x,
      y,
      '🐟 CÁ CẮN CÂU!',
      '[E] Kéo cá!',
    )
  }

  hide() {
    this.container?.setVisible(false)
  }

  destroy() {
    this.container?.destroy(true)
    this.container = undefined
  }

  private show(
    x: number,
    y: number,
    title: string,
    action: string,
  ) {
    if (!this.container) {
      this.create()
    }

    this.container!.setPosition(x, y)
    this.container!.setVisible(true)

    this.titleText!.setText(title)
    this.actionText!.setText(action)
  }

  private create() {
    const background = this.scene.add.graphics()

    background.fillStyle(
      0x111827,
      0.92,
    )

    background.fillRoundedRect(
  -105,
  -36,
  210,
  72,
  10,
)

    background.lineStyle(
      2,
      0xffffff,
      0.25,
    )

    background.strokeRoundedRect(
  -105,
  -36,
  210,
  72,
  10,
)

    this.titleText = this.scene.add.text(
      0,
      -15,
      '',
      {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      },
    )

    this.titleText.setOrigin(0.5)

    this.actionText = this.scene.add.text(
      0,
      14,
      '',
      {
        fontSize: '12px',
        color: '#fbbf24',
        align: 'center',
      },
    )

    this.actionText.setOrigin(0.5)

    this.container = this.scene.add.container(
      0,
      0,
      [
        background,
        this.titleText,
        this.actionText,
      ],
    )

    this.container.setDepth(1500)
  }
}