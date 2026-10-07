import Phaser from 'phaser'
import { FarmPlot } from '../objects/FarmPlot'
import { Player } from '../objects/Player'
import { crops } from '../data/crops'
import { FishingSystem } from '../fishing/fishingSystem'
// Total map dimensions
const mapWidth = 2400
const mapHeight = 1400
const mapPadding = 48

// Central dividing road
const dividerCenterX = 1200
const roadWidth = 110

// Zone 1: Farm Grid settings
const plotSize = 44
const plotGap = 4

// Grass tile scaling (điều chỉnh kích thước hạt cỏ / vân cỏ trên toàn map)
const grassTileScale = 0.5

interface RoamingAnimal {
  sprite: Phaser.GameObjects.Sprite
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export class FarmScene extends Phaser.Scene {
  private player?: Player
  private fishingSystem?: FishingSystem
  private chickens: RoamingAnimal[] = []
  private cows: RoamingAnimal[] = []
  private isOverview = false
  private readonly defaultZoom = 1.85
  private savedPlayerPos = { x: dividerCenterX, y: 680 }
  /** Tool đang được chọn từ React toolbar */
  private activeTool = 'watering-can'

  constructor() {
    super('FarmScene')
  }

  preload() {
    // ── Player Sprites ──
    this.load.spritesheet('player-idle', '/assets/player/idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('player-walk', '/assets/player/walk.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    // ── Crop & Soil Textures (Used by FarmPlot) ──
    this.load.image('dirt-initial', '/assets/corp/tilled_light_dirt_final.png')
    this.load.image('dirt-planted', '/assets/corp/cracked_dirt_final.png')
    this.load.image('dirt-watered', '/assets/corp/plain_dirt_bottom_final.png')

    // ── Preload Crop Frames (Corn, Rice, Strawberry, Pumpkin, Watermelon) ──
    crops.forEach((crop) => {
      crop.frames.forEach((frameKey, index) => {
        this.load.image(frameKey, `/assets/crops/${crop.id}-${index + 1}.png`)
      })
    })

    // ── Architecture & Buildings ──
    this.load.image('house', '/assets/objects/house.png')

    // ── Trees (Properly sliced frames) ──
    this.load.spritesheet('maple-tree', '/assets/objects/maple-tree.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet('bs-trees', '/assets/bloomseed/props/trees.png', {
      frameWidth: 64,
      frameHeight: 64,
    })

    // ── Animals ──
    this.load.spritesheet('chicken', '/assets/animals/chicken-red.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('cow', '/assets/animals/male-cow-brown.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    // ── Validated Props (Verified integer frames) ──
    this.load.spritesheet('bs-stumps', '/assets/bloomseed/props/stumps.png', {
      frameWidth: 56,
      frameHeight: 48,
    })
    this.load.image('bs-wood', '/assets/bloomseed/props/wood.png')
    this.load.spritesheet('bs-barrels', '/assets/bloomseed/props/barrels.png', {
      frameWidth: 40,
      frameHeight: 32,
    })
    this.load.spritesheet('bs-crates', '/assets/bloomseed/props/crates.png', {
      frameWidth: 32,
      frameHeight: 36,
    })
    this.load.spritesheet('bs-chest-wood', '/assets/bloomseed/chests/wood.png', {
      frameWidth: 32,
      frameHeight: 26,
    })
    this.load.spritesheet('bs-chest-gold', '/assets/bloomseed/chests/gold.png', {
      frameWidth: 32,
      frameHeight: 26,
    })
    // ── Fishing Fish Sprites ──
this.load.spritesheet(
  'golden-fish',
  '/assets/fishing/golden-fish.png',
  {
    frameWidth: 362,
    frameHeight: 362,
  },
)

this.load.spritesheet(
  'fish-koi',
  '/assets/fishing/fish1_processed/koi.png',
  {
    frameWidth: 144,
    frameHeight: 88,
  },
)

this.load.spritesheet(
  'fish-tilapia',
  '/assets/fishing/fish1_processed/tilapia.png',
  {
    frameWidth: 136,
    frameHeight: 80,
  },
)

this.load.spritesheet(
  'fish-catfish',
  '/assets/fishing/fish1_processed/catfish.png',
  {
    frameWidth: 128,
    frameHeight: 80,
  },
)

this.load.spritesheet(
  'fish-tuna',
  '/assets/fishing/fish1_processed/tuna.png',
  {
    frameWidth: 140,
    frameHeight: 88,
  },
)
this.load.spritesheet(
  'fishing-rod',
  '/assets/fishing/fishing-rod.png',
  {
    frameWidth: 64,
    frameHeight: 64,
  },
)
    // ── Grass Sheet Texture & Nature Decals ──
    this.load.image('grass-texture', '/assets/grass-pixel-warm512.png')
    this.load.image('flower-white', '/assets/flower-white.png')
    this.load.image('flower-yellow', '/assets/flower-yellow.png')
    this.load.image('flower-daisy', '/assets/flower-daisy.png')
    this.load.image('pebbles', '/assets/pebbles.png')
  }

  create() {
    this.cameras.main.setBackgroundColor('#080a14')
    this.cameras.main.transparent = false
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight)
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)
    this.cameras.main.setZoom(this.defaultZoom)

    this.createAnimalAnimations()
    this.createFishingAnimations()
    // 1. Draw starry cosmos & floating island terrain base
    this.drawTerrainBase()

    // 2. Build Zone 1: Nông trại & Chăn nuôi (Left side)
    this.buildZone1Farming()

    // 3. Build Zone 2: Nhà ở & Trang trí (Right side)
    this.buildZone2Residential()

    // 4. Directional signs & perimeter natural trees
    this.buildBoundaryAndSigns()

    // 5. Initialize Player at central crossway
    this.player = new Player(this, dividerCenterX, 680)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12)
    this.fishingSystem = new FishingSystem(
  this,
  this.player,
)
    // Player touch/mouse movement (chỉ di chuyển khi không click vào farm plot)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Nếu pointer đang over một interactive object (FarmPlot), không di chuyển player
      if (!pointer.downElement || (pointer.downElement as HTMLElement).tagName === 'CANVAS') {
        this.player?.moveTo(pointer.worldX, pointer.worldY)
      }
    })

    // Lắng nghe toolbar tool-change từ React
    const onToolChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tool: string }>
      if (customEvent.detail?.tool) {
        this.activeTool = customEvent.detail.tool
      }
    }
    window.addEventListener('farm-tool-changed', onToolChange)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('farm-tool-changed', onToolChange)
    })

    // Setup Map Overview Listeners
    const onToggleOverview = (e: Event) => {
      const customEvent = e as CustomEvent<{ overview?: boolean }>
      const target = typeof customEvent.detail?.overview === 'boolean'
        ? customEvent.detail.overview
        : !this.isOverview
      this.setMapOverview(target)
    }

    window.addEventListener('toggle-map-overview', onToggleOverview)

    // Keyboard shortcut 'M' to toggle map overview
    const mKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    mKey?.on('down', () => {
      this.setMapOverview(!this.isOverview)
      window.dispatchEvent(
        new CustomEvent('farm-overview-changed', { detail: { overview: this.isOverview } })
      )
    })

    // Handle screen resize while in overview mode
    this.scale.on('resize', () => {
      if (this.isOverview) {
        const padFactor = 0.86
        const fitZoomX = (this.scale.width * padFactor) / mapWidth
        const fitZoomY = (this.scale.height * padFactor) / mapHeight
        const targetZoom = Math.min(fitZoomX, fitZoomY)
        this.cameras.main.setZoom(targetZoom)
      }
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('toggle-map-overview', onToggleOverview)
    })

    // Start animal roaming AI
    this.startAnimalAI()
  }

  update() {
  this.player?.update()
  this.fishingSystem?.update()
}

  private setMapOverview(overview: boolean) {
    console.log('[FarmScene] setMapOverview called with:', overview, 'current isOverview:', this.isOverview)
    if (this.isOverview === overview) return
    this.isOverview = overview

    if (this.isOverview) {
      this.savedPlayerPos = {
        x: this.player?.sprite.x ?? dividerCenterX,
        y: this.player?.sprite.y ?? 680,
      }

      this.cameras.main.stopFollow()
      this.cameras.main.useBounds = false

      const padFactor = 0.82
      const fitZoomX = (this.scale.width * padFactor) / mapWidth
      const fitZoomY = (this.scale.height * padFactor) / mapHeight
      const targetZoom = Math.min(fitZoomX, fitZoomY)

      console.log('[FarmScene] OVERVIEW ACTIVATED! scale:', this.scale.width, this.scale.height, 'targetZoom:', targetZoom)

      this.cameras.main.pan(mapWidth / 2, mapHeight / 2, 500, 'Cubic.easeInOut')
      this.cameras.main.zoomTo(targetZoom, 500, 'Cubic.easeInOut')
    } else {
      const targetX = this.savedPlayerPos.x
      const targetY = this.savedPlayerPos.y

      console.log('[FarmScene] RESTORING NORMAL VIEW! target:', targetX, targetY)

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

  private createAnimalAnimations() {
    if (!this.anims.exists('chicken-peck')) {
      this.anims.create({
        key: 'chicken-peck',
        frames: this.anims.generateFrameNumbers('chicken', { start: 0, end: 1 }),
        frameRate: 3,
        repeat: -1,
      })
    }

    if (!this.anims.exists('cow-idle')) {
      this.anims.create({
        key: 'cow-idle',
        frames: this.anims.generateFrameNumbers('cow', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      })
    }
  }
  private createFishingAnimations() {
  // ── Golden Fish ──
  this.anims.create({
    key: 'golden-fish-swim',
    frames: this.anims.generateFrameNumbers(
      'golden-fish',
      {
        start: 0,
        end: 5,
      },
    ),
    frameRate: 8,
    repeat: -1,
  })

  this.anims.create({
    key: 'golden-fish-hooked',
    frames: this.anims.generateFrameNumbers(
      'golden-fish',
      {
        start: 6,
        end: 11,
      },
    ),
    frameRate: 10,
    repeat: -1,
  })

  // ── Koi / Carp ──
  this.createFishAnimations(
    'fish-koi',
    'koi',
  )

  // ── Tilapia ──
  this.createFishAnimations(
    'fish-tilapia',
    'tilapia',
  )

  // ── Catfish ──
  this.createFishAnimations(
    'fish-catfish',
    'catfish',
  )

  // ── Tuna / Salmon placeholder ──
  this.createFishAnimations(
    'fish-tuna',
    'tuna',
  )
  // ── Fishing Rod ──
this.anims.create({
  key: 'rod-idle',
  frames: this.anims.generateFrameNumbers(
    'fishing-rod',
    {
      frames: [0, 1],
    },
  ),
  frameRate: 2,
  repeat: -1,
})

this.anims.create({
  key: 'rod-cast',
  frames: this.anims.generateFrameNumbers(
    'fishing-rod',
    {
      frames: [6, 7, 8, 9],
    },
  ),
  frameRate: 6,
  repeat: 0,
})

this.anims.create({
  key: 'rod-reel',
  frames: this.anims.generateFrameNumbers(
    'fishing-rod',
    {
      frames: [12, 13, 14, 15, 16, 17],
    },
  ),
  frameRate: 8,
  repeat: -1,
})
}
private createFishAnimations(
  textureKey: string,
  animationName: string,
) {
  this.anims.create({
    key: `${animationName}-swim`,
    frames: this.anims.generateFrameNumbers(
      textureKey,
      {
        start: 0,
        end: 6,
      },
    ),
    frameRate: 8,
    repeat: -1,
  })

  this.anims.create({
    key: `${animationName}-hooked`,
    frames: this.anims.generateFrameNumbers(
      textureKey,
      {
        start: 8,
        end: 15,
      },
    ),
    frameRate: 10,
    repeat: -1,
  })
}
  /**
   * Base Terrain & Central Dividing Road
   */
  private drawTerrainBase() {
    const bgGfx = this.add.graphics().setDepth(-20)

    // Deep cosmic space backdrop around the island (just like in play.pixels.xyz)
    bgGfx.fillStyle(0x070913, 1)
    bgGfx.fillRect(-600, -600, mapWidth + 1200, mapHeight + 1200)

    // Twinkling stars in deep space
    bgGfx.fillStyle(0xffffff, 0.75)
    const starCoords = [
      [-120, -80], [-250, 400], [-180, 900], [-100, 1300],
      [500, -160], [1200, -180], [1800, -150], [2200, -120],
      [mapWidth + 120, 200], [mapWidth + 240, 700], [mapWidth + 150, 1100],
      [400, mapHeight + 140], [1000, mapHeight + 180], [1600, mapHeight + 150], [2100, mapHeight + 120],
    ]
    for (const [sx, sy] of starCoords) {
      bgGfx.fillCircle(sx, sy, 2)
      bgGfx.fillCircle(sx + 30, sy - 20, 1.5)
      // sparkle cross
      bgGfx.fillRect(sx - 3, sy, 7, 1)
      bgGfx.fillRect(sx, sy - 3, 1, 7)
    }

    // Floating island stone cliff base (depth beneath the island)
    bgGfx.fillStyle(0x1d3314, 0.95)
    bgGfx.fillRoundedRect(mapPadding - 14, mapPadding - 14, mapWidth - (mapPadding - 14) * 2, mapHeight - (mapPadding - 14) * 2 + 32, 54)

    bgGfx.fillStyle(0x385c21, 0.95)
    bgGfx.fillRoundedRect(mapPadding - 8, mapPadding - 8, mapWidth - (mapPadding - 8) * 2, mapHeight - (mapPadding - 8) * 2 + 16, 48)

    // Inner island lush grass surface using the authentic asset grass texture!
    const islandW = mapWidth - mapPadding * 2
    const islandH = mapHeight - mapPadding * 2
    const islandCenterX = mapWidth / 2
    const islandCenterY = mapHeight / 2

    const grassTileSprite = this.add.tileSprite(
      islandCenterX,
      islandCenterY,
      islandW,
      islandH,
      'grass-texture'
    )
    grassTileSprite.setTileScale(grassTileScale, grassTileScale)
    grassTileSprite.setDepth(-18)

    // Apply smooth rounded corner geometry mask to the grass tileSprite
    const maskShape = this.make.graphics()
    maskShape.fillStyle(0xffffff)
    maskShape.fillRoundedRect(mapPadding, mapPadding, islandW, islandH, 40)
    grassTileSprite.setMask(maskShape.createGeometryMask())

    // Island perimeter highlight stroke
    bgGfx.lineStyle(4, 0x8ed35a, 0.8)
    bgGfx.strokeRoundedRect(mapPadding, mapPadding, islandW, islandH, 40)

    // Scatter nature flower and pebble decals from the grass sheet (scaled down to match pixel art)
    const natureDecals = [
      { key: 'flower-white', x: 260, y: 140, scale: 0.45 },
      { key: 'flower-yellow', x: 420, y: 120, scale: 0.45 },
      { key: 'flower-daisy', x: 860, y: 150, scale: 0.45 },
      { key: 'pebbles', x: 220, y: 560, scale: 0.45 },
      { key: 'flower-yellow', x: 740, y: 580, scale: 0.45 },
      { key: 'flower-white', x: 920, y: 520, scale: 0.45 },
      { key: 'flower-daisy', x: 1420, y: 180, scale: 0.45 },
      { key: 'flower-yellow', x: 1980, y: 160, scale: 0.45 },
      { key: 'flower-white', x: 2180, y: 220, scale: 0.45 },
      { key: 'pebbles', x: 1360, y: 560, scale: 0.45 },
      { key: 'flower-daisy', x: 2120, y: 620, scale: 0.45 },
      { key: 'pebbles', x: 240, y: 1240, scale: 0.45 },
      { key: 'flower-yellow', x: 800, y: 1260, scale: 0.45 },
      { key: 'flower-white', x: 1420, y: 1260, scale: 0.45 },
      { key: 'flower-daisy', x: 2050, y: 1220, scale: 0.45 },
      { key: 'flower-white', x: 1540, y: 720, scale: 0.45 },
      { key: 'flower-yellow', x: 2020, y: 760, scale: 0.45 },
    ]

    for (const d of natureDecals) {
      this.add.image(d.x, d.y, d.key).setScale(d.scale).setDepth(-17)
    }

    // ── CENTRAL DIVIDING ROAD (Con đường ngăn cách 2 khu) ──
    const roadGfx = this.add.graphics().setDepth(-15)
    const roadX = dividerCenterX - roadWidth / 2
    const roadY = mapPadding
    const roadH = mapHeight - mapPadding * 2

    // Road shadow & base
    roadGfx.fillStyle(0xb39d73, 0.95)
    roadGfx.fillRect(roadX - 4, roadY, roadWidth + 8, roadH)

    // Road cobblestone surface
    roadGfx.fillStyle(0xd5c49b, 1)
    roadGfx.fillRect(roadX, roadY, roadWidth, roadH)

    // Road stone edges
    roadGfx.lineStyle(3, 0x937c56, 0.8)
    roadGfx.strokeRect(roadX, roadY, roadWidth, roadH)

    // Decorative flagstones along the road
    roadGfx.fillStyle(0xc1af85, 0.7)
    for (let y = roadY + 20; y < roadY + roadH - 20; y += 45) {
      roadGfx.fillRoundedRect(roadX + 16, y, roadWidth - 32, 28, 4)
      roadGfx.fillCircle(roadX + 28, y + 14, 3)
      roadGfx.fillCircle(roadX + roadWidth - 28, y + 14, 3)
    }

    // Horizontal connecting crossroad in center
    const crossY = 640
    const crossH = 90
    roadGfx.fillStyle(0xb39d73, 0.95)
    roadGfx.fillRect(400, crossY - 4, 1600, crossH + 8)
    roadGfx.fillStyle(0xd5c49b, 1)
    roadGfx.fillRect(400, crossY, 1600, crossH)
    roadGfx.lineStyle(3, 0x937c56, 0.8)
    roadGfx.strokeRect(400, crossY, 1600, crossH)

    // (Tuft circular graphics removed to keep the pixel grass clean and crisp)
  }

  /**
   * ZONE 1: KHU NÔNG TRẠI & CHĂN NUÔI (Farming & Animal Husbandry)
   */
  private buildZone1Farming() {
    // ── 1. KHU TRỒNG CÂY (Crop Fields) ──
    const farmGfx = this.add.graphics().setDepth(-10)

    // Dark fertile soil backing for West field (Plot A)
    const plotA_Cols = 7
    const plotA_Rows = 5
    const plotA_X = 180
    const plotA_Y = 180
    const fieldA_W = plotA_Cols * (plotSize + plotGap)
    const fieldA_H = plotA_Rows * (plotSize + plotGap)

    farmGfx.fillStyle(0x4b782c, 0.85) // Raised dirt frame
    farmGfx.fillRoundedRect(plotA_X - 18, plotA_Y - 18, fieldA_W + 36, fieldA_H + 36, 12)
    farmGfx.fillStyle(0x735133, 0.95) // Rich farm soil
    farmGfx.fillRoundedRect(plotA_X - 8, plotA_Y - 8, fieldA_W + 16, fieldA_H + 16, 8)
    farmGfx.lineStyle(3, 0x3d2716, 0.8)
    farmGfx.strokeRoundedRect(plotA_X - 8, plotA_Y - 8, fieldA_W + 16, fieldA_H + 16, 8)

    // Field A – tất cả ô bắt đầu trống
    for (let r = 0; r < plotA_Rows; r++) {
      for (let c = 0; c < plotA_Cols; c++) {
        const px = plotA_X + c * (plotSize + plotGap) + plotSize / 2
        const py = plotA_Y + r * (plotSize + plotGap) + plotSize / 2
        const plot = new FarmPlot(this, {
          col: c,
          row: r,
          x: px,
          y: py,
          size: plotSize,
          status: 'empty',
          onHarvest: (crop) => {
            window.dispatchEvent(new CustomEvent('farm-harvest', { detail: { crop } }))
          },
        })
        plot.setDepth(20 + r)
        // Click vào plot → dùng tool hiện tại
        plot.setInteractive()
        plot.on('pointerdown', (_ptr: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation()
          plot.handleTool(this.activeTool)
        })
        this.add.existing(plot)
      }
    }

    // East field (Plot B)
    const plotB_Cols = 6
    const plotB_Rows = 5
    const plotB_X = 640
    const plotB_Y = 180
    const fieldB_W = plotB_Cols * (plotSize + plotGap)
    const fieldB_H = plotB_Rows * (plotSize + plotGap)

    farmGfx.fillStyle(0x4b782c, 0.85)
    farmGfx.fillRoundedRect(plotB_X - 18, plotB_Y - 18, fieldB_W + 36, fieldB_H + 36, 12)
    farmGfx.fillStyle(0x735133, 0.95)
    farmGfx.fillRoundedRect(plotB_X - 8, plotB_Y - 8, fieldB_W + 16, fieldB_H + 16, 8)
    farmGfx.lineStyle(3, 0x3d2716, 0.8)
    farmGfx.strokeRoundedRect(plotB_X - 8, plotB_Y - 8, fieldB_W + 16, fieldB_H + 16, 8)

    // Field B – tất cả ô bắt đầu trống
    for (let r = 0; r < plotB_Rows; r++) {
      for (let c = 0; c < plotB_Cols; c++) {
        const px = plotB_X + c * (plotSize + plotGap) + plotSize / 2
        const py = plotB_Y + r * (plotSize + plotGap) + plotSize / 2
        const plot = new FarmPlot(this, {
          col: c,
          row: r,
          x: px,
          y: py,
          size: plotSize,
          status: 'empty',
          onHarvest: (crop) => {
            window.dispatchEvent(new CustomEvent('farm-harvest', { detail: { crop } }))
          },
        })
        plot.setDepth(20 + r)
        plot.setInteractive()
        plot.on('pointerdown', (_ptr: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation()
          plot.handleTool(this.activeTool)
        })
        this.add.existing(plot)
      }
    }

    // Farming Props around field
    this.add.image(570, 240, 'bs-wood').setScale(1.2).setDepth(240)
    this.add.image(570, 310, 'bs-chest-wood', 0).setScale(1.5).setDepth(310)
    this.add.image(570, 380, 'bs-barrels', 0).setScale(1.2).setDepth(380)
    this.add.image(130, 260, 'bs-stumps', 0).setScale(1.1).setDepth(260)
    this.add.image(980, 280, 'bs-crates', 0).setScale(1.2).setDepth(280)

    // Shade trees bordering crop field
    this.add.image(120, 140, 'maple-tree', 1).setScale(1.8).setDepth(160)
    this.add.image(570, 130, 'bs-trees', 0).setScale(1.4).setDepth(150)
    this.add.image(1010, 140, 'maple-tree', 2).setScale(1.8).setDepth(160)

    // ── 2. KHU NUÔI GÀ & BÒ (Animal Pasture - Bottom Half) ──
    const pastureGfx = this.add.graphics().setDepth(-10)

    const pastX = 140
    const pastY = 780
    const pastW = 890
    const pastH = 490

    // Pasture fencing enclosure base
    pastureGfx.fillStyle(0x6fab40, 0.7)
    pastureGfx.fillRoundedRect(pastX, pastY, pastW, pastH, 16)
    pastureGfx.lineStyle(4, 0x8a6234, 0.9)
    pastureGfx.strokeRoundedRect(pastX, pastY, pastW, pastH, 16)

    // Fence posts at intervals
    pastureGfx.fillStyle(0x614120, 1)
    for (let fx = pastX; fx <= pastX + pastW; fx += 55) {
      pastureGfx.fillRect(fx - 4, pastY - 6, 8, 14)
      pastureGfx.fillRect(fx - 4, pastY + pastH - 6, 8, 14)
    }
    for (let fy = pastY; fy <= pastY + pastH; fy += 55) {
      pastureGfx.fillRect(pastX - 6, fy - 4, 14, 8)
      pastureGfx.fillRect(pastX + pastW - 6, fy - 4, 14, 8)
    }

    // Golden hay patches for feeding
    pastureGfx.fillStyle(0xd9b852, 0.6)
    pastureGfx.fillEllipse(360, 920, 180, 100)
    pastureGfx.fillEllipse(780, 1060, 200, 110)
    pastureGfx.fillStyle(0xc7a442, 0.8)
    pastureGfx.fillEllipse(360, 920, 120, 60)
    pastureGfx.fillEllipse(780, 1060, 130, 70)

    // Pasture props
    this.add.image(pastX + 50, pastY + 60, 'bs-stumps', 1).setScale(1.2).setDepth(pastY + 70)
    this.add.image(pastX + 110, pastY + 60, 'bs-wood').setScale(1.1).setDepth(pastY + 70)
    this.add.image(pastX + pastW - 60, pastY + 70, 'bs-barrels', 1).setScale(1.2).setDepth(pastY + 80)
    this.add.image(pastX + pastW - 100, pastY + 70, 'bs-barrels', 2).setScale(1.2).setDepth(pastY + 80)

    // ── Chickens (Gà) ──
    const chickenPositions = [
      { x: 300, y: 890 },
      { x: 360, y: 940 },
      { x: 420, y: 900 },
      { x: 260, y: 970 },
      { x: 480, y: 960 },
    ]

    for (const pos of chickenPositions) {
      const ch = this.add.sprite(pos.x, pos.y, 'chicken', 0)
      ch.setScale(1.6)
      ch.setDepth(pos.y)
      ch.play('chicken-peck')
      this.chickens.push({
        sprite: ch,
        minX: pastX + 60,
        maxX: pastX + 440,
        minY: pastY + 70,
        maxY: pastY + pastH - 60,
      })
    }

    // ── Cows (Bò) ──
    const cowPositions = [
      { x: 720, y: 1020 },
      { x: 820, y: 1080 },
    ]

    for (const pos of cowPositions) {
      const cow = this.add.sprite(pos.x, pos.y, 'cow', 0)
      cow.setScale(1.8)
      cow.setDepth(pos.y)
      cow.play('cow-idle')
      this.cows.push({
        sprite: cow,
        minX: pastX + 520,
        maxX: pastX + pastW - 70,
        minY: pastY + 120,
        maxY: pastY + pastH - 70,
      })
    }
  }

  /**
   * ZONE 2: KHU NHÀ Ở & TRANG TRÍ (Residential & Decoration)
   */
  private buildZone2Residential() {
    const resGfx = this.add.graphics().setDepth(-10)

    // ── 1. NGÔI NHÀ CHÍNH & HIÊN NHÀ (The Farmhouse Estate) ──
    const houseCenterX = 1760
    const houseCenterY = 320

    // Stone courtyard patio in front of house
    resGfx.fillStyle(0xd9cdb4, 0.95)
    resGfx.fillRoundedRect(houseCenterX - 220, houseCenterY + 10, 440, 220, 14)
    resGfx.lineStyle(4, 0xa39478, 0.9)
    resGfx.strokeRoundedRect(houseCenterX - 220, houseCenterY + 10, 440, 220, 14)

    // Decorative tiled pattern on courtyard
    resGfx.fillStyle(0xc8bba0, 0.6)
    for (let cx = houseCenterX - 190; cx <= houseCenterX + 190; cx += 45) {
      for (let cy = houseCenterY + 40; cy <= houseCenterY + 200; cy += 45) {
        resGfx.fillRoundedRect(cx - 16, cy - 16, 32, 32, 4)
      }
    }

    // Path leading from courtyard to central road
    resGfx.fillStyle(0xd5c49b, 1)
    resGfx.fillRect(1260, 640, houseCenterX - 1260, 90)
    resGfx.lineStyle(3, 0x937c56, 0.8)
    resGfx.strokeRect(1260, 640, houseCenterX - 1260, 90)

    // Vertical walk from courtyard down to path
    resGfx.fillStyle(0xd5c49b, 1)
    resGfx.fillRect(houseCenterX - 45, houseCenterY + 220, 90, 430)
    resGfx.lineStyle(3, 0x937c56, 0.8)
    resGfx.strokeRect(houseCenterX - 45, houseCenterY + 220, 90, 430)

    // The Main House Sprite
    const houseSprite = this.add.image(houseCenterX, houseCenterY, 'house')
    houseSprite.setScale(1.55)
    houseSprite.setDepth(houseCenterY + 50)

    // House Porch Props & Decorations
    // Golden treasure chest on porch
    const goldChest = this.add.image(houseCenterX - 120, houseCenterY + 95, 'bs-chest-gold', 0)
    goldChest.setScale(1.6).setDepth(houseCenterY + 100)
    goldChest.setInteractive({ useHandCursor: true })
    goldChest.on('pointerdown', () => {
      this.tweens.add({
        targets: goldChest,
        scaleY: 1.9,
        duration: 100,
        yoyo: true,
      })
    })

    // Wooden chest on porch
    const woodChest = this.add.image(houseCenterX - 165, houseCenterY + 95, 'bs-chest-wood', 0)
    woodChest.setScale(1.6).setDepth(houseCenterY + 100)

    // Barrel stack by the house corner
    this.add.image(houseCenterX + 160, houseCenterY + 80, 'bs-barrels', 0).setScale(1.3).setDepth(houseCenterY + 90)
    this.add.image(houseCenterX + 195, houseCenterY + 85, 'bs-barrels', 1).setScale(1.3).setDepth(houseCenterY + 90)

    // Crate stack
    this.add.image(houseCenterX + 175, houseCenterY + 115, 'bs-crates', 0).setScale(1.3).setDepth(houseCenterY + 120)

    // Pink Sakura Blossom Trees framing the house estate
    this.add.image(houseCenterX - 280, houseCenterY - 20, 'bs-trees', 2).setScale(1.6).setDepth(houseCenterY)
    this.add.image(houseCenterX + 280, houseCenterY - 20, 'bs-trees', 2).setScale(1.6).setDepth(houseCenterY)
    this.add.image(houseCenterX - 240, houseCenterY + 180, 'bs-trees', 1).setScale(1.4).setDepth(houseCenterY + 190)
    this.add.image(houseCenterX + 240, houseCenterY + 180, 'bs-trees', 2).setScale(1.4).setDepth(houseCenterY + 190)

    // ── 2. KHU HỒ NƯỚC & VƯỜN THƯ GIÃN (Scenic Pond & Garden - Bottom Half) ──
    const pondCenterX = 1780
    const pondCenterY = 1040
    const pondRadiusX = 260
    const pondRadiusY = 160

    // Pond stone embankment outer border
    resGfx.fillStyle(0x8f8c85, 0.8)
    resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 36, pondRadiusY * 2 + 36)
    resGfx.fillStyle(0xb5b0a5, 0.9)
    resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 20, pondRadiusY * 2 + 20)

    // Water depths gradient
    resGfx.fillStyle(0x23689b, 0.95) // Deep water
    resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2, pondRadiusY * 2)
    resGfx.fillStyle(0x358fc9, 0.9) // Mid water
    resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 - 30, pondRadiusY * 2 - 24)
    resGfx.fillStyle(0x56aee8, 0.8) // Surface shimmer
    resGfx.fillEllipse(pondCenterX - 20, pondCenterY - 15, pondRadiusX * 1.4, pondRadiusY * 1.2)

    // Lily pads on water surface
    const lilyPadGfx = this.add.graphics().setDepth(pondCenterY)
    const lilies = [
      { x: pondCenterX - 90, y: pondCenterY - 30 },
      { x: pondCenterX + 100, y: pondCenterY + 20 },
      { x: pondCenterX - 40, y: pondCenterY + 50 },
      { x: pondCenterX + 60, y: pondCenterY - 50 },
    ]
    for (const lily of lilies) {
      lilyPadGfx.fillStyle(0x3b853c, 0.9)
      lilyPadGfx.fillCircle(lily.x, lily.y, 14)
      lilyPadGfx.fillStyle(0x2a632b, 1)
      lilyPadGfx.fillTriangle(lily.x, lily.y, lily.x + 14, lily.y - 4, lily.x + 14, lily.y + 4)
      // Pink blossom flower on lily pad
      lilyPadGfx.fillStyle(0xff85c0, 1)
      lilyPadGfx.fillCircle(lily.x - 2, lily.y - 2, 4)
    }

    // Promenade path around pond
    resGfx.lineStyle(6, 0xc4b491, 0.7)
    resGfx.strokeEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 60, pondRadiusY * 2 + 60)

    // Lakeside Rest area props
    this.add.image(pondCenterX - 280, pondCenterY + 60, 'bs-stumps', 0).setScale(1.3).setDepth(pondCenterY + 70)
    this.add.image(pondCenterX - 230, pondCenterY + 110, 'bs-stumps', 1).setScale(1.2).setDepth(pondCenterY + 120)
    this.add.image(pondCenterX - 300, pondCenterY + 120, 'bs-wood').setScale(1.2).setDepth(pondCenterY + 130)

    // Trees around the scenic lake
    this.add.image(pondCenterX - 310, pondCenterY - 100, 'bs-trees', 2).setScale(1.5).setDepth(pondCenterY - 80)
    this.add.image(pondCenterX + 300, pondCenterY - 80, 'maple-tree', 3).setScale(1.8).setDepth(pondCenterY - 60)
    this.add.image(pondCenterX + 290, pondCenterY + 90, 'bs-trees', 1).setScale(1.5).setDepth(pondCenterY + 110)
    this.add.image(pondCenterX + 50, pondCenterY + 190, 'bs-trees', 2).setScale(1.4).setDepth(pondCenterY + 210)
  }

  /**
   * Perimeter trees & Directional Signboards separating the 2 zones
   */
  private buildBoundaryAndSigns() {
    // ── Directional Signboards at central crossway ──
    const signY = 600

    // Left Signboard: Khu Nông Trại
    this.createPixelSign(
      dividerCenterX - 110,
      signY,
      '⬅ KHU NÔNG TRẠI\n(Trồng cây & Nuôi gà)',
      0x4a782b,
    )

    // Right Signboard: Khu Nhà Ở
    this.createPixelSign(
      dividerCenterX + 110,
      signY,
      'KHU NHÀ Ở ➡\n(Trang trí & Hồ cảnh)',
      0x966835,
    )

    // Zone Title Banners
    this.createZoneBanner(560, 80, '🌾 KHU NÔNG TRẠI & CHĂN NUÔI', '#2d5a1b')
    this.createZoneBanner(1760, 80, '🏡 KHU NHÀ Ở & NGHỈ DƯỠNG', '#633d18')

    // ── Perimeter trees along top, bottom, left, right ──
    // Left boundary
    for (let y = 140; y <= mapHeight - 140; y += 120) {
      const frame = Math.floor(y / 120) % 5
      this.add.image(70, y, 'maple-tree', frame).setScale(1.6).setDepth(y + 10)
    }

    // Right boundary
    for (let y = 140; y <= mapHeight - 140; y += 120) {
      const frame = (Math.floor(y / 120) + 2) % 5
      this.add.image(mapWidth - 70, y, 'maple-tree', frame).setScale(1.6).setDepth(y + 10)
    }

    // Top boundary
    for (let x = 160; x <= mapWidth - 160; x += 140) {
      if (Math.abs(x - dividerCenterX) > 90) {
        this.add.image(x, 70, 'maple-tree', Math.floor(x / 140) % 5).setScale(1.6).setDepth(80)
      }
    }

    // Bottom boundary
    for (let x = 160; x <= mapWidth - 160; x += 140) {
      if (Math.abs(x - dividerCenterX) > 90) {
        this.add.image(x, mapHeight - 70, 'maple-tree', Math.floor(x / 140) % 5).setScale(1.6).setDepth(mapHeight - 60)
      }
    }
  }

  private createPixelSign(x: number, y: number, text: string, color: number) {
    const post = this.add.rectangle(x, y + 16, 8, 36, 0x5a3e1b).setDepth(y + 20)
    post.setStrokeStyle(1, 0x3d2716)

    const board = this.add.rectangle(x, y, 160, 42, color).setDepth(y + 21)
    board.setStrokeStyle(2, 0x2b1c0e)

    this.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(y + 22)
  }

  private createZoneBanner(x: number, y: number, title: string, bgColor: string) {
    const banner = this.add
      .text(x, y, title, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: bgColor,
        padding: { x: 14, y: 6 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(150)

    banner.setShadow(2, 2, 'rgba(0,0,0,0.5)', 3)
  }

  /**
   * Autonomous AI wandering for chickens and cows
   */
  private startAnimalAI() {
    // Chickens wander periodically
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        for (const chicken of this.chickens) {
          if (Phaser.Math.Between(0, 10) > 3) {
            const targetX = Phaser.Math.Between(chicken.minX, chicken.maxX)
            const targetY = Phaser.Math.Between(chicken.minY, chicken.maxY)
            chicken.sprite.setFlipX(targetX < chicken.sprite.x)

            this.tweens.add({
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

    // Cows graze and shift slowly
    this.time.addEvent({
      delay: 7000,
      loop: true,
      callback: () => {
        for (const cow of this.cows) {
          if (Phaser.Math.Between(0, 10) > 4) {
            const targetX = Phaser.Math.Between(cow.minX, cow.maxX)
            const targetY = Phaser.Math.Between(cow.minY, cow.maxY)
            cow.sprite.setFlipX(targetX < cow.sprite.x)

            this.tweens.add({
              targets: cow.sprite,
              x: targetX,
              y: targetY,
              duration: Phaser.Math.Between(2500, 4000),
              ease: 'Linear',
              onUpdate: () => {
                cow.sprite.setDepth(cow.sprite.y)
              },
            })
          }
        }
      },
    })
  }
}
