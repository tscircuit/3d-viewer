// Utility for creating trace textures for PCB layers

import { getElementRenderLayers, su } from "@tscircuit/circuit-json-util"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbPlatedHole,
  PcbRenderLayer,
} from "circuit-json"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"
import { splitTraceIntoLayerSegments } from "./trace-layer-segments"

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
  const pcbVias = su(circuitJson).pcb_via.list()
  const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
  const pcbRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"

  const tracesOnLayer = pcbTraces
    .filter((trace) => getElementRenderLayers(trace).includes(pcbRenderLayer))
    .flatMap((trace) => splitTraceIntoLayerSegments(trace, layer))
  if (tracesOnLayer.length === 0) return null
  const platedHolesOnLayer = pcbPlatedHoles.filter((hole: PcbPlatedHole) =>
    hole.layers.includes(layer),
  )
  const elementsToDraw = [...tracesOnLayer, ...pcbVias, ...platedHolesOnLayer]

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

  const transparent = "rgba(0,0,0,0)"
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
      copperPour: { top: transparent, bottom: transparent },
      drill: transparent,
      boardOutline: transparent,
      substrate: transparent,
      keepout: transparent,
      fabricationNote: transparent,
      courtyard: { top: transparent, bottom: transparent },
      silkscreen: { top: transparent, bottom: transparent },
      soldermask: { top: transparent, bottom: transparent },
      soldermaskWithCopperUnderneath: {
        top: transparent,
        bottom: transparent,
      },
      soldermaskOverCopper: {
        top: transparent,
        bottom: transparent,
      },
    },
  })
  drawer.setCameraBounds({
    minX: boardOutlineBounds.minX,
    maxX: boardOutlineBounds.maxX,
    minY: boardOutlineBounds.minY,
    maxY: boardOutlineBounds.maxY,
  })
  drawer.drawElements(elementsToDraw, {
    layers: [pcbRenderLayer],
    drawSoldermask: false,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: false,
  })
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
