// Utility for creating copper pour textures for PCB layers
import * as THREE from "three"
import type { AnyCircuitElement, PcbCopperPour, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { calculateOutlineBounds } from "./outline-bounds"

export function createCopperPourTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperPourColors,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  copperPourColors: {
    masked: [number, number, number]
    exposed: [number, number, number]
  }
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const copperPours = su(circuitJson).pcb_copper_pour.list() as PcbCopperPour[]
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

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  // Helper functions for coordinate conversion
  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardOutlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (boardOutlineBounds.maxY - pcbY) * traceTextureResolution

  // Helper function to get color as RGB string
  const rgbToString = (rgb: [number, number, number]) =>
    `rgb(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255})`

  // Draw each copper pour
  for (const pour of poursOnLayer) {
    const covered = (pour as any).covered_with_solder_mask !== false
    const color = covered ? copperPourColors.masked : copperPourColors.exposed
    ctx.fillStyle = rgbToString(color)

    if (pour.shape === "rect") {
      const centerX = canvasXFromPcb(pour.center.x)
      const centerY = canvasYFromPcb(pour.center.y)
      const width = pour.width * traceTextureResolution
      const height = pour.height * traceTextureResolution

      // Handle rotation if specified
      if (pour.rotation) {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate((-pour.rotation * Math.PI) / 180) // Negative because canvas Y is flipped
        ctx.fillRect(-width / 2, -height / 2, width, height)
        ctx.restore()
      } else {
        ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height)
      }
    } else if (pour.shape === "polygon" && pour.points) {
      ctx.beginPath()
      pour.points.forEach((point, index) => {
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
    } else if (pour.shape === "brep") {
      const brepShape = (pour as any).brep_shape
      if (!brepShape || !brepShape.outer_ring)
        // Draw outer ring
        ctx.beginPath()
      brepShape.outer_ring.vertices.forEach((vertex: any, index: number) => {
        const px = canvasXFromPcb(vertex.x)
        const py = canvasYFromPcb(vertex.y)
        if (index === 0) {
          ctx.moveTo(px, py)
        } else {
          ctx.lineTo(px, py)
        }
      })
      ctx.closePath()

      // Cut out inner rings (holes)
      if (brepShape.inner_rings) {
        for (const innerRing of brepShape.inner_rings) {
          for (const [index, vertex] of innerRing.vertices.entries()) {
            const px = canvasXFromPcb(vertex.x)
            const py = canvasYFromPcb(vertex.y)
            if (index === 0) {
              ctx.moveTo(px, py)
            } else {
              ctx.lineTo(px, py)
            }
          }
        }
      }

      ctx.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
