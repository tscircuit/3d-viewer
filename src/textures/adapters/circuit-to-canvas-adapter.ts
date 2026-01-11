import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { getCircuitToCanvasColors } from "../utils/colors"
import type { PcbCopperPour } from "circuit-json"

/**
 * Draw rect and polygon pours using circuit-to-canvas
 */
export function drawRectAndPolygonPours({
  ctx,
  pours,
  layer,
  boardOutlineBounds,
}: {
  ctx: CanvasRenderingContext2D
  pours: PcbCopperPour[]
  layer: "top" | "bottom"
  boardOutlineBounds: { minX: number; maxX: number; minY: number; maxY: number }
}): void {
  if (pours.length === 0) return

  const drawer = new CircuitToCanvasDrawer(ctx)

  // Set up camera bounds to match canvas coordinates
  drawer.setCameraBounds(boardOutlineBounds)

  // Group pours by soldermask coverage and draw them separately
  const coveredPours = pours.filter((p) => p.covered_with_solder_mask !== false)
  const uncoveredPours = pours.filter(
    (p) => p.covered_with_solder_mask === false,
  )

  const colors = getCircuitToCanvasColors()

  // Draw covered pours
  if (coveredPours.length > 0) {
    drawer.configure({ colorOverrides: colors.covered })
    drawer.drawElements(coveredPours, { layers: [layer] })
  }

  // Draw uncovered pours
  if (uncoveredPours.length > 0) {
    drawer.configure({ colorOverrides: colors.uncovered })
    drawer.drawElements(uncoveredPours, { layers: [layer] })
  }
}
