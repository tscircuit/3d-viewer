// Utility for creating trace textures for PCB layers
import * as THREE from "three"
import type {
  AnyCircuitElement,
  PcbTrace,
  PcbBoard,
  PcbVia,
  PcbPlatedHole,
} from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"

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

export function createTraceTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceColor,
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceColor: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const pcbTraces = su(circuitJson).pcb_trace.list()
  const allPcbVias = su(circuitJson).pcb_via.list() as PcbVia[]
  const allPcbPlatedHoles = su(
    circuitJson,
  ).pcb_plated_hole.list() as PcbPlatedHole[]

  const tracesOnLayer = pcbTraces.filter((t) =>
    t.route.some((p) => isWireRoutePoint(p) && p.layer === layer),
  )
  if (tracesOnLayer.length === 0) return null

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

  tracesOnLayer.forEach((trace: PcbTrace) => {
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
      const canvasX =
        (pcbX - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const canvasY =
        (-(pcbY - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
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
  })

  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "black"
  allPcbVias.forEach((via) => {
    const canvasX =
      (via.x - boardData.center.x + boardData.width / 2) *
      traceTextureResolution
    const canvasY =
      (-(via.y - boardData.center.y) + boardData.height / 2) *
      traceTextureResolution
    const canvasRadius = (via.outer_diameter / 2) * traceTextureResolution
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
    ctx.fill()
  })
  allPcbPlatedHoles.forEach((ph) => {
    if (ph.layers.includes(layer) && ph.shape === "circle") {
      const canvasX =
        (ph.x - boardData.center.x + boardData.width / 2) *
        traceTextureResolution
      const canvasY =
        (-(ph.y - boardData.center.y) + boardData.height / 2) *
        traceTextureResolution
      const canvasRadius = (ph.outer_diameter / 2) * traceTextureResolution
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, canvasRadius, 0, 2 * Math.PI, false)
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
