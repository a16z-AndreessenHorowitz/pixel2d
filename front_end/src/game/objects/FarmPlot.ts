import Phaser from 'phaser'
import type { CropDefinition, CropId } from '../data/crops'
import { getCropById } from '../data/crops'

/**
 * Trạng thái ô đất:
 *  empty   → chưa có gì (hiển thị đất trống)
 *  planted → đã gieo hạt (chưa tưới)
 *  watered → đã tưới, cây đang lớn (timer chạy)
 *  mature  → cây đã trưởng thành, sẵn sàng thu hoạch
 */
export type FarmPlotStatus = 'empty' | 'planted' | 'watered' | 'mature'

type FarmPlotOptions = {
  col: number
  row: number
  x: number
  y: number
  size: number
  status?: FarmPlotStatus
  cropId?: CropId
  onHarvest?: (crop: CropDefinition) => void
}

export class FarmPlot extends Phaser.GameObjects.Container {
  readonly col: number
  readonly row: number

  status: FarmPlotStatus
  cropId: CropId | null

  readonly size: number

  private dirtImage: Phaser.GameObjects.Image
  private cropSprite: Phaser.GameObjects.Image
  private growTimer: Phaser.Time.TimerEvent | null = null

  /** Hiệu ứng ripple xanh khi tưới nước */
  private waterRipple: Phaser.GameObjects.Arc | null = null

  // Progress Bar
  private progressBg: Phaser.GameObjects.Rectangle
  private progressBar: Phaser.GameObjects.Rectangle
  private progressTween: Phaser.Tweens.Tween | null = null

  private cropScale: number = 0.28
  private onHarvestCallback?: (crop: CropDefinition) => void

  constructor(scene: Phaser.Scene, options: FarmPlotOptions) {
    super(scene, options.x, options.y)

    this.col = options.col
    this.row = options.row
    this.size = options.size
    this.status = options.status ?? 'empty'
    this.cropId = options.cropId ?? null
    this.onHarvestCallback = options.onHarvest
    this.setName(`farm-plot-${this.row}-${this.col}`)

    // ── Dirt base ──
    this.dirtImage = scene.add.image(0, 0, 'dirt-initial')
    this.dirtImage.setDisplaySize(options.size, options.size)
    this.dirtImage.setInteractive({ useHandCursor: true })
    this.dirtImage.on('pointerdown', (pointer: Phaser.Input.Pointer, localX: number, localY: number, event: Phaser.Types.Input.EventData) => {
      // Chuyển tiếp sự kiện click từ hình ảnh đất (dirtImage) lên container (FarmPlot)
      this.emit('pointerdown', pointer, localX, localY, event)
    })
    this.add(this.dirtImage)

    // ── Crop sprite (hidden when empty) ──
    const moundOffsetY = options.size * 0.36
    this.cropSprite = scene.add.image(0, moundOffsetY, '__DEFAULT')
    this.cropSprite.setOrigin(0.5, 1)
    this.cropSprite.setVisible(false)
    this.add(this.cropSprite)

    // ── Progress Bar ──
    const barWidth = 32
    const barHeight = 4
    const barY = options.size / 2 - 6 // Đặt dưới cùng của ô đất
    
    this.progressBg = scene.add.rectangle(0, barY, barWidth, barHeight, 0x000000, 0.6)
    this.progressBg.setStrokeStyle(1, 0x000000)
    this.progressBg.setVisible(false)
    this.add(this.progressBg)

    this.progressBar = scene.add.rectangle(-barWidth / 2, barY, barWidth, barHeight, 0x55cc55)
    this.progressBar.setOrigin(0, 0.5) // Grow from left to right
    this.progressBar.scaleX = 0
    this.progressBar.setVisible(false)
    this.add(this.progressBar)

    this.renderStatus()
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Gieo hạt vào ô đất trống. Không làm gì nếu ô đã có cây. */
  plant(cropId: CropId) {
    if (this.status !== 'empty') return
    this.cropId = cropId
    const crop = getCropById(cropId)
    this.cropScale = (this.size / 44) * (crop.scale ?? 0.28)
    this.setStatus('planted')
    this.animateBounce()
    this.showFloatingText('🌱')
  }

  /** Tưới nước. Chỉ hoạt động khi đã gieo hạt (planted). */
  water() {
    if (this.status !== 'planted') return
    this.setStatus('watered')
    this.animateBounce()
    this.showFloatingText('💧')
    this.startGrowTimer()
  }

  /** Thu hoạch. Chỉ hoạt động khi mature. */
  harvest() {
    if (this.status !== 'mature') return
    const crop = getCropById(this.cropId!)

    this.showFloatingText(`+${crop.harvestCoins} 🪙`, '#ffd700')
    this.animatePop()
    this.onHarvestCallback?.(crop)

    // Reset về empty sau animation nhỏ
    this.scene.time.delayedCall(300, () => {
      this.growTimer?.remove()
      this.growTimer = null
      this.progressTween?.remove()
      this.progressTween = null
      this.cropId = null
      this.setStatus('empty')
    })
  }

  /** Xử lý click từ người chơi với tool đang chọn */
  handleTool(tool: string) {
    switch (this.status) {
      case 'empty':
        // Chỉ cho phép dùng seed tool
        if (tool.endsWith('-seed')) {
          const cropId = tool.replace('-seed', '') as CropId
          this.plant(cropId)
        } else {
          this.shake()
        }
        break
      case 'planted':
        if (tool === 'watering-can') {
          this.water()
        } else {
          this.shake()
        }
        break
      case 'watered':
        // Đang lớn, chưa thu hoạch được → shake để thông báo
        this.shake()
        break
      case 'mature':
        if (tool === 'sickle') {
          this.harvest()
        } else {
          this.animateBounce()
        }
        break
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private setStatus(status: FarmPlotStatus) {
    this.status = status
    this.renderStatus()
  }

  private startGrowTimer() {
    if (!this.cropId) return
    const crop = getCropById(this.cropId)

    // Nếu đã có timer cũ thì huỷ
    this.growTimer?.remove()
    this.progressTween?.remove()

    // Chạy thanh thời gian
    this.progressBar.scaleX = 0
    this.progressBg.setVisible(true)
    this.progressBar.setVisible(true)

    this.progressTween = this.scene.tweens.add({
      targets: this.progressBar,
      scaleX: 1,
      duration: crop.growDurationMs,
      ease: 'Linear'
    })

    this.growTimer = this.scene.time.delayedCall(crop.growDurationMs, () => {
      if (this.status === 'watered') {
        this.setStatus('mature')
        this.animatePop()
        this.showFloatingText('✅ Thu hoạch!')
      }
    })
  }

  private renderStatus() {
    // Texture đất
    this.dirtImage.setTexture(this.getDirtTexture())

    if (this.status === 'empty') {
      this.cropSprite.setVisible(false)
      this.progressBg.setVisible(false)
      this.progressBar.setVisible(false)
      return
    }

    if (this.status !== 'watered') {
      this.progressBg.setVisible(false)
      this.progressBar.setVisible(false)
    }

    if (!this.cropId) return
    const crop = getCropById(this.cropId)
    this.cropScale = (this.size / 44) * (crop.scale ?? 0.28)
    this.cropSprite.setScale(this.cropScale)
    this.cropSprite.setTexture(this.getCropFrame())
    this.cropSprite.setVisible(true)
  }

  private getDirtTexture(): string {
    switch (this.status) {
      case 'planted': return 'dirt-planted'
      case 'watered':
      case 'mature': return 'dirt-watered'
      case 'empty':
      default: return 'dirt-initial'
    }
  }

  private getCropFrame(): string {
    if (!this.cropId) return '__DEFAULT'
    const crop = getCropById(this.cropId)
    switch (this.status) {
      case 'planted': return crop.frames[0]  // Hạt giống trên đất
      case 'watered': return crop.frames[1]  // Cây con đang lớn
      case 'mature':  return crop.frames[2]  // Cây trưởng thành
      default: return crop.frames[0]
    }
  }

  private animateBounce() {
    this.scene.tweens.add({
      targets: this.cropSprite,
      scaleX: this.cropScale * 1.2,
      scaleY: this.cropScale * 1.2,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeInOut',
    })
  }

  private animatePop() {
    this.scene.tweens.add({
      targets: this.cropSprite,
      scaleX: this.cropScale * 1.4,
      scaleY: this.cropScale * 1.4,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    })
  }

  private shake() {
    this.scene.tweens.add({
      targets: this.dirtImage,
      x: 3,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
      onComplete: () => { this.dirtImage.setX(0) },
    })
  }

  private showFloatingText(text: string, color = '#ffffff') {
    const t = this.scene.add
      .text(this.x, this.y - 10, text, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(500)

    this.scene.tweens.add({
      targets: t,
      y: this.y - 45,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    })
  }
}
