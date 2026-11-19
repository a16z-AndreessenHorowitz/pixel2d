import Phaser from 'phaser'
import { Player } from '../objects/Player'
import { FishingSystem } from '../fishing/fishingSystem'
import { NPC } from '../objects/NPC'
import { preloadFarmAssets } from '../managers/FarmAssetLoader'
import {
  MAP_CONFIG,
  drawTerrainBase,
  buildZone2Residential,
  buildBoundaryAndSigns,
} from '../managers/MapTerrainBuilder'
import { createPlotGrid } from '../managers/PlotGridManager'
import {
  createAnimalAnimations,
  spawnPastureAnimals,
  startAnimalAI,
  type RoamingAnimal,
} from '../managers/AnimalManager'

export class FarmScene extends Phaser.Scene {
  private player?: Player
  private fishingSystem?: FishingSystem
  private chickens: RoamingAnimal[] = []
  private cows: RoamingAnimal[] = []
  private npcs: NPC[] = []
  private isOverview = false
  private readonly defaultZoom = 1.85
  private savedPlayerPos = { x: MAP_CONFIG.dividerCenterX, y: 680 }
  private activeTool = 'watering-can'

  constructor() {
    super('FarmScene')
  }

  // 1. Nạp toàn bộ tài nguyên game (Tách ra FarmAssetLoader)
  preload() {
    preloadFarmAssets(this)
  }

  // 2. Khởi tạo thế giới nông trại
  create() {
    const { mapWidth, mapHeight, dividerCenterX } = MAP_CONFIG
    this.cameras.main.setBackgroundColor('#080a14')
    this.cameras.main.transparent = false
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight)
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)
    this.cameras.main.setZoom(this.defaultZoom)

    // A. Animations
    createAnimalAnimations(this)
    this.createFishingAnimations()

    // B. Dựng địa hình đảo bay & đường đi trung tâm
    drawTerrainBase(this)

    // C. Zone 1: Xây dựng lưới 24 ô đất trồng trọt & Khu nuôi gà, bò
    this.buildZone1Farming()

    // D. Zone 2: Khu nhà ở & hồ cá cảnh quan
    buildZone2Residential(this)

    // E. Biển chỉ dẫn & cây ranh giới
    buildBoundaryAndSigns(this)

    // F. Khởi tạo Player tại giao lộ trung tâm
    this.player = new Player(this, dividerCenterX, 680)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.fishingSystem = new FishingSystem(this, this.player)

    // G. Sinh các NPC đối thoại (Barney & Hazel)
    this.spawnNpcs()

    // H. Lắng nghe các sự kiện điều khiển và công cụ
    this.setupEventListeners()

    // I. Kích hoạt AI di chuyển tự động cho đàn gà & bò
    startAnimalAI(this, this.chickens, this.cows)
  }

  update() {
    this.player?.update()
    this.fishingSystem?.update()
    if (this.player?.sprite) {
      this.savedPlayerPos = { x: this.player.sprite.x, y: this.player.sprite.y }
    }
  }

  /**
   * Zone 1: Lưới ô đất trồng trọt & Khu chăn nuôi gà bò
   */
  private buildZone1Farming() {
    // 1. Tạo lưới 24 ô đất
    createPlotGrid(this, {
      getActiveTool: () => this.activeTool,
    })

    // Vật phẩm trang trí quanh khu trồng trọt
    this.add.image(570, 240, 'bs-wood').setScale(1.2).setDepth(240)
    this.add.image(570, 310, 'bs-chest-wood', 0).setScale(1.5).setDepth(310)
    this.add.image(570, 380, 'bs-barrels', 0).setScale(1.2).setDepth(380)
    this.add.image(130, 260, 'bs-stumps', 0).setScale(1.1).setDepth(260)
    this.add.image(980, 280, 'bs-crates', 0).setScale(1.2).setDepth(280)

    this.add.image(120, 140, 'maple-tree', 1).setScale(1.8).setDepth(160)
    this.add.image(570, 130, 'bs-trees', 0).setScale(1.4).setDepth(150)
    this.add.image(1010, 140, 'maple-tree', 2).setScale(1.8).setDepth(160)

    // 2. Khu chăn thả động vật (Đồng cỏ gà & bò)
    const pastureGfx = this.add.graphics().setDepth(-10)
    const pastX = 140
    const pastY = 780
    const pastW = 890
    const pastH = 490

    pastureGfx.fillStyle(0x6fab40, 0.7)
    pastureGfx.fillRoundedRect(pastX, pastY, pastW, pastH, 16)
    pastureGfx.lineStyle(4, 0x8a6234, 0.9)
    pastureGfx.strokeRoundedRect(pastX, pastY, pastW, pastH, 16)

    pastureGfx.fillStyle(0x614120, 1)
    for (let fx = pastX; fx <= pastX + pastW; fx += 55) {
      pastureGfx.fillRect(fx - 4, pastY - 6, 8, 14)
      pastureGfx.fillRect(fx - 4, pastY + pastH - 6, 8, 14)
    }
    for (let fy = pastY; fy <= pastY + pastH; fy += 55) {
      pastureGfx.fillRect(pastX - 6, fy - 4, 14, 8)
      pastureGfx.fillRect(pastX + pastW - 6, fy - 4, 14, 8)
    }

    // Đống rơm cho ăn
    pastureGfx.fillStyle(0xd9b852, 0.6)
    pastureGfx.fillEllipse(360, 920, 180, 100)
    pastureGfx.fillEllipse(780, 1060, 200, 110)
    pastureGfx.fillStyle(0xc7a442, 0.8)
    pastureGfx.fillEllipse(360, 920, 120, 60)
    pastureGfx.fillEllipse(780, 1060, 130, 70)

    this.add.image(pastX + 50, pastY + 60, 'bs-stumps', 1).setScale(1.2).setDepth(pastY + 70)
    this.add.image(pastX + 110, pastY + 60, 'bs-wood').setScale(1.1).setDepth(pastY + 70)
    this.add.image(pastX + pastW - 60, pastY + 70, 'bs-barrels', 1).setScale(1.2).setDepth(pastY + 80)
    this.add.image(pastX + pastW - 100, pastY + 70, 'bs-barrels', 2).setScale(1.2).setDepth(pastY + 80)

    // Sinh động vật qua AnimalManager
    const { chickens, cows } = spawnPastureAnimals(this, pastX, pastY, pastW, pastH)
    this.chickens = chickens
    this.cows = cows
  }

  /**
   * Sinh các nhân vật NPC tương tác trong thị trấn
   */
  private spawnNpcs() {
    const barney = new NPC(this, {
      id: 'barney',
      name: '👨‍🌾 Barney',
      role: 'Hướng dẫn viên',
      x: 1080,
      y: 640,
      texture: 'npc-barney',
      frame: 0,
      scale: 1.5,
      actionPrompt: '[E] Trò chuyện',
    })

    const hazel = new NPC(this, {
      id: 'hazel',
      name: '👩‍🌾 Hazel',
      role: 'Chủ Tạp Hóa',
      x: 1620,
      y: 440,
      texture: 'npc-hazel',
      frame: 0,
      scale: 1.7,
      tint: 0xffe4b5,
      actionPrompt: '[E] Mua / Bán',
    })

    this.npcs.push(barney, hazel)
  }

  /**
   * Đăng ký các sự kiện tương tác phím, chuột và React Bridge
   */
  private setupEventListeners() {
    // 1. Tool changed từ Toolbar React
    const onToolChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tool: string }>
      if (customEvent.detail?.tool) {
        this.activeTool = customEvent.detail.tool
      }
    }
    window.addEventListener('farm-tool-changed', onToolChange)

    // 2. Chuyển đổi góc nhìn bản đồ toàn cảnh (Map Overview)
    const onToggleOverview = (e: Event) => {
      const customEvent = e as CustomEvent<{ overview?: boolean }>
      const target = typeof customEvent.detail?.overview === 'boolean'
        ? customEvent.detail.overview
        : !this.isOverview
      this.setMapOverview(target)
    }
    window.addEventListener('toggle-map-overview', onToggleOverview)

    // Phím tắt 'M' mở bản đồ
    const mKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    mKey?.on('down', () => {
      this.setMapOverview(!this.isOverview)
      window.dispatchEvent(
        new CustomEvent('farm-overview-changed', { detail: { overview: this.isOverview } })
      )
    })

    // Click chuột di chuyển Player (nếu không bấm vào ô đất)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.downElement || (pointer.downElement as HTMLElement).tagName === 'CANVAS') {
        this.player?.moveTo(pointer.worldX, pointer.worldY)
      }
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('farm-tool-changed', onToolChange)
      window.removeEventListener('toggle-map-overview', onToggleOverview)
    })
  }

  /**
   * Chế độ xem toàn cảnh hòn đảo (Map Overview Zoom)
   */
  public setMapOverview(enable: boolean) {
    const { mapWidth, mapHeight } = MAP_CONFIG
    this.isOverview = enable

    if (enable) {
      if (this.player?.sprite) {
        this.savedPlayerPos = { x: this.player.sprite.x, y: this.player.sprite.y }
      }
      this.cameras.main.stopFollow()
      this.cameras.main.useBounds = false

      const padFactor = 0.86
      const fitZoomX = (this.scale.width * padFactor) / mapWidth
      const fitZoomY = (this.scale.height * padFactor) / mapHeight
      const targetZoom = Math.min(fitZoomX, fitZoomY)

      this.cameras.main.pan(mapWidth / 2, mapHeight / 2, 500, 'Cubic.easeInOut')
      this.cameras.main.zoomTo(targetZoom, 500, 'Cubic.easeInOut')
    } else {
      const targetX = this.savedPlayerPos.x
      const targetY = this.savedPlayerPos.y

      this.cameras.main.pan(targetX, targetY, 500, 'Cubic.easeInOut')
      this.cameras.main.zoomTo(this.defaultZoom, 500, 'Cubic.easeInOut')

      this.time.delayedCall(520, () => {
        if (!this.isOverview && this.player?.sprite) {
          this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)
          this.cameras.main.useBounds = true
          this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
        }
      })
    }
  }

  private createFishingAnimations() {
    if (!this.anims.exists('golden-fish-swim')) {
      this.anims.create({
        key: 'golden-fish-swim',
        frames: this.anims.generateFrameNumbers('golden-fish', { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: 'golden-fish-hooked',
        frames: this.anims.generateFrameNumbers('golden-fish', { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1,
      })
      this.createFishAnimations('fish-koi', 'koi')
      this.createFishAnimations('fish-tilapia', 'tilapia')
      this.createFishAnimations('fish-catfish', 'catfish')
      this.createFishAnimations('fish-tuna', 'tuna')

      this.anims.create({
        key: 'rod-idle',
        frames: this.anims.generateFrameNumbers('fishing-rod', { frames: [0, 1] }),
        frameRate: 2,
        repeat: -1,
      })
      this.anims.create({
        key: 'rod-cast',
        frames: this.anims.generateFrameNumbers('fishing-rod', { frames: [6, 7, 8, 9] }),
        frameRate: 6,
        repeat: 0,
      })
      this.anims.create({
        key: 'rod-reel',
        frames: this.anims.generateFrameNumbers('fishing-rod', { frames: [12, 13, 14, 15, 16, 17] }),
        frameRate: 8,
        repeat: -1,
      })
    }
  }

  private createFishAnimations(textureKey: string, animationName: string) {
    if (!this.anims.exists(`${animationName}-swim`)) {
      this.anims.create({
        key: `${animationName}-swim`,
        frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 6 }),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `${animationName}-hooked`,
        frames: this.anims.generateFrameNumbers(textureKey, { start: 8, end: 15 }),
        frameRate: 10,
        repeat: -1,
      })
    }
  }
}
