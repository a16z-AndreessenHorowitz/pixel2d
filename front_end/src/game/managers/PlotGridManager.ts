import Phaser from 'phaser'
import { FarmPlot } from '../objects/FarmPlot'

export interface PlotGridOptions {
  plotSize?: number
  plotGap?: number
  getActiveTool: () => string
}

/**
 * Quản lý lưới 24 ô đất trồng trọt (Zone 1 - Farming Field)
 */
export function createPlotGrid(
  scene: Phaser.Scene,
  options: PlotGridOptions,
): FarmPlot[] {
  const plotSize = options.plotSize ?? 44
  const plotGap = options.plotGap ?? 4
  const plots: FarmPlot[] = []

  const gridStartX = 170
  const gridStartY = 190
  const cols = 4
  const rows = 6
  const patchSpacingX = 220

  for (let patch = 0; patch < 2; patch++) {
    const patchBaseX = gridStartX + patch * (cols * (plotSize + plotGap) + patchSpacingX)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const plotX = patchBaseX + c * (plotSize + plotGap) + plotSize / 2
        const plotY = gridStartY + r * (plotSize + plotGap) + plotSize / 2

        const plot = new FarmPlot(scene, {
          col: patch * cols + c,
          row: r,
          x: plotX,
          y: plotY,
          size: plotSize,
          onHarvest: (harvestedCrop) => {
            window.dispatchEvent(
              new CustomEvent('farm-harvest', {
                detail: { crop: harvestedCrop },
              }),
            )
          },
        })

        plot.on('pointerdown', () => {
          plot.handleTool(options.getActiveTool())
        })

        scene.add.existing(plot)
        plots.push(plot)
      }
    }
  }

  return plots
}
