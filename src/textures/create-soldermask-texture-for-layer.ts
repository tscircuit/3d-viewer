import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { drawSoldermaskLayer } from "./soldermask/soldermask-drawing"
import { getSoldermaskRenderBounds } from "./soldermask/soldermask-bounds"

export function createSoldermaskTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution?: number
}): THREE.CanvasTexture | null {
  const bounds = getSoldermaskRenderBounds(circuitJson, boardData)
  const canvasWidth = Math.floor(bounds.width * traceTextureResolution)
  const canvasHeight = Math.floor(bounds.height * traceTextureResolution)
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Bottom rendering uses flipped canvas coordinates to match existing texture orientation.
  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  const elements = circuitJson.some((e) => e.type === "pcb_board")
    ? circuitJson
    : [boardData, ...circuitJson]

  drawSoldermaskLayer({
    ctx,
    layer,
    bounds,
    elements,
    boardMaterial: boardData.material,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
