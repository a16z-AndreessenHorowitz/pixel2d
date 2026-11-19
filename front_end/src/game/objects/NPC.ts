import Phaser from 'phaser'

export interface NPCConfig {
  id: string
  name: string
  role: string
  x: number
  y: number
  texture: string
  frame?: number
  scale?: number
  tint?: number
  actionPrompt?: string
}

export class NPC extends Phaser.GameObjects.Container {
  public readonly id: string
  public readonly npcName: string
  public readonly role: string
  private sprite: Phaser.GameObjects.Sprite
  private promptContainer: Phaser.GameObjects.Container
  private isPlayerNear = false
  private promptTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, config: NPCConfig) {
    super(scene, config.x, config.y)
    this.id = config.id
    this.npcName = config.name
    this.role = config.role

    // 1. NPC Character Sprite
    this.sprite = scene.add.sprite(0, 0, config.texture, config.frame ?? 0)
    this.sprite.setScale(config.scale ?? 1.8)
    if (config.tint) {
      this.sprite.setTint(config.tint)
    }
    this.add(this.sprite)

    // 2. Name Tag above NPC head
    const nameBg = scene.add.graphics()
    const nameText = `${config.name}`
    const textWidth = Math.max(64, nameText.length * 9)
    nameBg.fillStyle(0x0a1020, 0.85)
    nameBg.fillRoundedRect(-textWidth / 2, -44, textWidth, 18, 4)
    nameBg.lineStyle(1.5, 0xf59e0b, 0.9)
    nameBg.strokeRoundedRect(-textWidth / 2, -44, textWidth, 18, 4)
    this.add(nameBg)

    const label = scene.add.text(0, -35, nameText, {
      fontFamily: 'monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fef08a',
    })
    label.setOrigin(0.5, 0.5)
    this.add(label)

    // 3. Floating Interactive Prompt Bubble "[E] Trò chuyện"
    this.promptContainer = scene.add.container(0, -65)
    this.promptContainer.setVisible(false)

    const bubbleGfx = scene.add.graphics()
    const promptText = config.actionPrompt || '[E] Trò chuyện'
    const bubbleW = promptText.length * 8 + 18
    bubbleGfx.fillStyle(0x10b981, 0.95)
    bubbleGfx.fillRoundedRect(-bubbleW / 2, -10, bubbleW, 20, 6)
    bubbleGfx.lineStyle(2, 0xffffff, 1)
    bubbleGfx.strokeRoundedRect(-bubbleW / 2, -10, bubbleW, 20, 6)
    // Little pointer triangle
    bubbleGfx.fillTriangle(0, 13, -5, 10, 5, 10)
    this.promptContainer.add(bubbleGfx)

    const promptLabel = scene.add.text(0, 0, promptText, {
      fontFamily: 'monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff',
    })
    promptLabel.setOrigin(0.5, 0.5)
    this.promptContainer.add(promptLabel)

    this.add(this.promptContainer)

    // Breathing animation for prompt
    this.promptTween = scene.tweens.add({
      targets: this.promptContainer,
      y: -69,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Setup Depth & Interactive Click
    this.setDepth(config.y + 10)
    this.setSize(48, 56)
    this.setInteractive({ useHandCursor: true })

    this.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      this.triggerDialogue()
    })

    this.on('pointerover', () => {
      this.sprite.setScale((config.scale ?? 1.8) * 1.1)
    })

    this.on('pointerout', () => {
      this.sprite.setScale(config.scale ?? 1.8)
    })

    // Global Key Listener for 'E'
    const eKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    eKey?.on('down', () => {
      if (this.isPlayerNear) {
        this.triggerDialogue()
      }
    })

    scene.add.existing(this)
  }

  public updateProximity(playerX: number, playerY: number) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
    const wasNear = this.isPlayerNear
    this.isPlayerNear = dist <= 90

    if (this.isPlayerNear !== wasNear) {
      this.promptContainer.setVisible(this.isPlayerNear)
    }
  }

  public triggerDialogue() {
    window.dispatchEvent(
      new CustomEvent('open-npc-dialogue', {
        detail: {
          npcId: this.id,
          npcName: this.npcName,
        },
      }),
    )
  }

  public destroy(fromScene?: boolean) {
    this.promptTween?.stop()
    super.destroy(fromScene)
  }
}
