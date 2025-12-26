// Utility for creating copper layer textures for PCB layers (includes copper pours and SMT pads)
import * as THREE from "three"
import type { AnyCircuitElement, PcbCopperPour, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { TRACE_TEXTURE_RESOLUTION } from "../geoms/constants"

// New modular imports
import {
  createCoordinateTransform,
  setupBottomLayerContext,
  drawBrepShape,
} from "./utils/coordinate-transform"
import { drawPadShape } from "./drawing/pad-drawer"
import { getCopperColor } from "./utils/colors"
import { createOptimizedTexture, createCanvas } from "./utils/texture-config"
import { drawRectAndPolygonPours } from "./adapters/circuit-to-canvas-adapter"

export function createCopperLayerTexture({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution = TRACE_TEXTURE_RESOLUTION,
  includePads = true,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution?: number
  includePads?: boolean
}): THREE.CanvasTexture | null {
  const copperPours = circuitJson.filter(
    (e) => e.type === "pcb_copper_pour",
  ) as PcbCopperPour[]

  const poursOnLayer = copperPours.filter((p) => p.layer === layer)

  // Also check for SMT pads if includePads is enabled
  let smtPadsOnLayer: any[] = []
  if (includePads) {
    const pcbSmtPads = su(circuitJson).pcb_smtpad.list()
    smtPadsOnLayer = pcbSmtPads.filter((pad) => pad.layer === layer)
  }

  // Return null if there's nothing to render
  if (poursOnLayer.length === 0 && smtPadsOnLayer.length === 0) return null

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvas = createCanvas(boardOutlineBounds, traceTextureResolution)
  if (!canvas) return null

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Set up coordinate transformation for bottom layer
  if (layer === "bottom") {
    setupBottomLayerContext(ctx, canvas.height)
  }

  const { canvasXFromPcb, canvasYFromPcb } = createCoordinateTransform(
    boardOutlineBounds,
    traceTextureResolution,
  )

  // Separate pours by shape type
  const rectAndPolygonPours = poursOnLayer.filter(
    (pour) => pour.shape === "rect" || pour.shape === "polygon",
  )
  const brepPours = poursOnLayer.filter((pour) => pour.shape === "brep")

  // Draw rect and polygon pours using circuit-to-canvas
  drawRectAndPolygonPours({
    ctx,
    pours: rectAndPolygonPours,
    layer,
    boardOutlineBounds,
  })

  // Draw brep shapes using custom implementation
  for (const pour of brepPours) {
    const covered = pour.covered_with_solder_mask !== false
    const copperColor = getCopperColor(covered)
    ctx.fillStyle = copperColor

    drawBrepShape({ ctx, pour, canvasXFromPcb, canvasYFromPcb })
  }

  // Draw SMT pads as copper (if enabled)
  if (includePads && smtPadsOnLayer.length > 0) {
    // SMT pads are always copper color
    const copperColor = getCopperColor(false)
    ctx.fillStyle = copperColor

    smtPadsOnLayer.forEach((pad) => {
      drawPadShape({
        ctx,
        pad,
        boardOutlineBounds,
      })
    })
  }

  return createOptimizedTexture(canvas)
}
