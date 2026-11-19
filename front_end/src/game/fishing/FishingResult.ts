import Phaser from 'phaser'
import type { FishDefinition } from './fishingType'

export class FishingResult {
  private readonly scene: Phaser.Scene

  private container?: Phaser.GameObjects.Container

  private readonly onClose: () => void

  constructor(
    scene: Phaser.Scene,
    onClose: () => void,
  ) {
    this.scene = scene
    this.onClose = onClose
  }

  showSuccess(fish: FishDefinition) {
    this.destroy()

    const camera = this.scene.cameras.main

    const centerX = camera.midPoint.x
    const centerY = camera.midPoint.y

    const background = this.scene.add.graphics()

    background.fillStyle(0x111827, 0.96)

    background.fillRoundedRect(
      centerX - 190,
      centerY - 150,
      380,
      300,
      18,
    )

    background.lineStyle(
      3,
      0x4ade80,
      1,
    )

    background.strokeRoundedRect(
      centerX - 190,
      centerY - 150,
      380,
      300,
      18,
    )

    const title = this.scene.add.text(
      centerX,
      centerY - 105,
      '🎣 CAUGHT!',
      {
        fontSize: '30px',
        color: '#4ade80',
        fontStyle: 'bold',
      },
    )

    title.setOrigin(0.5)

    const fishIcon = this.scene.add.text(
      centerX,
      centerY - 35,
      fish.icon,
      {
        fontSize: '52px',
      },
    )

    fishIcon.setOrigin(0.5)

    const fishName = this.scene.add.text(
      centerX,
      centerY + 25,
      fish.name,
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      },
    )

    fishName.setOrigin(0.5)

    const rarity = this.scene.add.text(
      centerX,
      centerY + 60,
      this.getRarityLabel(fish.rarity),
      {
        fontSize: '17px',
        color: '#fbbf24',
      },
    )

    rarity.setOrigin(0.5)

    const value = this.scene.add.text(
      centerX,
      centerY + 92,
      `Sell value: ${fish.sellPrice} coins`,
      {
        fontSize: '16px',
        color: '#d1d5db',
      },
    )

    value.setOrigin(0.5)

    const continueButton = this.createButton(
      centerX,
      centerY + 130,
      'Continue',
      () => {
        this.destroy()
        this.onClose()
      },
    )

    this.container = this.scene.add.container(
      0,
      0,
      [
        background,
        title,
        fishIcon,
        fishName,
        rarity,
        value,
        continueButton,
      ],
    )

    this.container.setDepth(2000)

    console.log(
      '[FishingResult] Showing success:',
      fish.name,
    )
  }

  showFailed() {
    this.destroy()

    const camera = this.scene.cameras.main

    const centerX = camera.midPoint.x
    const centerY = camera.midPoint.y

    const background = this.scene.add.graphics()

    background.fillStyle(0x111827, 0.96)

    background.fillRoundedRect(
      centerX - 190,
      centerY - 120,
      380,
      240,
      18,
    )

    background.lineStyle(
      3,
      0xef4444,
      1,
    )

    background.strokeRoundedRect(
      centerX - 190,
      centerY - 120,
      380,
      240,
      18,
    )

    const title = this.scene.add.text(
      centerX,
      centerY - 65,
      '💨 FISH ESCAPED',
      {
        fontSize: '27px',
        color: '#ef4444',
        fontStyle: 'bold',
      },
    )

    title.setOrigin(0.5)

    const message = this.scene.add.text(
      centerX,
      centerY - 5,
      'The fish got away!',
      {
        fontSize: '19px',
        color: '#ffffff',
      },
    )

    message.setOrigin(0.5)

    const continueButton = this.createButton(
      centerX,
      centerY + 70,
      'Continue',
      () => {
        this.destroy()
        this.onClose()
      },
    )

    this.container = this.scene.add.container(
      0,
      0,
      [
        background,
        title,
        message,
        continueButton,
      ],
    )

    this.container.setDepth(2000)

    console.log(
      '[FishingResult] Showing failed result',
    )
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ) {
    const button = this.scene.add.text(
      x,
      y,
      label,
      {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#2563eb',
        padding: {
          left: 24,
          right: 24,
          top: 10,
          bottom: 10,
        },
      },
    )

    button.setOrigin(0.5)
    button.setInteractive({
      useHandCursor: true,
    })

    button.on('pointerdown', onClick)

    return button
  }

  private getRarityLabel(
    rarity: FishDefinition['rarity'],
  ) {
    const labels = {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
    }

    return labels[rarity]
  }

  destroy() {
    this.container?.destroy(true)
    this.container = undefined
  }
}