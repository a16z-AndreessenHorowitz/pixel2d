import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '../game/config'
import './GameCanvas.css'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return undefined
    }

    const game = new Phaser.Game(createGameConfig(containerRef.current))
    gameRef.current = game
    ;(window as any).__PHASER_GAME__ = game

    return () => {
      game.destroy(true)
      gameRef.current = null
      delete (window as any).__PHASER_GAME__
    }
  }, [])

  return (
    <div className="game-canvas-frame">
      <div ref={containerRef} className="game-canvas-host" />
    </div>
  )
}
