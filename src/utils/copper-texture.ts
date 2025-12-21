// Utility for creating copper textures for PCB layers (traces + pours)
import * as THREE from "three"
import type {
  AnyCircuitElement,
  PcbTrace,
  PcbBoard,
  PcbVia,
  PcbPlatedHole,
  PcbCopperPour,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { calculateOutlineBounds } from "./outline-bounds"

export function isWireRoutePoint(
  point: any,
): point is { x: number; y: number; width: number; layer: string } {
  return (
    point &&
    point.route_type === "wire" &&
    typeof point.layer === "string" &&
    typeof point.width === "number"
  )
}

export function createCopperTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceColor,
  copperPourColors,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceColor: string
  copperPourColors?: {
    masked: [number, number, number]
    exposed: [number, number, number]
  }
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const pcbTraces = su(circuitJson).pcb_trace.list()
  const allPcbVias = su(circuitJson).pcb_via.list() as PcbVia[]
  const allPcbPlatedHoles = su(
    circuitJson,
  ).pcb_plated_hole.list() as PcbPlatedHole[]
  const pcbCopperPours = su(
    circuitJson,
  ).pcb_copper_pour.list() as PcbCopperPour[]

  const tracesOnLayer = pcbTraces.filter((t) =>
    t.route.some((p) => isWireRoutePoint(p) && p.layer === layer),
  )
  const poursOnLayer = pcbCopperPours.filter((p) => p.layer === layer)

  if (tracesOnLayer.length === 0 && poursOnLayer.length === 0) return null

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

  // Draw traces
  for (const trace of tracesOnLayer) {
    let firstPoint = true
    ctx.beginPath()
    ctx.strokeStyle = traceColor
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    let currentLineWidth = 0
    for (const point of trace.route) {
      if (!isWireRoutePoint(point) || point.layer !== layer) {
        if (!firstPoint) ctx.stroke()
        firstPoint = true
        continue
      }
      const pcbX = point.x
      const pcbY = point.y
      currentLineWidth = point.width * traceTextureResolution
      ctx.lineWidth = currentLineWidth
      const canvasX = (pcbX - boardOutlineBounds.minX) * traceTextureResolution
      const canvasY = (boardOutlineBounds.maxY - pcbY) * traceTextureResolution
      if (firstPoint) {
        ctx.moveTo(canvasX, canvasY)
        firstPoint = false
      } else {
        ctx.lineTo(canvasX, canvasY)
      }
    }
    if (!firstPoint) {
      ctx.stroke()
    }
  }

  // Draw copper pours if colors are provided
  if (copperPourColors && poursOnLayer.length > 0) {
    // Helper function to get color as RGB string
    const rgbToString = (rgb: [number, number, number]) =>
      `rgb(${rgb[0] * 255}, ${rgb[1] * 255}, ${rgb[2] * 255})`

    for (const pour of poursOnLayer) {
      const covered = (pour as any).covered_with_solder_mask !== false
      const color = covered ? copperPourColors.masked : copperPourColors.exposed
      ctx.fillStyle = rgbToString(color)

      if (pour.shape === "rect") {
        const centerX =
          (pour.center.x - boardOutlineBounds.minX) * traceTextureResolution
        const centerY =
          (boardOutlineBounds.maxY - pour.center.y) * traceTextureResolution
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
          const px =
            (point.x - boardOutlineBounds.minX) * traceTextureResolution
          const py =
            (boardOutlineBounds.maxY - point.y) * traceTextureResolution
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
        if (brepShape?.outer_ring) {
          // Draw outer ring
          ctx.beginPath()
          brepShape.outer_ring.vertices.forEach(
            (vertex: any, index: number) => {
              const px =
                (vertex.x - boardOutlineBounds.minX) * traceTextureResolution
              const py =
                (boardOutlineBounds.maxY - vertex.y) * traceTextureResolution
              if (index === 0) {
                ctx.moveTo(px, py)
              } else {
                ctx.lineTo(px, py)
              }
            },
          )
          ctx.closePath()

          // Cut out inner rings (holes)
          if (brepShape.inner_rings) {
            for (const innerRing of brepShape.inner_rings) {
              for (const [index, vertex] of innerRing.vertices.entries()) {
                const px =
                  (vertex.x - boardOutlineBounds.minX) * traceTextureResolution
                const py =
                  (boardOutlineBounds.maxY - vertex.y) * traceTextureResolution
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
    }
  }

  // Cut out holes and vias from copper
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "black"
  for (const via of allPcbVias) {
    const canvasX = (via.x - boardOutlineBounds.minX) * traceTextureResolution
    const canvasY = (boardOutlineBounds.maxY - via.y) * traceTextureResolution
    const canvasRadius = (via.outer_diameter / 2) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
    ctx.fill()
  }

  for (const ph of allPcbPlatedHoles) {
    if (ph.layers.includes(layer) && ph.shape === "circle") {
      const canvasX = (ph.x - boardOutlineBounds.minX) * traceTextureResolution
      const canvasY = (boardOutlineBounds.maxY - ph.y) * traceTextureResolution
      const canvasRadius = (ph.outer_diameter / 2) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = "source-over"

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
