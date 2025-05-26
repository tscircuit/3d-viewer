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
import { su } from "@tscircuit/soup-util"

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

  const textsOnLayer = pcbSilkscreenTexts.filter((t) => t.layer === layer)
  const pathsOnLayer = pcbSilkscreenPaths.filter((p) => p.layer === layer)
  if (textsOnLayer.length === 0 && pathsOnLayer.length === 0) return null

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

  // Draw Silkscreen Paths
  pathsOnLayer.forEach((path: any) => {
    if (path.route.length < 2) return
    ctx.beginPath()
    ctx.lineWidth = (path.stroke_width || 0.1) * traceTextureResolution
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    path.route.forEach((point: any, index: number) => {
      const canvasX =
        (point.x - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const canvasY =
        (-(point.y - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    })
    ctx.stroke()
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
      height: fontSize * 0.57,
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
    if (textS.anchor_alignment?.includes("right")) xOff = -textBounds.maxX
    else if (textS.anchor_alignment?.includes("left")) xOff = -textBounds.minX
    if (textS.anchor_alignment?.includes("top")) yOff = -textBounds.maxY
    else if (textS.anchor_alignment?.includes("bottom")) yOff = -textBounds.minY
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
        const canvasX =
          (pcbX - boardData.center.x + boardData.width / 2) *
          traceTextureResolution
        const canvasY =
          (-(pcbY - boardData.center.y) + boardData.height / 2) *
          traceTextureResolution
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
