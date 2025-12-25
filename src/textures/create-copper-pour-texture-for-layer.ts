// Utility for creating copper pour textures for PCB layers
import * as THREE from "three"
import type { AnyCircuitElement, PcbCopperPour, PcbBoard } from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { su } from "@tscircuit/circuit-json-util"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { ringToPoints } from "../geoms/brep-converter"
import {
  colors as defaultColors,
  TRACE_TEXTURE_RESOLUTION,
} from "../geoms/constants"
import {
  extractRectBorderRadius,
  clampRectBorderRadius,
} from "../utils/rect-border-radius"

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

/**
 * Draw SMT pad shapes on canvas (reused from soldermask-texture.ts)
 */
function drawPadShape({
  ctx,
  pad,
  canvasXFromPcb,
  canvasYFromPcb,
  traceTextureResolution,
}: {
  ctx: CanvasRenderingContext2D
  pad: any // Use any to handle different pad shape types
  canvasXFromPcb: (x: number) => number
  canvasYFromPcb: (y: number) => number
  traceTextureResolution: number
}) {
  // Handle polygon pads differently - they don't have x, y coordinates
  if (pad.shape === "polygon" && pad.points) {
    ctx.beginPath()
    pad.points.forEach((point: { x: number; y: number }, index: number) => {
      const px = canvasXFromPcb(point.x)
      const py = canvasYFromPcb(point.y)
      if (index === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
    })
    ctx.closePath()
    ctx.fill()
    return
  }

  // For non-polygon pads, use x and y coordinates
  if (pad.x === undefined || pad.y === undefined) return

  // Skip pads with invalid (NaN) coordinates
  if (Number.isNaN(pad.x) || Number.isNaN(pad.y)) {
    console.warn(
      `[copper-pour-texture] Skipping pad ${pad.pcb_smtpad_id} with NaN coordinates`,
    )
    return
  }

  const x = pad.x as number
  const y = pad.y as number
  const canvasX = canvasXFromPcb(x)
  const canvasY = canvasYFromPcb(y)

  if (pad.shape === "rect") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    if (borderRadius > 0) {
      ctx.beginPath()
      ctx.roundRect(
        canvasX - width / 2,
        canvasY - height / 2,
        width,
        height,
        borderRadius,
      )
      ctx.fill()
    } else {
      ctx.fillRect(canvasX - width / 2, canvasY - height / 2, width, height)
    }
  } else if (pad.shape === "circle") {
    const radius =
      ((pad.radius ?? pad.width / 2) as number) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI)
    ctx.fill()
  } else if (pad.shape === "pill") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    ctx.beginPath()
    ctx.roundRect(
      canvasX - width / 2,
      canvasY - height / 2,
      width,
      height,
      borderRadius,
    )
    ctx.fill()
  } else if (pad.shape === "rotated_rect") {
    const width = (pad.width as number) * traceTextureResolution
    const height = (pad.height as number) * traceTextureResolution
    const rawRadius = extractRectBorderRadius(pad)
    const borderRadius =
      clampRectBorderRadius(
        pad.width as number,
        pad.height as number,
        rawRadius,
      ) * traceTextureResolution

    // For rotated_rect, always apply rotation transform
    // Canvas rotation is clockwise-positive, but ccw_rotation is counter-clockwise
    // Also canvas Y is inverted. Net effect: negate rotation to match 3D geometry
    const ccwRotation = (pad.ccw_rotation as number) || 0
    const rotation = -ccwRotation * (Math.PI / 180)

    ctx.save()
    ctx.translate(canvasX, canvasY)
    ctx.rotate(rotation)
    ctx.beginPath()
    ctx.roundRect(-width / 2, -height / 2, width, height, borderRadius)
    ctx.fill()
    ctx.restore()
  }
}

export function createCopperPourTextureForLayer({
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

  // Draw SMT pads as copper (if enabled)
  if (includePads && smtPadsOnLayer.length > 0) {
    // SMT pads are always copper color (not affected by soldermask coverage)
    const copperColor = `rgb(${defaultColors.copper[0] * 255}, ${defaultColors.copper[1] * 255}, ${defaultColors.copper[2] * 255})`
    ctx.fillStyle = copperColor

    smtPadsOnLayer.forEach((pad) => {
      drawPadShape({
        ctx,
        pad,
        canvasXFromPcb,
        canvasYFromPcb,
        traceTextureResolution,
      })
    })
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
