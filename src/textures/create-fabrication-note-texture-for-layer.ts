import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { drawFabricationNoteLayer } from "./fabrication-note/fabrication-note-drawing"
import { getSoldermaskRenderBounds } from "./soldermask/soldermask-bounds"

const isFabricationNoteElement = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
) => {
  if (!("layer" in element) || element.layer !== layer) return false
  return (element.type as string).startsWith("pcb_fabrication_note_")
}

export function createFabricationNoteTextureForLayer({
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
  const elements = circuitJson.filter((element) =>
    isFabricationNoteElement(element, layer),
  )
  if (elements.length === 0) return null

  const bounds = getSoldermaskRenderBounds(circuitJson, boardData)
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

  drawFabricationNoteLayer({
    ctx,
    layer,
    bounds,
    elements,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
