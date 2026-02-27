// Utility for creating trace textures for PCB layers
import * as THREE from "three"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type {
  AnyCircuitElement,
  PcbTrace,
  PcbBoard,
  PcbRenderLayer,
} from "circuit-json"
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
  const pcbTraces = circuitJson.filter(
    (e): e is PcbTrace => e.type === "pcb_trace",
  )
  const tracesOnLayer = pcbTraces.filter((t) =>
    t.route.some((p) => isWireRoutePoint(p) && p.layer === layer),
  )
  if (tracesOnLayer.length === 0) return null

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

  const pcbRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  const drawer = new CircuitToCanvasDrawer(ctx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: traceColor,
        bottom: traceColor,
        inner1: traceColor,
        inner2: traceColor,
        inner3: traceColor,
        inner4: traceColor,
        inner5: traceColor,
        inner6: traceColor,
      },
    },
  })
  drawer.setCameraBounds({
    minX: boardOutlineBounds.minX,
    maxX: boardOutlineBounds.maxX,
    minY: boardOutlineBounds.minY,
    maxY: boardOutlineBounds.maxY,
  })
  drawer.drawElements(tracesOnLayer, { layers: [pcbRenderLayer] })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
