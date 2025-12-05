// Utility for creating soldermask textures for PCB layers
import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

export function createSoldermaskTextureForLayer({
  layer,
  circuitJson,
  boardData,
  soldermaskColor,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  soldermaskColor: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(boardData.width! * traceTextureResolution)
  const canvasHeight = Math.floor(boardData.height! * traceTextureResolution)
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  // Fill the entire canvas with soldermask color
  ctx.fillStyle = soldermaskColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Helper functions for coordinate conversion
  const canvasXFromPcb = (pcbX: number) =>
    (pcbX - boardData.center.x + boardData.width! / 2) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (-(pcbY - boardData.center.y) + boardData.height! / 2) *
    traceTextureResolution

  // Cut out openings for pads, vias, and plated holes (expose copper)
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "black"

  // Get all SMT pads on this layer
  const pcbSmtPads = su(circuitJson).pcb_smtpad.list()
  const smtPadsOnLayer = pcbSmtPads.filter((pad) => pad.layer === layer)

  smtPadsOnLayer.forEach((pad: any) => {
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

    const x = pad.x as number
    const y = pad.y as number
    const canvasX = canvasXFromPcb(x)
    const canvasY = canvasYFromPcb(y)

    if (pad.shape === "rect") {
      const width = (pad.width as number) * traceTextureResolution
      const height = (pad.height as number) * traceTextureResolution
      ctx.fillRect(canvasX - width / 2, canvasY - height / 2, width, height)
    } else if (pad.shape === "circle") {
      const radius =
        ((pad.radius ?? pad.width / 2) as number) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI)
      ctx.fill()
    } else if (pad.shape === "pill" || pad.shape === "rotated_rect") {
      const width = (pad.width as number) * traceTextureResolution
      const height = (pad.height as number) * traceTextureResolution
      const radius = Math.min(width, height) / 2
      ctx.beginPath()
      ctx.roundRect(
        canvasX - width / 2,
        canvasY - height / 2,
        width,
        height,
        radius,
      )
      ctx.fill()
    }
  })

  // Get all vias (they go through both layers)
  const pcbVias = su(circuitJson).pcb_via.list()
  pcbVias.forEach((via) => {
    const canvasX = canvasXFromPcb(via.x)
    const canvasY = canvasYFromPcb(via.y)
    const canvasRadius = (via.outer_diameter / 2) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI)
    ctx.fill()
  })

  // Get all plated holes on this layer
  const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
  pcbPlatedHoles.forEach((hole: any) => {
    if (!hole.layers?.includes(layer)) return

    const x = hole.x as number
    const y = hole.y as number
    const canvasX = canvasXFromPcb(x)
    const canvasY = canvasYFromPcb(y)

    if (hole.shape === "circle") {
      const outerDiameter = hole.outer_diameter as number
      const canvasRadius = (outerDiameter / 2) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI)
      ctx.fill()
    } else if (hole.shape === "pill" || hole.shape === "oval") {
      const width =
        ((hole.outer_width ??
          hole.outer_diameter ??
          hole.hole_width) as number) * traceTextureResolution
      const height =
        ((hole.outer_height ??
          hole.outer_diameter ??
          hole.hole_height) as number) * traceTextureResolution
      const radius = Math.min(width, height) / 2
      ctx.beginPath()
      ctx.roundRect(
        canvasX - width / 2,
        canvasY - height / 2,
        width,
        height,
        radius,
      )
      ctx.fill()
    }
  })

  // Get copper pours that are not covered with soldermask
  const pcbCopperPours = su(circuitJson).pcb_copper_pour.list()
  pcbCopperPours.forEach((pour) => {
    if (pour.layer !== layer) return
    // Only cut out if explicitly NOT covered with solder mask
    if ((pour as any).covered_with_solder_mask !== false) return

    if (pour.shape === "rect") {
      const centerX = canvasXFromPcb(pour.center.x)
      const centerY = canvasYFromPcb(pour.center.y)
      const width = pour.width * traceTextureResolution
      const height = pour.height * traceTextureResolution
      ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height)
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
    }
  })

  ctx.globalCompositeOperation = "source-over"

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
