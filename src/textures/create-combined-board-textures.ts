import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { colors as defaultColors } from "../geoms/constants"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createPadTextureForLayer } from "../utils/pad-texture"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createCopperPourTextureForLayer } from "./create-copper-pour-texture-for-layer"
import { createCopperTextTextureForLayer } from "./create-copper-text-texture-for-layer"
import { createFabricationNoteTextureForLayer } from "./create-fabrication-note-texture-for-layer"
import { createKeepoutTextureForLayer } from "./create-keepout-texture-for-layer"
import { createPcbNoteTextureForLayer } from "./create-pcb-note-texture-for-layer"
import { createSilkscreenTextureForLayer } from "./create-silkscreen-texture-for-layer"
import { createSoldermaskTextureForLayer } from "./create-soldermask-texture-for-layer"
import { createThroughHoleTextureForLayer } from "./create-through-hole-texture-for-layer"

export interface CombinedBoardTextures {
  topBoard?: THREE.CanvasTexture | null
  bottomBoard?: THREE.CanvasTexture | null
  /** Geometry-only alpha masks used for relief, never as color maps. */
  topMaskedCopper?: THREE.CanvasTexture | null
  bottomMaskedCopper?: THREE.CanvasTexture | null
  topSoldermaskCoverage?: THREE.CanvasTexture | null
  bottomSoldermaskCoverage?: THREE.CanvasTexture | null
}

const toRgb = (colorArr: number[]) => {
  const [r = 0, g = 0, b = 0] = colorArr
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255,
  )})`
}

const createCombinedTexture = ({
  textures,
  boardData,
  traceTextureResolution,
}: {
  textures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
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

  for (const texture of textures) {
    if (!texture?.image) continue
    const image = texture.image as HTMLCanvasElement
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  }

  const combinedTexture = new THREE.CanvasTexture(canvas)
  combinedTexture.generateMipmaps = false
  combinedTexture.minFilter = THREE.LinearFilter
  combinedTexture.magFilter = THREE.LinearFilter
  combinedTexture.premultiplyAlpha = true
  combinedTexture.anisotropy = 16
  combinedTexture.needsUpdate = true
  return combinedTexture
}

const createMaskedCopperMask = ({
  textures,
  soldermaskTexture,
  boardData,
  traceTextureResolution,
}: {
  textures: Array<THREE.CanvasTexture | null | undefined>
  soldermaskTexture: THREE.CanvasTexture | null | undefined
  boardData: PcbBoard
  traceTextureResolution: number
}): THREE.CanvasTexture | null => {
  if (!textures.some((texture) => texture?.image)) return null

  const bounds = calculateOutlineBounds(boardData)
  const width = Math.floor(bounds.width * traceTextureResolution)
  const height = Math.floor(bounds.height * traceTextureResolution)
  if (width <= 0 || height <= 0) return null

  const canvas = document.createElement("canvas")
  canvas.width = width
  // Match the board color texture dimensions; this avoids UV resampling.
  canvas.height = height + 1
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  for (const texture of textures) {
    if (!texture?.image) continue
    ctx.drawImage(texture.image as HTMLCanvasElement, 0, 0, width, height)
  }

  // A route can overlap an exposed pad. Restrict the relief mask to pixels
  // that are actually covered by soldermask so pad openings remain metallic.
  if (soldermaskTexture?.image) {
    ctx.globalCompositeOperation = "destination-in"
    ctx.drawImage(
      soldermaskTexture.image as HTMLCanvasElement,
      0,
      0,
      width,
      height,
    )
    ctx.globalCompositeOperation = "source-over"
  }

  const maskTexture = new THREE.CanvasTexture(canvas)
  maskTexture.colorSpace = THREE.NoColorSpace
  maskTexture.generateMipmaps = false
  maskTexture.minFilter = THREE.LinearFilter
  maskTexture.magFilter = THREE.LinearFilter
  maskTexture.premultiplyAlpha = false
  maskTexture.needsUpdate = true
  return maskTexture
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

    const maskedCopperPourTexture =
      showMask && showCopper
        ? createCopperPourTextureForLayer({
            layer,
            circuitJson,
            boardData,
            traceTextureResolution,
            copperColor,
            onlyCoveredBySoldermask: true,
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
          soldermaskVisible: showMask,
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

    const boardTexture = createCombinedTexture({
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
    })
    const maskedCopperTexture =
      showMask && showCopper
        ? createMaskedCopperMask({
            textures: [traceTexture, maskedCopperPourTexture],
            soldermaskTexture,
            boardData,
            traceTextureResolution,
          })
        : null

    return {
      boardTexture,
      maskedCopperTexture,
      soldermaskCoverageTexture: soldermaskTexture,
    }
  }

  const numLayers = boardData.num_layers ?? 2

  const top = buildForLayer("top")
  const bottom = numLayers < 2 ? null : buildForLayer("bottom")

  return {
    topBoard: top.boardTexture,
    bottomBoard: bottom?.boardTexture ?? null,
    topMaskedCopper: top.maskedCopperTexture,
    bottomMaskedCopper: bottom?.maskedCopperTexture ?? null,
    topSoldermaskCoverage: top.soldermaskCoverageTexture,
    bottomSoldermaskCoverage: bottom?.soldermaskCoverageTexture ?? null,
  }
}
