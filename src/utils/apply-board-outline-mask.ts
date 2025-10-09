import type { PcbBoard } from "circuit-json"

interface ApplyBoardOutlineMaskOptions {
  ctx: CanvasRenderingContext2D
  boardData: PcbBoard
  resolution: number
}

const convertPointToCanvas = (
  point: { x: number; y: number },
  {
    centerX,
    centerY,
    width,
    height,
    resolution,
  }: {
    centerX: number
    centerY: number
    width: number
    height: number
    resolution: number
  },
) => {
  const canvasX = (point.x - centerX + width / 2) * resolution
  const canvasY = (-(point.y - centerY) + height / 2) * resolution

  return { x: canvasX, y: canvasY }
}

/**
 * Applies a clipping path to the canvas context that matches the board outline
 * so that any subsequent drawing commands are confined to the PCB shape. The
 * returned cleanup function must be called after rendering to restore the
 * context state.
 */
export const applyBoardOutlineMaskToContext = ({
  ctx,
  boardData,
  resolution,
}: ApplyBoardOutlineMaskOptions): (() => void) => {
  const width = boardData.width ?? 0
  const height = boardData.height ?? 0

  if (width <= 0 || height <= 0) return () => {}
  if (resolution <= 0) return () => {}

  const centerX = boardData.center?.x ?? 0
  const centerY = boardData.center?.y ?? 0

  const outlinePoints =
    boardData.outline && boardData.outline.length >= 3
      ? boardData.outline
      : [
          { x: centerX - width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2, y: centerY - height / 2 },
          { x: centerX + width / 2, y: centerY + height / 2 },
          { x: centerX - width / 2, y: centerY + height / 2 },
        ]

  ctx.save()
  ctx.beginPath()

  outlinePoints.forEach((point, index) => {
    const canvasPoint = convertPointToCanvas(point, {
      centerX,
      centerY,
      width,
      height,
      resolution,
    })
    if (index === 0) {
      ctx.moveTo(canvasPoint.x, canvasPoint.y)
    } else {
      ctx.lineTo(canvasPoint.x, canvasPoint.y)
    }
  })

  ctx.closePath()
  ctx.clip()

  return () => {
    ctx.restore()
  }
}
