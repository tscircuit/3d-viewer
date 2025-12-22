// Copper texture generation using circuit-to-canvas library
import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import { calculateOutlineBounds } from "../../utils/outline-bounds"

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
  const allPcbVias = su(circuitJson).pcb_via.list()
  const allPcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
  const pcbCopperPours = su(circuitJson).pcb_copper_pour.list()

  const tracesOnLayer = pcbTraces.filter((t) =>
    t.route.some((p) => p.route_type === "wire" && (p as any).layer === layer),
  )
  const poursOnLayer = pcbCopperPours.filter((p) => p.layer === layer)

  if (tracesOnLayer.length === 0 && poursOnLayer.length === 0) {
    // Check if we have any vias or plated holes that might affect this layer
    const hasRelevantElements =
      allPcbVias.length > 0 || allPcbPlatedHoles.length > 0
    if (!hasRelevantElements) return null
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

  // Set up the circuit-to-canvas drawer
  const drawer = new CircuitToCanvasDrawer(ctx)

  // Configure camera bounds to match our canvas
  drawer.setCameraBounds({
    minX: boardOutlineBounds.minX,
    maxX: boardOutlineBounds.maxX,
    minY: boardOutlineBounds.minY,
    maxY: boardOutlineBounds.maxY,
  })

  // Configure colors
  const copperColorMap = {
    top: traceColor,
    bottom: traceColor,
    inner1: traceColor,
    inner2: traceColor,
    inner3: traceColor,
    inner4: traceColor,
    inner5: traceColor,
    inner6: traceColor,
  }

  drawer.configure({
    colorOverrides: {
      copper: copperColorMap,
    },
  })

  // Draw traces and copper pours using circuit-to-canvas (vias handled separately)
  const copperElements: AnyCircuitElement[] = [
    ...tracesOnLayer,
    ...poursOnLayer,
  ]

  drawer.drawElements(copperElements, {
    layers: [`${layer}_copper`],
  })

  // Draw plated hole copper for this layer using circuit-to-canvas
  const platedHolesForLayer = allPcbPlatedHoles.filter((ph) =>
    ph.layers.includes(layer),
  )
  if (platedHolesForLayer.length > 0) {
    drawer.drawElements(platedHolesForLayer, {
      layers: [`${layer}_copper`],
    })
  }

  // Cut out drill holes from copper using circuit-to-canvas
  // Combine vias and plated holes for drill cutting
  const holesToDrill = [
    ...allPcbVias,
    ...allPcbPlatedHoles.filter((ph) => ph.layers.includes(layer)),
  ]

  if (holesToDrill.length > 0) {
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "black"
    drawer.drawElements(holesToDrill, {
      layers: [`${layer}_copper`],
    })
    ctx.globalCompositeOperation = "source-over"
  }

  // Handle copper pour colors manually since circuit-to-canvas doesn't support custom pour colors yet
  // Keep this for now as circuit-to-canvas doesn't have this feature yet
  if (copperPourColors && poursOnLayer.length > 0) {
    // Redraw pours with correct colors using a second pass
    for (const pour of poursOnLayer) {
      const covered = (pour as any).covered_with_solder_mask !== false
      const color = covered ? copperPourColors.masked : copperPourColors.exposed
      const colorString = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`

      ctx.fillStyle = colorString

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
          ctx.rotate((-pour.rotation * Math.PI) / 180)
          ctx.fillRect(-width / 2, -height / 2, width, height)
          ctx.restore()
        } else {
          ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height)
        }
      } else if (pour.shape === "polygon" && pour.points) {
        ctx.beginPath()
        pour.points.forEach((point: any, index: number) => {
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
      }
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
