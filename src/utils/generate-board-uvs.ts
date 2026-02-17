import type { PcbBoard } from "circuit-json"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"

/**
 * Generates UV coordinates for a board geometry by projecting XY positions
 * onto the board bounds. This enables applying PCB textures directly to the
 * board mesh rather than using separate floating planes.
 */
export function generateBoardUVs(
  geometry: THREE.BufferGeometry,
  boardData: PcbBoard,
): void {
  const posAttr = geometry.getAttribute("position")
  if (!posAttr) return

  const bounds = calculateOutlineBounds(boardData)
  const uvs = new Float32Array(posAttr.count * 2)

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const y = posAttr.getY(i)

    // Map XY world position to [0, 1] UV range
    const u = bounds.width > 0 ? (x - bounds.minX) / bounds.width : 0.5
    const v = bounds.height > 0 ? (y - bounds.minY) / bounds.height : 0.5

    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
}
