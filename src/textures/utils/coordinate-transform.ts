import { ringToPoints } from "../../geoms/brep-converter"

export interface CoordinateTransform {
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}

/**
 * Create coordinate transformation functions for PCB to canvas mapping
 */
export function createCoordinateTransform(
  boardOutlineBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  },
  traceTextureResolution: number,
): CoordinateTransform {
  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardOutlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (boardOutlineBounds.maxY - pcbY) * traceTextureResolution

  return { canvasXFromPcb, canvasYFromPcb }
}

/**
 * Set up canvas context for bottom layer rendering
 */
export function setupBottomLayerContext(
  ctx: CanvasRenderingContext2D,
  canvasHeight: number,
): void {
  ctx.translate(0, canvasHeight)
  ctx.scale(1, -1)
}

/**
 * Draw a polygon shape on canvas
 */
export function drawPolygon({
  ctx,
  points,
  canvasXFromPcb,
  canvasYFromPcb,
}: {
  ctx: CanvasRenderingContext2D
  points: [number, number][]
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}): void {
  if (points.length < 3) return

  ctx.beginPath()
  points.forEach((point, index) => {
    const canvasX = canvasXFromPcb(point[0])
    const canvasY = canvasYFromPcb(point[1])
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY)
    } else {
      ctx.lineTo(canvasX, canvasY)
    }
  })
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw brep shape using custom implementation
 */
export function drawBrepShape({
  ctx,
  pour,
  canvasXFromPcb,
  canvasYFromPcb,
}: {
  ctx: CanvasRenderingContext2D
  pour: any
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}): void {
  const brepShape = pour.brep_shape
  if (!brepShape || !brepShape.outer_ring) return

  // Draw outer ring
  const outerRingPoints = ringToPoints(brepShape.outer_ring, 32)
  if (outerRingPoints.length >= 3) {
    drawPolygon({
      ctx,
      points: outerRingPoints,
      canvasXFromPcb,
      canvasYFromPcb,
    })
  }

  // Cut out inner rings (holes)
  if (brepShape.inner_rings && brepShape.inner_rings.length > 0) {
    ctx.globalCompositeOperation = "destination-out"

    for (const innerRing of brepShape.inner_rings) {
      const innerRingPoints = ringToPoints(innerRing, 32)
      if (innerRingPoints.length >= 3) {
        drawPolygon({
          ctx,
          points: innerRingPoints,
          canvasXFromPcb,
          canvasYFromPcb,
        })
      }
    }

    ctx.globalCompositeOperation = "source-over"
  }
}
