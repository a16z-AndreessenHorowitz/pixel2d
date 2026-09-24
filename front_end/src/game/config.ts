import Phaser from 'phaser'
import { FarmScene } from './scenes/FarmScene'

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 680

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Let the CSS grass layer show through any transparent pixels in the scene.
    transparent: true,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    pixelArt: true,
    antialias: false,
    scene: [FarmScene],
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    input: {
      keyboard: true,
    },
  }
}
