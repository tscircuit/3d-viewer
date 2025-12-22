// Utility for creating copper pour textures for PCB layers
import * as THREE from "three"
import type { AnyCircuitElement, PcbCopperPour, PcbBoard } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { segmentToPoints, ringToPoints } from "../geoms/brep-converter"
import {
  colors as defaultColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"

/**
 * Draw a polygon shape on canvas (for brep shapes - custom implementation)
 */
function drawPolygon({
  ctx,
  points,
  canvasXFromPcb,
  canvasYFromPcb,
}: {
  ctx: CanvasRenderingContext2D
  points: [number, number][]
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}) {
  if (points.length < 3) return

  ctx.beginPath()
  points.forEach((point, index) => {
    const canvasX = canvasXFromPcb(point[0])
    const canvasY = canvasYFromPcb(point[1])
    if (index === 0) {
      ctx.moveTo(canvasX, canvasY)
    } else {
      ctx.lineTo(canvasX, canvasY)
    }
  })
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw brep shape using custom implementation (not supported by circuit-to-canvas yet)
 */
function drawBrepShape({
  ctx,
  pour,
  canvasXFromPcb,
  canvasYFromPcb,
}: {
  ctx: CanvasRenderingContext2D
  pour: PcbCopperPour
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
}) {
  const brepShape = (pour as any).brep_shape
  if (!brepShape || !brepShape.outer_ring) return

  // Draw outer ring
  const outerRingPoints = ringToPoints(brepShape.outer_ring, 32)
  if (outerRingPoints.length >= 3) {
    drawPolygon({
      ctx,
      points: outerRingPoints,
      canvasXFromPcb,
      canvasYFromPcb,
    })
  }

  // Cut out inner rings (holes)
  if (brepShape.inner_rings && brepShape.inner_rings.length > 0) {
    ctx.globalCompositeOperation = "destination-out"

    for (const innerRing of brepShape.inner_rings) {
      const innerRingPoints = ringToPoints(innerRing, 32)
      if (innerRingPoints.length >= 3) {
        drawPolygon({
          ctx,
          points: innerRingPoints,
          canvasXFromPcb,
          canvasYFromPcb,
        })
      }
    }

    ctx.globalCompositeOperation = "source-over"
  }
}

export function createCopperPourTextureForLayer({
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
  const copperPours = circuitJson.filter(
    (e) => e.type === "pcb_copper_pour",
  ) as PcbCopperPour[]

  const poursOnLayer = copperPours.filter((p) => p.layer === layer)
  if (poursOnLayer.length === 0) return null

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

  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardOutlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (boardOutlineBounds.maxY - pcbY) * traceTextureResolution

  // Separate pours by shape type
  const rectAndPolygonPours = poursOnLayer.filter(
    (pour) => pour.shape === "rect" || pour.shape === "polygon",
  )
  const brepPours = poursOnLayer.filter((pour) => pour.shape === "brep")

  // Draw rect and polygon pours using circuit-to-canvas
  if (rectAndPolygonPours.length > 0) {
    const drawer = new CircuitToCanvasDrawer(ctx)

    // Set up camera bounds to match canvas coordinates
    drawer.setCameraBounds({
      minX: boardOutlineBounds.minX,
      maxX: boardOutlineBounds.maxX,
      minY: boardOutlineBounds.minY,
      maxY: boardOutlineBounds.maxY,
    })

    // Group pours by soldermask coverage and draw them separately
    const coveredPours = rectAndPolygonPours.filter(
      (p) => p.covered_with_solder_mask !== false,
    )
    const uncoveredPours = rectAndPolygonPours.filter(
      (p) => p.covered_with_solder_mask === false,
    )

    // Create color maps
    const coveredColor = `rgb(${defaultColors.fr4TracesWithMaskGreen.map((c) => c * 255).join(",")})`
    const uncoveredColor = `rgb(${defaultColors.copper.map((c) => c * 255).join(",")})`

    // Draw covered pours
    if (coveredPours.length > 0) {
      drawer.configure({
        colorOverrides: {
          copper: {
            top: coveredColor,
            bottom: coveredColor,
            inner1: coveredColor,
            inner2: coveredColor,
            inner3: coveredColor,
            inner4: coveredColor,
            inner5: coveredColor,
            inner6: coveredColor,
          },
        },
      })
      drawer.drawElements(coveredPours, { layers: [layer] })
    }

    // Draw uncovered pours
    if (uncoveredPours.length > 0) {
      drawer.configure({
        colorOverrides: {
          copper: {
            top: uncoveredColor,
            bottom: uncoveredColor,
            inner1: uncoveredColor,
            inner2: uncoveredColor,
            inner3: uncoveredColor,
            inner4: uncoveredColor,
            inner5: uncoveredColor,
            inner6: uncoveredColor,
          },
        },
      })
      drawer.drawElements(uncoveredPours, { layers: [layer] })
    }
  }

  // Draw brep shapes using custom implementation
  for (const pour of brepPours) {
    // Set color based on soldermask coverage
    const covered = pour.covered_with_solder_mask !== false
    const colorArr = covered
      ? defaultColors.fr4TracesWithMaskGreen // Bright green like traces with soldermask
      : defaultColors.copper

    const copperColor = `rgb(${colorArr[0] * 255}, ${colorArr[1] * 255}, ${colorArr[2] * 255})`
    ctx.fillStyle = copperColor

    drawBrepShape({ ctx, pour, canvasXFromPcb, canvasYFromPcb })
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
