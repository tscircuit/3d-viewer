// Utility for creating copper pour textures for PCB layers

import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCopperPour,
  PcbHole,
  PcbPlatedHole,
  PcbRenderLayer,
  PcbVia,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import * as THREE from "three"
import {
  colors as defaultColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

// circuit-to-canvas currently renders top/bottom copper pours at 0.5 alpha.
// Re-drawing the same pours several times over transparent background makes
// the final result effectively opaque to match traces/pads copper texture color.
const COPPER_POUR_OPACITY_COMPENSATION_PASSES = 8

export function createCopperPourTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
  copperColor = toRgb(defaultColors.copper),
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution?: number
  copperColor?: string
}): THREE.CanvasTexture | null {
  const copperPours = circuitJson.filter(
    (e) => e.type === "pcb_copper_pour",
  ) as PcbCopperPour[]
  const pcbRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"

  const poursOnLayer = copperPours.filter((p) => p.layer === layer)
  if (poursOnLayer.length === 0) return null
  const holes = circuitJson.filter((e) => e.type === "pcb_hole") as PcbHole[]
  const platedHolesOnLayer = circuitJson.filter((e): e is PcbPlatedHole => {
    if (e.type !== "pcb_plated_hole") return false
    return !Array.isArray(e.layers) || e.layers.includes(layer)
  })
  const viasOnLayer = circuitJson.filter((e): e is PcbVia => {
    if (e.type !== "pcb_via") return false
    return !Array.isArray(e.layers) || e.layers.includes(layer)
  })
  const drillElements = [...holes, ...platedHolesOnLayer, ...viasOnLayer]

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Set up coordinate transformation for bottom layer
  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  const transparent = "rgba(0,0,0,0)"
  const coveredColor = copperColor
  const uncoveredColor = copperColor

  const setColorAndDraw = (pours: PcbCopperPour[], copperPourColor: string) => {
    if (pours.length === 0) return
    const elementsToDraw = [...pours, ...drillElements]

    const drawer = new CircuitToCanvasDrawer(ctx)
    drawer.configure({
      colorOverrides: {
        copper: {
          top: copperPourColor,
          bottom: copperPourColor,
          inner1: copperPourColor,
          inner2: copperPourColor,
          inner3: copperPourColor,
          inner4: copperPourColor,
          inner5: copperPourColor,
          inner6: copperPourColor,
        },
        copperPour: {
          top: transparent,
          bottom: transparent,
        },
        drill: transparent,
        boardOutline: transparent,
        substrate: transparent,
        keepout: transparent,
        fabricationNote: transparent,
        courtyard: { top: transparent, bottom: transparent },
        silkscreen: { top: transparent, bottom: transparent },
        soldermask: { top: transparent, bottom: transparent },
        soldermaskWithCopperUnderneath: {
          top: transparent,
          bottom: transparent,
        },
        soldermaskOverCopper: {
          top: transparent,
          bottom: transparent,
        },
      },
    })
    drawer.setCameraBounds({
      minX: boardOutlineBounds.minX,
      maxX: boardOutlineBounds.maxX,
      minY: boardOutlineBounds.minY,
      maxY: boardOutlineBounds.maxY,
    })
    drawer.drawElements(elementsToDraw, {
      layers: [pcbRenderLayer],
      drawSoldermask: false,
      drawSoldermaskTop: false,
      drawSoldermaskBottom: false,
      showPcbNotes: false,
    })
    for (let i = 1; i < COPPER_POUR_OPACITY_COMPENSATION_PASSES; i += 1) {
      drawer.drawElements(elementsToDraw, {
        layers: [pcbRenderLayer],
        drawSoldermask: false,
        drawSoldermaskTop: false,
        drawSoldermaskBottom: false,
        showPcbNotes: false,
      })
    }
  }

  const coveredPours = poursOnLayer.filter(
    (p) => p.covered_with_solder_mask !== false,
  )
  const uncoveredPours = poursOnLayer.filter(
    (p) => p.covered_with_solder_mask === false,
  )

  setColorAndDraw(coveredPours, coveredColor)
  setColorAndDraw(uncoveredPours, uncoveredColor)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
