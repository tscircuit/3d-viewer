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
import { su } from "@tscircuit/circuit-json-util"
import { coerceDimensionToMm, parseDimensionToMm } from "./units"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

export function createSilkscreenTextureForLayer({
  layer,
  circuitJson,
  boardData,
  silkscreenColor = "rgb(255,255,255)",
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: any
  silkscreenColor?: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const pcbSilkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
  const pcbSilkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()
  const pcbSilkscreenLines = su(circuitJson).pcb_silkscreen_line.list()
  const pcbSilkscreenRects = su(circuitJson).pcb_silkscreen_rect.list()

  const textsOnLayer = pcbSilkscreenTexts.filter((t) => t.layer === layer)
  const pathsOnLayer = pcbSilkscreenPaths.filter((p) => p.layer === layer)
  const linesOnLayer = pcbSilkscreenLines.filter((l) => l.layer === layer)
  const rectsOnLayer = pcbSilkscreenRects.filter((r) => r.layer === layer)
  if (
    textsOnLayer.length === 0 &&
    pathsOnLayer.length === 0 &&
    linesOnLayer.length === 0 &&
    rectsOnLayer.length === 0
  ) {
    return null
  }

  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(boardData.width * traceTextureResolution)
  const canvasHeight = Math.floor(boardData.height * traceTextureResolution)
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  ctx.strokeStyle = silkscreenColor
  ctx.fillStyle = silkscreenColor

  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardData.center.x + boardData.width / 2) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (-(pcbY - boardData.center.y) + boardData.height / 2) *
    traceTextureResolution

  // Draw Silkscreen Lines
  linesOnLayer.forEach((lineEl: any) => {
    const startXmm = parseDimensionToMm(lineEl.x1) ?? 0
    const startYmm = parseDimensionToMm(lineEl.y1) ?? 0
    const endXmm = parseDimensionToMm(lineEl.x2) ?? 0
    const endYmm = parseDimensionToMm(lineEl.y2) ?? 0

    if (startXmm === endXmm && startYmm === endYmm) return

    ctx.beginPath()
    ctx.lineWidth =
      coerceDimensionToMm(lineEl.stroke_width, 0.1) * traceTextureResolution
    ctx.lineCap = "round"
    ctx.moveTo(canvasXFromPcb(startXmm), canvasYFromPcb(startYmm))
    ctx.lineTo(canvasXFromPcb(endXmm), canvasYFromPcb(endYmm))
    ctx.stroke()
  })

  // Draw Silkscreen Paths
  pathsOnLayer.forEach((path: any) => {
    if (path.route.length < 2) return
    ctx.beginPath()
    ctx.lineWidth =
      coerceDimensionToMm(path.stroke_width, 0.1) * traceTextureResolution
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    path.route.forEach((point: any, index: number) => {
      const canvasX = canvasXFromPcb(parseDimensionToMm(point.x) ?? 0)
      const canvasY = canvasYFromPcb(parseDimensionToMm(point.y) ?? 0)
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    })
    ctx.stroke()
  })

  // Draw Silkscreen Rectangles
  rectsOnLayer.forEach((rect: any) => {
    const width = coerceDimensionToMm(rect.width, 0)
    const height = coerceDimensionToMm(rect.height, 0)
    if (width <= 0 || height <= 0) return

    const centerXmm = parseDimensionToMm(rect.center?.x) ?? 0
    const centerYmm = parseDimensionToMm(rect.center?.y) ?? 0

    const canvasCenterX = canvasXFromPcb(centerXmm)
    const canvasCenterY = canvasYFromPcb(centerYmm)

    const rawRadius = extractRectBorderRadius(rect)
    const borderRadiusInput =
      typeof rawRadius === "string" ? parseDimensionToMm(rawRadius) : rawRadius
    const borderRadiusMm = clampRectBorderRadius(
      width,
      height,
      borderRadiusInput,
    )

    ctx.save()
    ctx.translate(canvasCenterX, canvasCenterY)

    const halfWidthPx = (width / 2) * traceTextureResolution
    const halfHeightPx = (height / 2) * traceTextureResolution
    const borderRadiusPx = Math.min(
      borderRadiusMm * traceTextureResolution,
      halfWidthPx,
      halfHeightPx,
    )

    const hasStroke = rect.has_stroke ?? false
    const isFilled = rect.is_filled ?? true
    const isDashed = rect.is_stroke_dashed ?? false
    const strokeWidthPx = hasStroke
      ? coerceDimensionToMm(rect.stroke_width, 0.1) * traceTextureResolution
      : 0

    const drawRoundedRectPath = (
      x: number,
      y: number,
      rectWidth: number,
      rectHeight: number,
      radius: number,
    ) => {
      ctx.beginPath()
      if (radius <= 0) {
        ctx.rect(x, y, rectWidth, rectHeight)
      } else {
        const r = radius
        const right = x + rectWidth
        const bottom = y + rectHeight
        ctx.moveTo(x + r, y)
        ctx.lineTo(right - r, y)
        ctx.quadraticCurveTo(right, y, right, y + r)
        ctx.lineTo(right, bottom - r)
        ctx.quadraticCurveTo(right, bottom, right - r, bottom)
        ctx.lineTo(x + r, bottom)
        ctx.quadraticCurveTo(x, bottom, x, bottom - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
      }
    }

    drawRoundedRectPath(
      -halfWidthPx,
      -halfHeightPx,
      halfWidthPx * 2,
      halfHeightPx * 2,
      borderRadiusPx,
    )

    if (isFilled) {
      ctx.fill()
    }

    if (hasStroke && strokeWidthPx > 0) {
      ctx.lineWidth = strokeWidthPx
      if (isDashed) {
        const dashLength = Math.max(strokeWidthPx * 2, 1)
        ctx.setLineDash([dashLength, dashLength])
      }
      ctx.stroke()
      if (isDashed) {
        ctx.setLineDash([])
      }
    }

    ctx.restore()
  })

  // Draw Silkscreen Text
  textsOnLayer.forEach((textS: any) => {
    const fontSize = textS.font_size || 0.25
    const textStrokeWidth =
      Math.min(Math.max(0.01, fontSize * 0.1), fontSize * 0.05) *
      traceTextureResolution
    ctx.lineWidth = textStrokeWidth
    ctx.lineCap = "butt"
    ctx.lineJoin = "miter"
    const rawTextOutlines = vectorText({
      height: fontSize * 0.45,
      input: textS.text,
    })
    const processedTextOutlines: Array<Array<[number, number]>> = []
    rawTextOutlines.forEach((outline: any) => {
      if (outline.length === 29) {
        processedTextOutlines.push(
          outline.slice(0, 15) as Array<[number, number]>,
        )
        processedTextOutlines.push(
          outline.slice(14, 29) as Array<[number, number]>,
        )
      } else if (outline.length === 17) {
        processedTextOutlines.push(
          outline.slice(0, 10) as Array<[number, number]>,
        )
        processedTextOutlines.push(
          outline.slice(9, 17) as Array<[number, number]>,
        )
      } else {
        processedTextOutlines.push(outline as Array<[number, number]>)
      }
    })
    const points = processedTextOutlines.flat()
    const textBounds = {
      minX: points.length > 0 ? Math.min(...points.map((p) => p[0])) : 0,
      maxX: points.length > 0 ? Math.max(...points.map((p) => p[0])) : 0,
      minY: points.length > 0 ? Math.min(...points.map((p) => p[1])) : 0,
      maxY: points.length > 0 ? Math.max(...points.map((p) => p[1])) : 0,
    }
    const textCenterX = (textBounds.minX + textBounds.maxX) / 2
    const textCenterY = (textBounds.minY + textBounds.maxY) / 2

    let xOff = -textCenterX
    let yOff = -textCenterY

    const alignment = textS.anchor_alignment || "center"

    // Horizontal alignment
    if (alignment.includes("left")) {
      xOff = -textBounds.minX
    } else if (alignment.includes("right")) {
      xOff = -textBounds.maxX
    }

    // Vertical alignment
    if (alignment.includes("top")) {
      yOff = -textBounds.maxY
    } else if (alignment.includes("bottom")) {
      yOff = -textBounds.minY
    }

    const transformMatrices: Matrix[] = []
    let rotationDeg = textS.ccw_rotation ?? 0
    if (textS.layer === "bottom") {
      transformMatrices.push(
        translate(textCenterX, textCenterY),
        { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        translate(-textCenterX, -textCenterY),
      )
      rotationDeg = -rotationDeg
    }
    if (rotationDeg) {
      const rad = (rotationDeg * Math.PI) / 180
      transformMatrices.push(
        translate(textCenterX, textCenterY),
        rotate(rad),
        translate(-textCenterX, -textCenterY),
      )
    }
    const finalTransformMatrix =
      transformMatrices.length > 0 ? compose(...transformMatrices) : undefined
    processedTextOutlines.forEach((segment) => {
      ctx.beginPath()
      segment.forEach((p, index) => {
        let transformedP = { x: p[0], y: p[1] }
        if (finalTransformMatrix) {
          transformedP = applyToPoint(finalTransformMatrix, transformedP)
        }
        const pcbX = transformedP.x + xOff + textS.anchor_position.x
        const pcbY = transformedP.y + yOff + textS.anchor_position.y
        const canvasX = canvasXFromPcb(pcbX)
        const canvasY = canvasYFromPcb(pcbY)
        if (index === 0) ctx.moveTo(canvasX, canvasY)
        else ctx.lineTo(canvasX, canvasY)
      })
      ctx.stroke()
    })
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
