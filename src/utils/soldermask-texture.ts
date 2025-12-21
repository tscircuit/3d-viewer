// Utility for creating soldermask textures for PCB layers
import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import {
  extractRectBorderRadius,
  clampRectBorderRadius,
} from "./rect-border-radius"
import { calculateOutlineBounds } from "./outline-bounds"

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
  const outlineBounds = calculateOutlineBounds(boardData)
  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(outlineBounds.width * traceTextureResolution)
  const canvasHeight = Math.floor(outlineBounds.height * traceTextureResolution)
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
    (pcbX - outlineBounds.minX) * traceTextureResolution
  const canvasYFromPcb = (pcbY: number) =>
    (outlineBounds.maxY - pcbY) * traceTextureResolution

  // Fill soldermask - either within board outline or full rectangle
  ctx.fillStyle = soldermaskColor
  if (boardData.outline && boardData.outline.length >= 3) {
    // Draw soldermask only within the board outline
    ctx.beginPath()
    const firstPoint = boardData.outline[0]!
    ctx.moveTo(canvasXFromPcb(firstPoint.x), canvasYFromPcb(firstPoint.y))
    for (let i = 1; i < boardData.outline.length; i++) {
      const point = boardData.outline[i]!
      ctx.lineTo(canvasXFromPcb(point.x), canvasYFromPcb(point.y))
    }
    ctx.closePath()
    ctx.fill()
  } else {
    // No outline - fill the entire canvas
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

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

    // Skip pads with invalid (NaN) coordinates
    if (Number.isNaN(pad.x) || Number.isNaN(pad.y)) {
      console.warn(
        `[soldermask-texture] Skipping pad ${pad.pcb_smtpad_id} with NaN coordinates`,
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
    } else if (hole.shape === "pill") {
      const width =
        ((hole.outer_width ??
          hole.outer_diameter ??
          hole.hole_width) as number) * traceTextureResolution
      const height =
        ((hole.outer_height ??
          hole.outer_diameter ??
          hole.hole_height) as number) * traceTextureResolution
      const radius = Math.min(width, height) / 2
      const ccwRotationDeg = (hole.ccw_rotation as number) || 0
      // we need to negate the rotation to match the 3D geometry
      const rotation = -ccwRotationDeg

      // Apply rotation if specified (convert to radians)
      if (rotation) {
        ctx.save()
        ctx.translate(canvasX, canvasY)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.beginPath()
        ctx.roundRect(-width / 2, -height / 2, width, height, radius)
        ctx.fill()
        ctx.restore()
      } else {
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
    } else if (hole.shape === "oval") {
      const width =
        ((hole.outer_width ??
          hole.outer_diameter ??
          hole.hole_width) as number) * traceTextureResolution
      const height =
        ((hole.outer_height ??
          hole.outer_diameter ??
          hole.hole_height) as number) * traceTextureResolution
      const radiusX = width / 2
      const radiusY = height / 2
      const ccwRotationDeg = (hole.ccw_rotation as number) || 0
      // Canvas rotation is clockwise-positive, negate for ccw
      const rotation = -ccwRotationDeg

      // Apply rotation if specified
      if (rotation) {
        ctx.save()
        ctx.translate(canvasX, canvasY)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.beginPath()
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.ellipse(canvasX, canvasY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.fill()
      }
    } else if (hole.shape === "hole_with_polygon_pad") {
      // Handle plated holes with polygon pads
      const holeShape = hole.hole_shape || "circle"
      const holeOffsetX = hole.hole_offset_x || 0
      const holeOffsetY = hole.hole_offset_y || 0
      // Convert the actual hole position (including offset) to canvas coordinates
      const adjustedCanvasX = canvasXFromPcb(hole.x + holeOffsetX)
      const adjustedCanvasY = canvasYFromPcb(hole.y + holeOffsetY)

      if (holeShape === "pill" || holeShape === "rotated_pill") {
        const width =
          ((hole.outer_width ??
            hole.outer_diameter ??
            hole.hole_width) as number) * traceTextureResolution
        const height =
          ((hole.outer_height ??
            hole.outer_diameter ??
            hole.hole_height) as number) * traceTextureResolution
        const radius = Math.min(width, height) / 2
        const ccwRotationDeg = (hole.ccw_rotation as number) || 0
        // Canvas rotation is clockwise-positive, negate for ccw
        const rotation = -ccwRotationDeg

        // Apply rotation if specified
        if (rotation) {
          ctx.save()
          ctx.translate(adjustedCanvasX, adjustedCanvasY)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.beginPath()
          ctx.roundRect(-width / 2, -height / 2, width, height, radius)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.roundRect(
            adjustedCanvasX - width / 2,
            adjustedCanvasY - height / 2,
            width,
            height,
            radius,
          )
          ctx.fill()
        }
      } else if (holeShape === "oval") {
        const width =
          ((hole.outer_width ??
            hole.outer_diameter ??
            hole.hole_width) as number) * traceTextureResolution
        const height =
          ((hole.outer_height ??
            hole.outer_diameter ??
            hole.hole_height) as number) * traceTextureResolution
        const radiusX = width / 2
        const radiusY = height / 2
        const ccwRotationDeg = (hole.ccw_rotation as number) || 0
        // Canvas rotation is clockwise-positive, negate for ccw
        const rotation = -ccwRotationDeg

        // Apply rotation if specified
        if (rotation) {
          ctx.save()
          ctx.translate(adjustedCanvasX, adjustedCanvasY)
          ctx.rotate((rotation * Math.PI) / 180)
          ctx.beginPath()
          ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.ellipse(
            adjustedCanvasX,
            adjustedCanvasY,
            radiusX,
            radiusY,
            0,
            0,
            2 * Math.PI,
          )
          ctx.fill()
        }
      } else if (holeShape === "circle") {
        const outerDiameter =
          (hole.outer_diameter ?? hole.hole_diameter ?? 0) *
          traceTextureResolution
        const canvasRadius = outerDiameter / 2
        ctx.beginPath()
        ctx.arc(adjustedCanvasX, adjustedCanvasY, canvasRadius, 0, 2 * Math.PI)
        ctx.fill()
      }
    } else if (hole.shape === "circular_hole_with_rect_pad") {
      // Handle circular hole with rectangular pad
      const padWidth =
        (hole.rect_pad_width ?? hole.hole_diameter ?? 0) *
        traceTextureResolution
      const padHeight =
        (hole.rect_pad_height ?? hole.hole_diameter ?? 0) *
        traceTextureResolution
      const rawRadius = extractRectBorderRadius(hole)
      const borderRadius =
        clampRectBorderRadius(
          hole.rect_pad_width ?? hole.hole_diameter ?? 0,
          hole.rect_pad_height ?? hole.hole_diameter ?? 0,
          rawRadius,
        ) * traceTextureResolution

      if (borderRadius > 0) {
        ctx.beginPath()
        ctx.roundRect(
          canvasX - padWidth / 2,
          canvasY - padHeight / 2,
          padWidth,
          padHeight,
          borderRadius,
        )
        ctx.fill()
      } else {
        ctx.fillRect(
          canvasX - padWidth / 2,
          canvasY - padHeight / 2,
          padWidth,
          padHeight,
        )
      }
    } else if (hole.shape === "pill_hole_with_rect_pad") {
      // Handle pill-shaped hole with rectangular pad
      const padWidth =
        (hole.rect_pad_width ?? hole.hole_width ?? 0) * traceTextureResolution
      const padHeight =
        (hole.rect_pad_height ?? hole.hole_height ?? 0) * traceTextureResolution
      const rawRadius = extractRectBorderRadius(hole)
      const borderRadius =
        clampRectBorderRadius(
          hole.rect_pad_width ?? hole.hole_width ?? 0,
          hole.rect_pad_height ?? hole.hole_height ?? 0,
          rawRadius,
        ) * traceTextureResolution

      const ccwRotationDeg = (hole.ccw_rotation as number) || 0
      // Canvas rotation is clockwise-positive, negate for ccw
      const rotation = -ccwRotationDeg

      if (rotation) {
        ctx.save()
        ctx.translate(canvasX, canvasY)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.beginPath()
        ctx.roundRect(
          -padWidth / 2,
          -padHeight / 2,
          padWidth,
          padHeight,
          borderRadius,
        )
        ctx.fill()
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.roundRect(
          canvasX - padWidth / 2,
          canvasY - padHeight / 2,
          padWidth,
          padHeight,
          borderRadius,
        )
        ctx.fill()
      }
    }
  })

  // Get all non-plated holes (they go through both layers, so cut out on both)
  const pcbHoles = su(circuitJson).pcb_hole.list()
  pcbHoles.forEach((hole: any) => {
    const x = hole.x as number
    const y = hole.y as number
    const canvasX = canvasXFromPcb(x)
    const canvasY = canvasYFromPcb(y)

    const holeShape = hole.hole_shape || hole.shape

    if (holeShape === "circle" && typeof hole.hole_diameter === "number") {
      const canvasRadius = (hole.hole_diameter / 2) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI)
      ctx.fill()
    } else if (
      (holeShape === "pill" || holeShape === "rotated_pill") &&
      typeof hole.hole_width === "number" &&
      typeof hole.hole_height === "number"
    ) {
      const width = hole.hole_width * traceTextureResolution
      const height = hole.hole_height * traceTextureResolution
      const radius = Math.min(width, height) / 2
      const ccwRotationDeg = hole.ccw_rotation || 0
      // Canvas rotation is clockwise-positive, negate for ccw
      const rotation = -ccwRotationDeg * (Math.PI / 180)

      // Apply rotation if specified
      if (rotation) {
        ctx.save()
        ctx.translate(canvasX, canvasY)
        ctx.rotate(rotation)
        ctx.beginPath()
        ctx.roundRect(-width / 2, -height / 2, width, height, radius)
        ctx.fill()
        ctx.restore()
      } else {
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

  // Get all PCB cutouts and cut them out from soldermask (cutouts go through both layers)
  const pcbCutouts = su(circuitJson).pcb_cutout.list()
  pcbCutouts.forEach((cutout: any) => {
    switch (cutout.shape) {
      case "rect": {
        const canvasX = canvasXFromPcb(cutout.center.x)
        const canvasY = canvasYFromPcb(cutout.center.y)
        const width = cutout.width * traceTextureResolution
        const height = cutout.height * traceTextureResolution
        const rectCornerRadius = extractRectBorderRadius(cutout)
        const borderRadius = clampRectBorderRadius(
          cutout.width,
          cutout.height,
          rectCornerRadius,
        )

        if (cutout.rotation) {
          ctx.save()
          ctx.translate(canvasX, canvasY)
          // Canvas rotation is clockwise-positive, cutout.rotation appears to be clockwise
          // Negate to match 3D geometry
          const rotation = -cutout.rotation * (Math.PI / 180)
          ctx.rotate(rotation)

          if (borderRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(
              -width / 2,
              -height / 2,
              width,
              height,
              borderRadius * traceTextureResolution,
            )
            ctx.fill()
          } else {
            ctx.fillRect(-width / 2, -height / 2, width, height)
          }
          ctx.restore()
        } else {
          if (borderRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(
              canvasX - width / 2,
              canvasY - height / 2,
              width,
              height,
              borderRadius * traceTextureResolution,
            )
            ctx.fill()
          } else {
            ctx.fillRect(
              canvasX - width / 2,
              canvasY - height / 2,
              width,
              height,
            )
          }
        }
        break
      }
      case "circle": {
        const canvasX = canvasXFromPcb(cutout.center.x)
        const canvasY = canvasYFromPcb(cutout.center.y)
        const canvasRadius = cutout.radius * traceTextureResolution
        ctx.beginPath()
        ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI)
        ctx.fill()
        break
      }
      case "polygon": {
        if (!cutout.points || cutout.points.length < 3) {
          console.warn(
            `PCB Cutout [${cutout.pcb_cutout_id}] polygon has fewer than 3 points, skipping in soldermask texture.`,
          )
          break
        }
        ctx.beginPath()
        cutout.points.forEach(
          (point: { x: number; y: number }, index: number) => {
            const px = canvasXFromPcb(point.x)
            const py = canvasYFromPcb(point.y)
            if (index === 0) {
              ctx.moveTo(px, py)
            } else {
              ctx.lineTo(px, py)
            }
          },
        )
        ctx.closePath()
        ctx.fill()
        break
      }
      default:
        console.warn(
          `Unsupported cutout shape: ${(cutout as any).shape} for cutout ${cutout.pcb_cutout_id} in soldermask texture.`,
        )
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
