import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { getCircuitToCanvasColors } from "../utils/colors"

/**
 * Draw SMT pad shapes using circuit-to-canvas library
 */
export function drawPadShape({
  ctx,
  pad,
  boardOutlineBounds,
}: {
  ctx: CanvasRenderingContext2D
  pad: any
  boardOutlineBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
}): void {
  // Skip pads with invalid (NaN) coordinates
  if (Number.isNaN(pad.x) || Number.isNaN(pad.y)) {
    console.warn(
      `[copper-pour-texture] Skipping pad ${pad.pcb_smtpad_id} with NaN coordinates`,
    )
    return
  }

  // Create circuit-to-canvas drawer
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Use provided board bounds or calculate minimal bounds around the pad
  const bounds = boardOutlineBounds || {
    minX: pad.x - (pad.width || pad.radius || 0) / 2,
    maxX: pad.x + (pad.width || pad.radius || 0) / 2,
    minY: pad.y - (pad.height || pad.radius || 0) / 2,
    maxY: pad.y + (pad.height || pad.radius || 0) / 2,
  }

  // Set camera bounds to match our coordinate system
  drawer.setCameraBounds(bounds)

  // Configure colors - use uncovered copper for SMT pads
  const colors = getCircuitToCanvasColors()
  drawer.configure({ colorOverrides: colors.uncovered })

  // Draw the pad using circuit-to-canvas
  drawer.drawElements([pad], { layers: [pad.layer] })
}
