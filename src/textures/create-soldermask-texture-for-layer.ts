import * as THREE from "three"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbCopperPour,
  PcbRenderLayer,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import {
  colors as defaultColors,
  soldermaskColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

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
  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
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

  const hasBoardInCircuit = circuitJson.some((e) => e.type === "pcb_board")
  const baseElements = hasBoardInCircuit
    ? circuitJson
    : [boardData, ...circuitJson]

  const elementsToDraw = baseElements
  const copperRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  const soldermaskColor = toRgb(
    soldermaskColors[boardData.material] ?? defaultColors.fr4SolderMaskGreen,
  )
  const soldermaskOverCopperColor =
    boardData.material === "fr1"
      ? toRgb(defaultColors.fr1TracesWithMaskCopper)
      : toRgb(defaultColors.fr4TracesWithMaskGreen)
  const copperColor = toRgb(defaultColors.copper)
  const transparent = "rgba(0,0,0,0)"

  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: transparent,
        bottom: transparent,
        inner1: transparent,
        inner2: transparent,
        inner3: transparent,
        inner4: transparent,
        inner5: transparent,
        inner6: transparent,
      },
      drill: transparent,
      boardOutline: transparent,
      substrate: transparent,
      keepout: transparent,
      fabricationNote: transparent,
      silkscreen: { top: transparent, bottom: transparent },
      courtyard: { top: transparent, bottom: transparent },
      soldermask: {
        top: soldermaskColor,
        bottom: soldermaskColor,
      },
      soldermaskWithCopperUnderneath: {
        top: soldermaskColor,
        bottom: soldermaskColor,
      },
      soldermaskOverCopper: {
        top: soldermaskOverCopperColor,
        bottom: soldermaskOverCopperColor,
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
    layers: [copperRenderLayer],
    drawSoldermask: true,
    drawSoldermaskTop: layer === "top",
    drawSoldermaskBottom: layer === "bottom",
  })

  const uncoveredPours = elementsToDraw.filter(
    (e): e is PcbCopperPour =>
      e.type === "pcb_copper_pour" &&
      e.layer === layer &&
      e.covered_with_solder_mask === false,
  )
  if (uncoveredPours.length > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "destination-out"
    const cutoutDrawer = new CircuitToCanvasDrawer(ctx)
    cutoutDrawer.configure({
      colorOverrides: {
        copper: {
          top: copperColor,
          bottom: copperColor,
          inner1: copperColor,
          inner2: copperColor,
          inner3: copperColor,
          inner4: copperColor,
          inner5: copperColor,
          inner6: copperColor,
        },
      },
    })
    cutoutDrawer.setCameraBounds({
      minX: boardOutlineBounds.minX,
      maxX: boardOutlineBounds.maxX,
      minY: boardOutlineBounds.minY,
      maxY: boardOutlineBounds.maxY,
    })
    cutoutDrawer.drawElements(uncoveredPours, { layers: [copperRenderLayer] })
    ctx.restore()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
