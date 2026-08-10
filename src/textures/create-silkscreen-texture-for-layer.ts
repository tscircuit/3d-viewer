import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { drawSilkscreenLayer } from "./silkscreen/silkscreen-drawing"
import { getSoldermaskRenderBounds } from "./soldermask/soldermask-bounds"

const isSilkscreenElement = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
) => {
  if (!("layer" in element) || element.layer !== layer) return false
  const elementType = element.type as string

  return elementType.startsWith("pcb_silkscreen_")
}

const isOpenSurfaceAperture = (
  element: AnyCircuitElement,
  soldermaskVisible: boolean,
) => {
  if (element.type === "pcb_cutout") return true
  if (element.type === "pcb_via") {
    return !soldermaskVisible || element.is_tented !== true
  }
  if (element.type === "pcb_hole" || element.type === "pcb_plated_hole") {
    return !soldermaskVisible || element.is_covered_with_solder_mask !== true
  }
  return false
}

export function createSilkscreenTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
  silkscreenColor = "rgb(255,255,255)",
  soldermaskVisible = true,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution?: number
  silkscreenColor?: string
  soldermaskVisible?: boolean
}): THREE.CanvasTexture | null {
  const elements = circuitJson.filter((element) =>
    isSilkscreenElement(element, layer),
  )
  if (elements.length === 0) return null
  const apertureElements = circuitJson.filter((element) =>
    isOpenSurfaceAperture(element, soldermaskVisible),
  )

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

  drawSilkscreenLayer({
    ctx,
    layer,
    bounds,
    elements,
    apertureElements,
    silkscreenColor,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
