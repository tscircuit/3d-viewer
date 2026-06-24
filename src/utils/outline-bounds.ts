import type { PcbBoard } from "circuit-json"
import { getBoundsFromPoints, type Bounds } from "@tscircuit/math-utils"

export interface OutlineBounds extends Bounds {
  width: number
  height: number
  centerX: number
  centerY: number
}

/**
 * Calculate the actual bounding box of a board outline using math-utils.
 * Falls back to board width/height if no outline is present.
 */
export function calculateOutlineBounds(boardData: PcbBoard): OutlineBounds {
  if (boardData.outline && boardData.outline.length >= 3) {
    // Use math-utils to calculate bounds from outline points
    const bounds = getBoundsFromPoints(boardData.outline)!
    return {
      ...bounds,
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
    }
  }

  // Fallback to board dimensions when no outline is present
  const boardWidth = boardData.width ?? 0
  const boardHeight = boardData.height ?? 0
  const boardCenterX = boardData.center?.x ?? 0
  const boardCenterY = boardData.center?.y ?? 0

  const bounds: Bounds = {
    minX: boardCenterX - boardWidth / 2,
    maxX: boardCenterX + boardWidth / 2,
    minY: boardCenterY - boardHeight / 2,
    maxY: boardCenterY + boardHeight / 2,
  }

  return {
    ...bounds,
    width: boardWidth,
    height: boardHeight,
    centerX: boardCenterX,
    centerY: boardCenterY,
  }
}
