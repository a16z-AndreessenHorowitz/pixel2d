export function VirtualDpad() {
  const triggerDirection = (direction?: 'up' | 'down' | 'left' | 'right') => {
    document.dispatchEvent(
      new CustomEvent('farm-control', { detail: { direction } }),
    )
  }

  return (
    <div className="game-controls" aria-label="Phím điều hướng ảo">
      <button
        type="button"
        className="control-up"
        aria-label="Đi lên"
        onPointerDown={() => triggerDirection('up')}
        onPointerUp={() => triggerDirection(undefined)}
        onPointerLeave={() => triggerDirection(undefined)}
      >
        ▲
      </button>
      <button
        type="button"
        className="control-left"
        aria-label="Sang trái"
        onPointerDown={() => triggerDirection('left')}
        onPointerUp={() => triggerDirection(undefined)}
        onPointerLeave={() => triggerDirection(undefined)}
      >
        ◀
      </button>
      <button
        type="button"
        className="control-down"
        aria-label="Đi xuống"
        onPointerDown={() => triggerDirection('down')}
        onPointerUp={() => triggerDirection(undefined)}
        onPointerLeave={() => triggerDirection(undefined)}
      >
        ▼
      </button>
      <button
        type="button"
        className="control-right"
        aria-label="Sang phải"
        onPointerDown={() => triggerDirection('right')}
        onPointerUp={() => triggerDirection(undefined)}
        onPointerLeave={() => triggerDirection(undefined)}
      >
        ▶
      </button>
    </div>
  )
}
