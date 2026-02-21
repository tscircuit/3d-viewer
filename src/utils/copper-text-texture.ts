import type {
  AnyCircuitElement,
  PcbCopperText as CircuitJsonPcbCopperText,
} from "circuit-json"
import { drawPcbCopperText } from "circuit-to-canvas"
import * as THREE from "three"
import { calculateOutlineBounds } from "./outline-bounds"

export function createCopperTextTextureForLayer({
  layer,
  circuitJson,
  boardData,
  copperColor = "rgb(230, 153, 51)",
  traceTextureResolution,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: any
  copperColor?: string
  traceTextureResolution: number
}): THREE.CanvasTexture | null {
  const copperTexts = circuitJson.filter(
    (e) => e.type === "pcb_copper_text",
  ) as CircuitJsonPcbCopperText[]

  const textsOnLayer = copperTexts.filter((t) => t.layer === layer)

  if (textsOnLayer.length === 0) {
    return null
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

  const resolution = traceTextureResolution
  const realToCanvasMat = {
    a: resolution,
    b: 0,
    c: 0,
    d: -resolution,
    e: -boardOutlineBounds.minX * resolution,
    f: boardOutlineBounds.maxY * resolution,
  }

  const colorMap = {
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
    copperPour: { top: copperColor, bottom: copperColor },
    drill: copperColor,
    silkscreen: { top: copperColor, bottom: copperColor },
    soldermask: { top: copperColor, bottom: copperColor },
    soldermaskOverCopper: { top: copperColor, bottom: copperColor },
    soldermaskWithCopperUnderneath: { top: copperColor, bottom: copperColor },
    boardOutline: copperColor,
    substrate: copperColor,
    keepout: copperColor,
    fabricationNote: copperColor,
    courtyard: { top: copperColor, bottom: copperColor },
  }

  textsOnLayer.forEach((text) => {
    drawPcbCopperText({
      ctx,
      text,
      realToCanvasMat,
      colorMap,
    })
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
