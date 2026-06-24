import type { AnyCircuitElement, PCBKeepout, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { drawKeepoutLayer } from "./keepout/keepout-drawing"

const isKeepoutOnLayer = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
): element is PCBKeepout => {
  if (element.type !== "pcb_keepout") return false
  if (!("layers" in element) || !Array.isArray(element.layers)) return true
  return element.layers.includes(layer)
}

export function createKeepoutTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
  keepoutColor = layer === "bottom" ? "#4b72d2" : "#d24b4b",
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution?: number
  keepoutColor?: string
}): THREE.CanvasTexture | null {
  const elements = circuitJson.filter((element) =>
    isKeepoutOnLayer(element, layer),
  )
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

  drawKeepoutLayer({
    ctx,
    layer,
    bounds,
    elements,
    keepoutColor,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
