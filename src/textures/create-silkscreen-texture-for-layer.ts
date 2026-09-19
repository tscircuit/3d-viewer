import type { AnyCircuitElement, PcbBoard, PcbViaInput } from "circuit-json"
import * as THREE from "three"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"
import { drawSilkscreenLayer } from "./silkscreen/silkscreen-drawing"
import { getSoldermaskRenderBounds } from "./soldermask/soldermask-bounds"

type PcbBoardWithViaTenting = PcbBoard & {
  default_via_tented_on_top?: boolean
  default_via_tented_on_bottom?: boolean
}

type PcbViaTenting = PcbViaInput & {
  tented_on_top?: boolean
  tented_on_bottom?: boolean
}

const isSilkscreenElement = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
) => {
  if (!("layer" in element) || element.layer !== layer) return false
  const elementType = element.type as string

  return elementType.startsWith("pcb_silkscreen_")
}

export const isOpenSurfaceAperture = (
  element: AnyCircuitElement,
  layer: "top" | "bottom",
  boardData: PcbBoardWithViaTenting,
  soldermaskVisible: boolean,
) => {
  if (element.type === "pcb_cutout") return true
  if (element.type === "pcb_via") {
    const tenting: PcbViaTenting = element
    const viaTenting =
      layer === "top" ? tenting.tented_on_top : tenting.tented_on_bottom
    const boardTenting =
      layer === "top"
        ? boardData.default_via_tented_on_top
        : boardData.default_via_tented_on_bottom
    return (
      !soldermaskVisible ||
      (viaTenting ?? tenting.is_tented ?? boardTenting) !== true
    )
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
    isOpenSurfaceAperture(element, layer, boardData, soldermaskVisible),
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
