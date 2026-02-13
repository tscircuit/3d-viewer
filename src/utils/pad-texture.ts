// Utility for creating SMT pad textures for PCB layers

import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

export function createPadTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperColor,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  copperColor: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const pcbSmtPads = su(circuitJson).pcb_smtpad.list()
  const smtPadsOnLayer = pcbSmtPads.filter((pad) => pad.layer === layer)

  if (smtPadsOnLayer.length === 0) return null

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

  // Helper functions for coordinate conversion using outline bounds
  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardOutlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (boardOutlineBounds.maxY - pcbY) * traceTextureResolution

  ctx.fillStyle = copperColor

  smtPadsOnLayer.forEach((pad: any) => {
    // Handle polygon pads
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

    if (pad.x === undefined || pad.y === undefined) return

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
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
