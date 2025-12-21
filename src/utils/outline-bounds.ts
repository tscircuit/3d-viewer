import type { PcbBoard } from "circuit-json"

export interface OutlineBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

/**
 * Calculate the actual bounding box of a board outline.
 * Falls back to board width/height if no outline is present.
 */
export function calculateOutlineBounds(boardData: PcbBoard): OutlineBounds {
  if (boardData.outline && boardData.outline.length >= 3) {
    const outlinePoints = boardData.outline
    const minX = Math.min(...outlinePoints.map((p) => p.x))
    const maxX = Math.max(...outlinePoints.map((p) => p.x))
    const minY = Math.min(...outlinePoints.map((p) => p.y))
    const maxY = Math.max(...outlinePoints.map((p) => p.y))

    const width = maxX - minX
    const height = maxY - minY
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    return {
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      centerX,
      centerY,
    }
  }

  // Fallback to board dimensions when no outline is present
  const boardWidth = boardData.width ?? 0
  const boardHeight = boardData.height ?? 0
  const boardCenterX = boardData.center?.x ?? 0
  const boardCenterY = boardData.center?.y ?? 0

  return {
    minX: boardCenterX - boardWidth / 2,
    maxX: boardCenterX + boardWidth / 2,
    minY: boardCenterY - boardHeight / 2,
    maxY: boardCenterY + boardHeight / 2,
    width: boardWidth,
    height: boardHeight,
    centerX: boardCenterX,
    centerY: boardCenterY,
  }
}
