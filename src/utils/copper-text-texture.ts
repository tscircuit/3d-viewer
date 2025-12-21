import * as THREE from "three"
import { vectorText } from "@jscad/modeling/src/text"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"
import type { AnyCircuitElement } from "circuit-json"
import type { PcbCopperText } from "../geoms/create-geoms-for-copper-text"
import { calculateOutlineBounds } from "./outline-bounds"

/**
 * Parse a dimension value that could be a number or string (e.g., "0.5mm")
 */
function parseDimension(
  value: number | string | undefined,
  defaultValue: number,
): number {
  if (value === undefined) return defaultValue
  if (typeof value === "number") return value
  // Simple parsing - strip 'mm' suffix if present
  const num = parseFloat(value.replace(/mm$/, ""))
  return isNaN(num) ? defaultValue : num
}

/**
 * Determine if text should be mirrored based on layer and is_mirrored property
 * - Bottom layer: auto-mirror unless is_mirrored is explicitly false
 * - Top layer: only mirror if is_mirrored is explicitly true
 */
function shouldMirrorText(text: PcbCopperText): boolean {
  if (text.layer === "bottom") {
    // Bottom layer should auto-mirror unless explicitly set to false
    return text.is_mirrored !== false
  }
  // For top layer, only mirror if explicitly requested
  return text.is_mirrored === true
}

/**
 * Get text metrics (bounds and dimensions) from text outlines
 */
function getTextMetrics(outlines: Array<Array<[number, number]>>) {
  const points = outlines.flat()
  if (points.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
    }
  }
  const minX = Math.min(...points.map((p) => p[0]))
  const maxX = Math.max(...points.map((p) => p[0]))
  const minY = Math.min(...points.map((p) => p[1]))
  const maxY = Math.max(...points.map((p) => p[1]))
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

/**
 * Process raw text outlines to fix visual issues with certain characters
 */
function processTextOutlines(
  rawOutlines: any[],
): Array<Array<[number, number]>> {
  const processed: Array<Array<[number, number]>> = []
  rawOutlines.forEach((outline: any) => {
    // Split number 8 and small e into two parts to fix visual issues
    if (outline.length === 29) {
      processed.push(outline.slice(0, 15) as Array<[number, number]>)
      processed.push(outline.slice(14, 29) as Array<[number, number]>)
    } else if (outline.length === 17) {
      processed.push(outline.slice(0, 10) as Array<[number, number]>)
      processed.push(outline.slice(9, 17) as Array<[number, number]>)
    } else {
      processed.push(outline as Array<[number, number]>)
    }
  })
  return processed
}

/**
 * Calculate alignment offset based on text bounds and anchor alignment
 */
function getAlignmentOffset(
  metrics: ReturnType<typeof getTextMetrics>,
  alignment: string,
): { x: number; y: number } {
  let xOff = -metrics.centerX // default: center
  let yOff = -metrics.centerY // default: center

  // Horizontal alignment
  if (alignment.includes("left")) {
    xOff = -metrics.minX
  } else if (alignment.includes("right")) {
    xOff = -metrics.maxX
  }

  // Vertical alignment
  if (alignment.includes("top")) {
    yOff = -metrics.maxY
  } else if (alignment.includes("bottom")) {
    yOff = -metrics.minY
  }

  return { x: xOff, y: yOff }
}

/**
 * Build transformation matrix for text (mirroring + rotation)
 */
function buildTransformMatrix(
  text: PcbCopperText,
  metrics: ReturnType<typeof getTextMetrics>,
): { matrix: Matrix | undefined; rotationDeg: number } {
  const transformMatrices: Matrix[] = []
  let rotationDeg = text.ccw_rotation ?? 0

  const shouldMirror = shouldMirrorText(text)
  if (shouldMirror) {
    // Mirror around center point
    transformMatrices.push(
      translate(metrics.centerX, metrics.centerY),
      { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, // horizontal flip
      translate(-metrics.centerX, -metrics.centerY),
    )
    // Reverse rotation direction for mirrored text
    rotationDeg = -rotationDeg
  }

  if (rotationDeg) {
    const rad = (rotationDeg * Math.PI) / 180
    transformMatrices.push(
      translate(metrics.centerX, metrics.centerY),
      rotate(rad),
      translate(-metrics.centerX, -metrics.centerY),
    )
  }

  const matrix =
    transformMatrices.length > 0 ? compose(...transformMatrices) : undefined
  return { matrix, rotationDeg }
}

/**
 * Draw text strokes on canvas
 */
function drawTextStrokes(
  ctx: CanvasRenderingContext2D,
  outlines: Array<Array<[number, number]>>,
  transform: Matrix | undefined,
  offset: { x: number; y: number },
  anchorPos: { x: number; y: number },
  canvasXFromPcb: (x: number) => number,
  canvasYFromPcb: (y: number) => number,
) {
  outlines.forEach((segment) => {
    ctx.beginPath()
    segment.forEach((p, index) => {
      let transformedP = { x: p[0], y: p[1] }
      if (transform) {
        transformedP = applyToPoint(transform, transformedP)
      }
      const pcbX = transformedP.x + offset.x + anchorPos.x
      const pcbY = transformedP.y + offset.y + anchorPos.y
      const canvasX = canvasXFromPcb(pcbX)
      const canvasY = canvasYFromPcb(pcbY)
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    })
    ctx.stroke()
  })
}

/**
 * Draw a rotated rectangle on canvas
 */
function drawRotatedRect(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotationRad: number,
) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(-rotationRad) // Canvas rotation is clockwise, we use CCW
  ctx.fillRect(-width / 2, -height / 2, width, height)
  ctx.restore()
}

/**
 * Draw knockout text - a filled rectangle with text cut out
 */
function drawKnockoutText(
  ctx: CanvasRenderingContext2D,
  text: PcbCopperText,
  outlines: Array<Array<[number, number]>>,
  metrics: ReturnType<typeof getTextMetrics>,
  transform: Matrix | undefined,
  rotationDeg: number,
  canvasXFromPcb: (x: number) => number,
  canvasYFromPcb: (y: number) => number,
  traceTextureResolution: number,
  copperColor: string,
) {
  const fontSize = typeof text.font_size === "number" ? text.font_size : 0.2

  // Parse knockout padding (defaults based on font size, matching pcb-viewer)
  const padding = {
    left: parseDimension(text.knockout_padding?.left, fontSize * 0.5),
    right: parseDimension(text.knockout_padding?.right, fontSize * 0.5),
    top: parseDimension(text.knockout_padding?.top, fontSize * 0.3),
    bottom: parseDimension(text.knockout_padding?.bottom, fontSize * 0.3),
  }

  // Calculate rectangle dimensions
  const rectWidth = metrics.width + padding.left + padding.right
  const rectHeight = metrics.height + padding.top + padding.bottom

  // Rectangle is centered at anchor position
  const rectCenterCanvasX = canvasXFromPcb(text.anchor_position.x)
  const rectCenterCanvasY = canvasYFromPcb(text.anchor_position.y)
  const rectWidthPx = rectWidth * traceTextureResolution
  const rectHeightPx = rectHeight * traceTextureResolution

  // Draw filled rectangle (apply rotation if any)
  ctx.fillStyle = copperColor
  const rotationRad = (rotationDeg * Math.PI) / 180
  drawRotatedRect(
    ctx,
    rectCenterCanvasX,
    rectCenterCanvasY,
    rectWidthPx,
    rectHeightPx,
    rotationRad,
  )

  // Calculate text offset to center it in the rectangle
  // For knockout, text is always centered in the rectangle
  const textOffset = {
    x: -metrics.centerX,
    y: -metrics.centerY,
  }

  // Switch to "cut out" mode - drawing will remove pixels
  ctx.globalCompositeOperation = "destination-out"

  // Draw text strokes (will cut holes in the rectangle)
  drawTextStrokes(
    ctx,
    outlines,
    transform,
    textOffset,
    text.anchor_position,
    canvasXFromPcb,
    canvasYFromPcb,
  )

  // Reset to normal mode
  ctx.globalCompositeOperation = "source-over"
}

export function createCopperTextTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperColor = "rgb(230, 153, 51)", // Same as colors.copper [0.9, 0.6, 0.2]
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: any
  copperColor?: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const copperTexts = circuitJson.filter(
    (e) => e.type === "pcb_copper_text",
  ) as PcbCopperText[]

  const textsOnLayer = copperTexts.filter((t) => t.layer === layer)

  if (textsOnLayer.length === 0) {
    return null
  }

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

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  ctx.strokeStyle = copperColor
  ctx.fillStyle = copperColor

  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardOutlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (boardOutlineBounds.maxY - pcbY) * traceTextureResolution

  // Draw each copper text
  textsOnLayer.forEach((textS: PcbCopperText) => {
    const fontSize = typeof textS.font_size === "number" ? textS.font_size : 0.2

    // Stroke width for text
    const textStrokeWidth =
      Math.max(0.02, fontSize * 0.08) * traceTextureResolution
    ctx.lineWidth = textStrokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Generate text outlines
    const rawTextOutlines = vectorText({
      height: fontSize * 0.45,
      input: textS.text,
    })
    const processedOutlines = processTextOutlines(rawTextOutlines)
    const metrics = getTextMetrics(processedOutlines)

    // Build transformation matrix
    const { matrix: transform, rotationDeg } = buildTransformMatrix(
      textS,
      metrics,
    )

    if (textS.is_knockout) {
      // Draw knockout text (filled rect with text cut out)
      drawKnockoutText(
        ctx,
        textS,
        processedOutlines,
        metrics,
        transform,
        rotationDeg,
        canvasXFromPcb,
        canvasYFromPcb,
        traceTextureResolution,
        copperColor,
      )
    } else {
      // Draw normal text
      const alignment = textS.anchor_alignment || "center"
      const offset = getAlignmentOffset(metrics, alignment)

      drawTextStrokes(
        ctx,
        processedOutlines,
        transform,
        offset,
        textS.anchor_position,
        canvasXFromPcb,
        canvasYFromPcb,
      )
    }
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
