import Phaser from 'phaser'

export const MAP_CONFIG = {
  mapWidth: 2400,
  mapHeight: 1400,
  mapPadding: 48,
  dividerCenterX: 1200,
  roadWidth: 110,
  grassTileScale: 0.5,
}

/**
 * Vẽ nền đảo bay, vũ trụ đầy sao và con đường đá trung tâm nối các khu vực
 */
export function drawTerrainBase(scene: Phaser.Scene) {
  const { mapWidth, mapHeight, mapPadding, dividerCenterX, roadWidth, grassTileScale } = MAP_CONFIG
  const bgGfx = scene.add.graphics().setDepth(-20)

  // 1. Vũ trụ bao quanh đảo bay
  bgGfx.fillStyle(0x070913, 1)
  bgGfx.fillRect(-600, -600, mapWidth + 1200, mapHeight + 1200)

  // Những vì sao lấp lánh ngoài không gian
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
    bgGfx.fillRect(sx - 3, sy, 7, 1)
    bgGfx.fillRect(sx, sy - 3, 1, 7)
  }

  // 2. Chân vách đá của đảo bay
  bgGfx.fillStyle(0x1d3314, 0.95)
  bgGfx.fillRoundedRect(mapPadding - 14, mapPadding - 14, mapWidth - (mapPadding - 14) * 2, mapHeight - (mapPadding - 14) * 2 + 32, 54)

  bgGfx.fillStyle(0x385c21, 0.95)
  bgGfx.fillRoundedRect(mapPadding - 8, mapPadding - 8, mapWidth - (mapPadding - 8) * 2, mapHeight - (mapPadding - 8) * 2 + 16, 48)

  // 3. Mặt cỏ đảo bay (Grass TileSprite)
  const islandW = mapWidth - mapPadding * 2
  const islandH = mapHeight - mapPadding * 2
  const islandCenterX = mapWidth / 2
  const islandCenterY = mapHeight / 2

  const grassTileSprite = scene.add.tileSprite(
    islandCenterX,
    islandCenterY,
    islandW,
    islandH,
    'grass-texture'
  )
  grassTileSprite.setTileScale(grassTileScale, grassTileScale)
  grassTileSprite.setDepth(-18)

  const maskShape = scene.make.graphics()
  maskShape.fillStyle(0xffffff)
  maskShape.fillRoundedRect(mapPadding, mapPadding, islandW, islandH, 40)
  grassTileSprite.setMask(maskShape.createGeometryMask())

  bgGfx.lineStyle(4, 0x8ed35a, 0.8)
  bgGfx.strokeRoundedRect(mapPadding, mapPadding, islandW, islandH, 40)

  // Điểm xuyết hoa và sỏi đá trên bề mặt cỏ
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
    scene.add.image(d.x, d.y, d.key).setScale(d.scale).setDepth(-17)
  }

  // 4. Con đường đá trục trung tâm nối dài
  const roadGfx = scene.add.graphics().setDepth(-15)
  const roadX = dividerCenterX - roadWidth / 2
  const roadY = mapPadding
  const roadH = mapHeight - mapPadding * 2

  roadGfx.fillStyle(0xb39d73, 0.95)
  roadGfx.fillRect(roadX - 4, roadY, roadWidth + 8, roadH)
  roadGfx.fillStyle(0xd5c49b, 1)
  roadGfx.fillRect(roadX, roadY, roadWidth, roadH)
  roadGfx.lineStyle(3, 0x937c56, 0.8)
  roadGfx.strokeRect(roadX, roadY, roadWidth, roadH)

  roadGfx.fillStyle(0xc1af85, 0.7)
  for (let y = roadY + 20; y < roadY + roadH - 20; y += 45) {
    roadGfx.fillRoundedRect(roadX + 16, y, roadWidth - 32, 28, 4)
    roadGfx.fillCircle(roadX + 28, y + 14, 3)
    roadGfx.fillCircle(roadX + roadWidth - 28, y + 14, 3)
  }

  // Đường ngang trung tâm
  const crossY = 640
  const crossH = 90
  roadGfx.fillStyle(0xb39d73, 0.95)
  roadGfx.fillRect(400, crossY - 4, 1600, crossH + 8)
  roadGfx.fillStyle(0xd5c49b, 1)
  roadGfx.fillRect(400, crossY, 1600, crossH)
  roadGfx.lineStyle(3, 0x937c56, 0.8)
  roadGfx.strokeRect(400, crossY, 1600, crossH)
}

/**
 * Xây dựng Khu Nhà Ở & Trang trí (Zone 2)
 */
export function buildZone2Residential(scene: Phaser.Scene) {
  const resGfx = scene.add.graphics().setDepth(-10)
  const houseCenterX = 1760
  const houseCenterY = 320

  // Sân lát đá trước hiên nhà
  resGfx.fillStyle(0xd9cdb4, 0.95)
  resGfx.fillRoundedRect(houseCenterX - 220, houseCenterY + 10, 440, 220, 14)
  resGfx.lineStyle(4, 0xa39478, 0.9)
  resGfx.strokeRoundedRect(houseCenterX - 220, houseCenterY + 10, 440, 220, 14)

  resGfx.fillStyle(0xc8bba0, 0.6)
  for (let cx = houseCenterX - 190; cx <= houseCenterX + 190; cx += 45) {
    for (let cy = houseCenterY + 40; cy <= houseCenterY + 200; cy += 45) {
      resGfx.fillRoundedRect(cx - 16, cy - 16, 32, 32, 4)
    }
  }

  resGfx.fillStyle(0xd5c49b, 1)
  resGfx.fillRect(1260, 640, houseCenterX - 1260, 90)
  resGfx.lineStyle(3, 0x937c56, 0.8)
  resGfx.strokeRect(1260, 640, houseCenterX - 1260, 90)

  resGfx.fillStyle(0xd5c49b, 1)
  resGfx.fillRect(houseCenterX - 45, houseCenterY + 220, 90, 430)
  resGfx.lineStyle(3, 0x937c56, 0.8)
  resGfx.strokeRect(houseCenterX - 45, houseCenterY + 220, 90, 430)

  // Sprite Nhà chính
  const houseSprite = scene.add.image(houseCenterX, houseCenterY, 'house')
  houseSprite.setScale(1.55)
  houseSprite.setDepth(houseCenterY + 50)

  // Rương và thùng trang trí
  const goldChest = scene.add.image(houseCenterX - 120, houseCenterY + 95, 'bs-chest-gold', 0)
  goldChest.setScale(1.6).setDepth(houseCenterY + 100)
  goldChest.setInteractive({ useHandCursor: true })
  goldChest.on('pointerdown', () => {
    scene.tweens.add({
      targets: goldChest,
      scaleY: 1.9,
      duration: 100,
      yoyo: true,
    })
  })

  scene.add.image(houseCenterX - 165, houseCenterY + 95, 'bs-chest-wood', 0).setScale(1.6).setDepth(houseCenterY + 100)
  scene.add.image(houseCenterX + 160, houseCenterY + 80, 'bs-barrels', 0).setScale(1.3).setDepth(houseCenterY + 90)
  scene.add.image(houseCenterX + 195, houseCenterY + 85, 'bs-barrels', 1).setScale(1.3).setDepth(houseCenterY + 90)
  scene.add.image(houseCenterX + 175, houseCenterY + 115, 'bs-crates', 0).setScale(1.3).setDepth(houseCenterY + 120)

  // Cây hoa anh đào quanh nhà
  scene.add.image(houseCenterX - 280, houseCenterY - 20, 'bs-trees', 2).setScale(1.6).setDepth(houseCenterY)
  scene.add.image(houseCenterX + 280, houseCenterY - 20, 'bs-trees', 2).setScale(1.6).setDepth(houseCenterY)
  scene.add.image(houseCenterX - 240, houseCenterY + 180, 'bs-trees', 1).setScale(1.4).setDepth(houseCenterY + 190)
  scene.add.image(houseCenterX + 240, houseCenterY + 180, 'bs-trees', 2).setScale(1.4).setDepth(houseCenterY + 190)

  // Hồ nước cảnh quan (Scenic Pond)
  const pondCenterX = 1780
  const pondCenterY = 1040
  const pondRadiusX = 260
  const pondRadiusY = 160

  resGfx.fillStyle(0x8f8c85, 0.8)
  resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 36, pondRadiusY * 2 + 36)
  resGfx.fillStyle(0xb5b0a5, 0.9)
  resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 20, pondRadiusY * 2 + 20)

  resGfx.fillStyle(0x23689b, 0.95)
  resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2, pondRadiusY * 2)
  resGfx.fillStyle(0x358fc9, 0.9)
  resGfx.fillEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 - 30, pondRadiusY * 2 - 24)
  resGfx.fillStyle(0x56aee8, 0.8)
  resGfx.fillEllipse(pondCenterX - 20, pondCenterY - 15, pondRadiusX * 1.4, pondRadiusY * 1.2)

  // Lá súng và hoa sen trên mặt hồ
  const lilyPadGfx = scene.add.graphics().setDepth(pondCenterY)
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
    lilyPadGfx.fillStyle(0xff85c0, 1)
    lilyPadGfx.fillCircle(lily.x - 2, lily.y - 2, 4)
  }

  resGfx.lineStyle(6, 0xc4b491, 0.7)
  resGfx.strokeEllipse(pondCenterX, pondCenterY, pondRadiusX * 2 + 60, pondRadiusY * 2 + 60)

  scene.add.image(pondCenterX - 280, pondCenterY + 60, 'bs-stumps', 0).setScale(1.3).setDepth(pondCenterY + 70)
  scene.add.image(pondCenterX - 230, pondCenterY + 110, 'bs-stumps', 1).setScale(1.2).setDepth(pondCenterY + 120)
  scene.add.image(pondCenterX - 300, pondCenterY + 120, 'bs-wood').setScale(1.2).setDepth(pondCenterY + 130)

  scene.add.image(pondCenterX - 310, pondCenterY - 100, 'bs-trees', 2).setScale(1.5).setDepth(pondCenterY - 80)
  scene.add.image(pondCenterX + 300, pondCenterY - 80, 'maple-tree', 3).setScale(1.8).setDepth(pondCenterY - 60)
  scene.add.image(pondCenterX + 290, pondCenterY + 90, 'bs-trees', 1).setScale(1.5).setDepth(pondCenterY + 110)
  scene.add.image(pondCenterX + 50, pondCenterY + 190, 'bs-trees', 2).setScale(1.4).setDepth(pondCenterY + 210)
}

/**
 * Biển chỉ dẫn & Cây ranh giới bao quanh hòn đảo
 */
export function buildBoundaryAndSigns(scene: Phaser.Scene) {
  const { mapWidth, mapHeight, dividerCenterX } = MAP_CONFIG
  const signY = 600

  createPixelSign(scene, dividerCenterX - 110, signY, '⬅ KHU NÔNG TRẠI\n(Trồng cây & Nuôi gà)', 0x4a782b)
  createPixelSign(scene, dividerCenterX + 110, signY, 'KHU NHÀ Ở ➡\n(Trang trí & Hồ cảnh)', 0x966835)

  createZoneBanner(scene, 580, 100, '🌾 NÔNG TRẠI & CHĂN NUÔI', '#2e5e1a')
  createZoneBanner(scene, 1780, 100, '🏡 KHU NHÀ Ở & THƯ GIÃN', '#694119')

  // Cây bao quanh ranh giới đảo
  for (let y = 140; y <= mapHeight - 140; y += 120) {
    scene.add.image(70, y, 'maple-tree', Math.floor(y / 120) % 5).setScale(1.6).setDepth(y + 10)
    scene.add.image(mapWidth - 70, y, 'maple-tree', (Math.floor(y / 120) + 2) % 5).setScale(1.6).setDepth(y + 10)
  }

  for (let x = 160; x <= mapWidth - 160; x += 140) {
    if (Math.abs(x - dividerCenterX) > 90) {
      scene.add.image(x, 70, 'maple-tree', Math.floor(x / 140) % 5).setScale(1.6).setDepth(80)
      scene.add.image(x, mapHeight - 70, 'maple-tree', Math.floor(x / 140) % 5).setScale(1.6).setDepth(mapHeight - 60)
    }
  }
}

export function createPixelSign(scene: Phaser.Scene, x: number, y: number, text: string, color: number) {
  const post = scene.add.rectangle(x, y + 16, 8, 36, 0x5a3e1b).setDepth(y + 20)
  post.setStrokeStyle(1, 0x3d2716)

  const board = scene.add.rectangle(x, y, 160, 42, color).setDepth(y + 21)
  board.setStrokeStyle(2, 0x2b1c0e)

  scene.add
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

export function createZoneBanner(scene: Phaser.Scene, x: number, y: number, title: string, bgColor: string) {
  const banner = scene.add
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
