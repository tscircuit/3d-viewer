import {
  extractRectBorderRadius,
  clampRectBorderRadius,
} from "../../utils/rect-border-radius"

export interface CoordinateTransform {
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}

/**
 * Draw SMT pad shapes on canvas
 */
export function drawPadShape({
  ctx,
  pad,
  canvasXFromPcb,
  canvasYFromPcb,
  traceTextureResolution,
}: {
  ctx: CanvasRenderingContext2D
  pad: any
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
  traceTextureResolution: number
}): void {
  // Handle polygon pads differently - they don't have x, y coordinates
  if (pad.shape === "polygon" && pad.points) {
    ctx.beginPath()
    pad.points.forEach((point: { x: number; y: number }, index: number) => {
      const px = canvasXFromPcb(point.x)
      const py = canvasYFromPcb(point.y)
      if (index === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.closePath()
    ctx.fill()
    return
  }

  // For non-polygon pads, use x and y coordinates
  if (pad.x === undefined || pad.y === undefined) return

  // Skip pads with invalid (NaN) coordinates
  if (Number.isNaN(pad.x) || Number.isNaN(pad.y)) {
    console.warn(
      `[copper-pour-texture] Skipping pad ${pad.pcb_smtpad_id} with NaN coordinates`,
    )
    return
  }

  const x = pad.x as number
  const y = pad.y as number
  const canvasX = canvasXFromPcb(x)
  const canvasY = canvasYFromPcb(y)

  if (pad.shape === "rect") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    if (borderRadius > 0) {
      ctx.beginPath()
      ctx.roundRect(
        canvasX - width / 2,
        canvasY - height / 2,
        width,
        height,
        borderRadius,
      )
      ctx.fill()
    } else {
      ctx.fillRect(canvasX - width / 2, canvasY - height / 2, width, height)
    }
  } else if (pad.shape === "circle") {
    const radius =
      ((pad.radius ?? pad.width / 2) as number) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI)
    ctx.fill()
  } else if (pad.shape === "pill") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    ctx.beginPath()
    ctx.roundRect(
      canvasX - width / 2,
      canvasY - height / 2,
      width,
      height,
      borderRadius,
    )
    ctx.fill()
  } else if (pad.shape === "rotated_rect") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    // For rotated_rect, always apply rotation transform
    // Canvas rotation is clockwise-positive, but ccw_rotation is counter-clockwise
    // Also canvas Y is inverted. Net effect: negate rotation to match 3D geometry
    const ccwRotation = (pad.ccw_rotation as number) || 0
    const rotation = -ccwRotation * (Math.PI / 180)

    ctx.save()
    ctx.translate(canvasX, canvasY)
    ctx.rotate(rotation)
    ctx.beginPath()
    ctx.roundRect(-width / 2, -height / 2, width, height, borderRadius)
    ctx.fill()
    ctx.restore()
  }
}
