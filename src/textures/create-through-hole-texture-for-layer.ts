import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { drawThroughHoleLayer } from "./through-hole/through-hole-drawing"

export function createThroughHoleTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperColor = "rgb(230, 153, 51)",
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  copperColor?: string
  traceTextureResolution?: number
}): THREE.CanvasTexture | null {
  const elements = circuitJson.filter((element) => {
    if (element.type === "pcb_via") return true
    if (element.type !== "pcb_plated_hole") return false

    const platedHole = element as any
    return (
      !Array.isArray(platedHole.layers) || platedHole.layers.includes(layer)
    )
  })

  if (elements.length === 0) return null

  const bounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(bounds.width * traceTextureResolution)
  const canvasHeight = Math.floor(bounds.height * traceTextureResolution)
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  drawThroughHoleLayer({
    ctx,
    layer,
    bounds,
    elements,
    copperColor,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
