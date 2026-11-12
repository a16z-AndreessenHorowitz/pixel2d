import Phaser from 'phaser'
import { crops } from '../data/crops'

/**
 * Quản lý việc nạp toàn bộ hình ảnh, spritesheet, animation frames cho game nông trại
 */
export function preloadFarmAssets(scene: Phaser.Scene) {
  // 1. Player Sprites (Idle & Walk)
  scene.load.spritesheet('player-idle', '/assets/player/idle.png', {
    frameWidth: 32,
    frameHeight: 32,
  })
  scene.load.spritesheet('player-walk', '/assets/player/walk.png', {
    frameWidth: 32,
    frameHeight: 32,
  })

  // 2. Crop & Soil Textures (Used by FarmPlot)
  scene.load.image('dirt-empty', '/assets/corp/cracked_dirt_final.png')
  scene.load.image('dirt-initial', '/assets/corp/cracked_dirt_final.png')
  scene.load.image('dirt-tilled', '/assets/corp/tilled_light_dirt_final.png')
  scene.load.image('dirt-planted', '/assets/corp/tilled_light_dirt_final.png')
  scene.load.image('dirt-watered', '/assets/corp/plain_dirt_bottom_final.png')

  // 3. Preload Crop Frames (Corn, Rice, Strawberry, Pumpkin, Watermelon)
  crops.forEach((crop) => {
    crop.frames.forEach((frameKey, index) => {
      scene.load.image(frameKey, `/assets/crops/${crop.id}-${index + 1}.png`)
    })
  })

  // 4. Architecture & Buildings
  scene.load.image('house', '/assets/objects/house.png')

  // 5. Trees & Flora
  scene.load.spritesheet('maple-tree', '/assets/objects/maple-tree.png', {
    frameWidth: 32,
    frameHeight: 48,
  })
  scene.load.spritesheet('bs-trees', '/assets/bloomseed/props/trees.png', {
    frameWidth: 64,
    frameHeight: 64,
  })

  // 6. Animals
  scene.load.spritesheet('chicken', '/assets/animals/chicken-red.png', {
    frameWidth: 32,
    frameHeight: 32,
  })
  scene.load.spritesheet('cow', '/assets/animals/male-cow-brown.png', {
    frameWidth: 32,
    frameHeight: 32,
  })

  // 7. NPCs (Barney & Hazel)
  scene.load.spritesheet('npc-barney', '/assets/bloomseed/characters/idle-down.png', {
    frameWidth: 48,
    frameHeight: 48,
  })
  scene.load.spritesheet('npc-hazel', '/assets/player/idle.png', {
    frameWidth: 32,
    frameHeight: 32,
  })

  // 8. Props & Containers
  scene.load.spritesheet('bs-stumps', '/assets/bloomseed/props/stumps.png', {
    frameWidth: 56,
    frameHeight: 48,
  })
  scene.load.image('bs-wood', '/assets/bloomseed/props/wood.png')
  scene.load.spritesheet('bs-barrels', '/assets/bloomseed/props/barrels.png', {
    frameWidth: 40,
    frameHeight: 32,
  })
  scene.load.spritesheet('bs-crates', '/assets/bloomseed/props/crates.png', {
    frameWidth: 32,
    frameHeight: 36,
  })
  scene.load.spritesheet('bs-chest-wood', '/assets/bloomseed/chests/wood.png', {
    frameWidth: 32,
    frameHeight: 26,
  })
  scene.load.spritesheet('bs-chest-gold', '/assets/bloomseed/chests/gold.png', {
    frameWidth: 32,
    frameHeight: 26,
  })

  // 9. Fishing Fish Sprites
  scene.load.spritesheet('golden-fish', '/assets/fishing/golden-fish.png', {
    frameWidth: 362,
    frameHeight: 362,
  })
  scene.load.spritesheet('fish-koi', '/assets/fishing/fish1_processed/koi.png', {
    frameWidth: 144,
    frameHeight: 88,
  })
  scene.load.spritesheet('fish-tilapia', '/assets/fishing/fish1_processed/tilapia.png', {
    frameWidth: 136,
    frameHeight: 80,
  })
  scene.load.spritesheet('fish-catfish', '/assets/fishing/fish1_processed/catfish.png', {
    frameWidth: 128,
    frameHeight: 80,
  })
  scene.load.spritesheet('fish-tuna', '/assets/fishing/fish1_processed/tuna.png', {
    frameWidth: 140,
    frameHeight: 88,
  })
  scene.load.spritesheet('fishing-rod', '/assets/fishing/fishing-rod.png', {
    frameWidth: 64,
    frameHeight: 64,
  })

  // 10. Grass Sheet Texture & Nature Decals
  scene.load.image('grass-texture', '/assets/grass-pixel-warm512.png')
  scene.load.image('flower-white', '/assets/flower-white.png')
  scene.load.image('flower-yellow', '/assets/flower-yellow.png')
  scene.load.image('flower-daisy', '/assets/flower-daisy.png')
  scene.load.image('pebbles', '/assets/pebbles.png')
}
