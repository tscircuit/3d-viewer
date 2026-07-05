import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { colors as defaultColors } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createPadTextureForLayer } from "../utils/pad-texture"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createCopperTextTextureForLayer } from "./create-copper-text-texture-for-layer"
import { createCopperPourTextureForLayer } from "./create-copper-pour-texture-for-layer"
import { createFabricationNoteTextureForLayer } from "./create-fabrication-note-texture-for-layer"
import { createKeepoutTextureForLayer } from "./create-keepout-texture-for-layer"
import { createPcbNoteTextureForLayer } from "./create-pcb-note-texture-for-layer"
import { createSilkscreenTextureForLayer } from "./create-silkscreen-texture-for-layer"
import { createSoldermaskTextureForLayer } from "./create-soldermask-texture-for-layer"
import { createThroughHoleTextureForLayer } from "./create-through-hole-texture-for-layer"

export interface CombinedBoardTextures {
  topBoard?: THREE.CanvasTexture | null
  bottomBoard?: THREE.CanvasTexture | null
}

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

const clampChannel = (value: number) => Math.max(0, Math.min(255, value))

const applySoldermaskSurfaceFilter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: { includeReflection?: boolean; brightnessBoost?: number } = {},
) => {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const maxX = Math.max(width - 1, 1)
  const maxY = Math.max(height - 1, 1)

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) continue

    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const isDarkGreen =
      g > r * 1.35 && g > b * 1.15 && luminance < 90 && r < 80 && b < 80

    if (!isDarkGreen) continue

    const pixelIndex = i / 4
    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)
    const u = x / maxX
    const v = y / maxY
    const diagonalLight = u * 0.62 + (1 - v) * 0.38
    const broadVariation = Math.sin((u * 1.15 + v * 0.35) * Math.PI) * 0.04
    const lightFactor =
      0.82 +
      diagonalLight * 0.17 +
      broadVariation +
      (options.brightnessBoost ?? 0)

    const whiteReflection = options.includeReflection
      ? (() => {
          const reflectionX = 0.36
          const reflectionY = 0.22
          const dx = u - reflectionX
          const dy = v - reflectionY
          const radialFalloff = Math.max(0, 1 - Math.hypot(dx, dy) / 0.38)
          return radialFalloff * radialFalloff * 0.07
        })()
      : 0

    const filteredR = (r * 0.9 + 3) * lightFactor
    const filteredG = (g * 1.08 + 15) * lightFactor
    const filteredB = (b * 1.28 + 13) * lightFactor

    data[i] = clampChannel(
      filteredR * (1 - whiteReflection) + 255 * whiteReflection,
    )
    data[i + 1] = clampChannel(
      filteredG * (1 - whiteReflection) + 255 * whiteReflection,
    )
    data[i + 2] = clampChannel(
      filteredB * (1 - whiteReflection) + 255 * whiteReflection,
    )
  }

  ctx.putImageData(imageData, 0, 0)
}

const createCombinedTexture = ({
  textures,
  boardData,
  traceTextureResolution,
  layer,
}: {
  textures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
  layer: "top" | "bottom"
}): THREE.CanvasTexture | null => {
  const hasImage = textures.some((texture) => texture?.image)
  if (!hasImage) return null

  const boardOutlineBounds = calculateOutlineBounds(boardData)
  const canvasWidth = Math.floor(
    boardOutlineBounds.width * traceTextureResolution,
  )
  const canvasHeight = Math.floor(
    boardOutlineBounds.height * traceTextureResolution,
  )
  if (canvasWidth <= 0 || canvasHeight <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = canvasWidth
  canvas.height = canvasHeight + 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  textures.forEach((texture) => {
    if (!texture?.image) return
    const image = texture.image as HTMLCanvasElement
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  })

  applySoldermaskSurfaceFilter(ctx, canvasWidth, canvasHeight, {
    includeReflection: layer === "top",
    brightnessBoost: layer === "bottom" ? 0.08 : 0,
  })

  const combinedTexture = new THREE.CanvasTexture(canvas)
  combinedTexture.generateMipmaps = false
  combinedTexture.minFilter = THREE.LinearFilter
  combinedTexture.magFilter = THREE.LinearFilter
  combinedTexture.premultiplyAlpha = true
  combinedTexture.anisotropy = 16
  combinedTexture.needsUpdate = true
  return combinedTexture
}

export function createCombinedBoardTextures({
  circuitJson,
  boardData,
  traceTextureResolution,
  visibility,
}: {
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution: number
  visibility?: Partial<LayerVisibilityState>
}): CombinedBoardTextures {
  const traceColor = toRgb(defaultColors.copper)
  const silkscreenColor = "rgb(255,255,255)"
  const copperColor = toRgb(defaultColors.copper)

  const showBoardBody = visibility?.boardBody ?? true

  const buildForLayer = (layer: "top" | "bottom") => {
    const showMask =
      (layer === "top" ? visibility?.topMask : visibility?.bottomMask) ?? true
    const showCopper =
      (layer === "top" ? visibility?.topCopper : visibility?.bottomCopper) ??
      true
    const showSilkscreen =
      (layer === "top"
        ? visibility?.topSilkscreen
        : visibility?.bottomSilkscreen) ?? true
    const showKeepout = visibility?.keepout ?? true

    const soldermaskTexture = showMask
      ? createSoldermaskTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const traceTexture = showCopper
      ? createTraceTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceColor,
          traceTextureResolution,
        })
      : null

    const copperPourTexture = showCopper
      ? createCopperPourTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
          copperColor,
        })
      : null

    const copperTextTexture = showCopper
      ? createCopperTextTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null

    const padTexture = showCopper
      ? createPadTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null
    const throughHoleTexture = showCopper
      ? createThroughHoleTextureForLayer({
          layer,
          circuitJson,
          boardData,
          copperColor,
          traceTextureResolution,
        })
      : null

    const silkscreenTexture = showSilkscreen
      ? createSilkscreenTextureForLayer({
          layer,
          circuitJson,
          boardData,
          silkscreenColor,
          traceTextureResolution,
        })
      : null

    const fabricationNoteTexture = showSilkscreen
      ? createFabricationNoteTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const showPcbNotes = visibility?.pcbNotes ?? false
    const pcbNoteTexture = showPcbNotes
      ? createPcbNoteTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    const panelOutlineTexture = showBoardBody
      ? createPanelOutlineTextureForLayer({
          layer,
          circuitJson,
          panelData: boardData,
          traceTextureResolution,
        })
      : null

    const keepoutTexture = showKeepout
      ? createKeepoutTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceTextureResolution,
        })
      : null

    return createCombinedTexture({
      textures: [
        copperPourTexture,
        traceTexture,
        padTexture,
        throughHoleTexture,
        soldermaskTexture,
        copperTextTexture,
        silkscreenTexture,
        fabricationNoteTexture,
        pcbNoteTexture,
        panelOutlineTexture,
        keepoutTexture,
      ],
      boardData,
      traceTextureResolution,
      layer,
    })
  }

  const numLayers = boardData.num_layers ?? 2

  return {
    topBoard: buildForLayer("top"),
    bottomBoard: numLayers < 2 ? null : buildForLayer("bottom"),
  }
}
