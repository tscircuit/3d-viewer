// Utility for creating SMT pad textures for PCB layers

import { su } from "@tscircuit/circuit-json-util"
import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbHole,
  PcbPlatedHole,
  PcbRenderLayer,
  PcbVia,
} from "circuit-json"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"

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
  const holes = su(circuitJson).pcb_hole.list()
  const platedHolesOnLayer = su(circuitJson)
    .pcb_plated_hole.list()
    .filter((e) => !Array.isArray(e.layers) || e.layers.includes(layer))
  const viasOnLayer = su(circuitJson)
    .pcb_via.list()
    .filter((e) => !Array.isArray(e.layers) || e.layers.includes(layer))
  const drillElements = [...holes, ...platedHolesOnLayer, ...viasOnLayer]

  const pcbRenderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
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
        top: copperColor,
        bottom: copperColor,
        inner1: copperColor,
        inner2: copperColor,
        inner3: copperColor,
        inner4: copperColor,
        inner5: copperColor,
        inner6: copperColor,
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
  drawer.drawElements([...smtPadsOnLayer, ...drillElements], {
    layers: [pcbRenderLayer],
    drawSoldermask: false,
    drawSoldermaskTop: false,
    drawSoldermaskBottom: false,
    showPcbNotes: false,
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
