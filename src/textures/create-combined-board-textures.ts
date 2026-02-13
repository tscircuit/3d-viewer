import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import * as THREE from "three"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { colors as defaultColors, soldermaskColors } from "../geoms/constants"
import { createCopperTextTextureForLayer } from "../utils/copper-text-texture"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createPadTextureForLayer } from "../utils/pad-texture"
import { createPanelOutlineTextureForLayer } from "../utils/panel-outline-texture"
import { createSilkscreenTextureForLayer } from "../utils/silkscreen-texture"
import { createSoldermaskTextureForLayer } from "../utils/soldermask-texture"
import { createTraceTextureForLayer } from "../utils/trace-texture"
import { createCopperPourTextureForLayer } from "./create-copper-pour-texture-for-layer"

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
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  textures.forEach((texture) => {
    if (!texture?.image) return
    const image = texture.image as HTMLCanvasElement
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)
  })

  const combinedTexture = new THREE.CanvasTexture(canvas)
  combinedTexture.generateMipmaps = true
  combinedTexture.minFilter = THREE.LinearMipmapLinearFilter
  combinedTexture.magFilter = THREE.LinearFilter
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
  const soldermaskColor = toRgb(
    soldermaskColors[boardData.material] ?? defaultColors.fr4SolderMaskGreen,
  )
  const traceColorWithMask = toRgb(defaultColors.fr4TracesWithMaskGreen)
  const traceColorWithoutMask = toRgb(defaultColors.fr4TracesWithoutMaskTan)
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

    const soldermaskTexture = showMask
      ? createSoldermaskTextureForLayer({
          layer,
          circuitJson,
          boardData,
          soldermaskColor,
          traceTextureResolution,
        })
      : null

    const traceTexture = showCopper
      ? createTraceTextureForLayer({
          layer,
          circuitJson,
          boardData,
          traceColor: showMask ? traceColorWithMask : traceColorWithoutMask,
          traceTextureResolution,
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

    const copperPourTexture = showCopper
      ? createCopperPourTextureForLayer({
          layer,
          circuitJson,
          boardData,
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

    const silkscreenTexture = showSilkscreen
      ? createSilkscreenTextureForLayer({
          layer,
          circuitJson,
          boardData,
          silkscreenColor,
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

    return createCombinedTexture({
      textures: [
        soldermaskTexture,
        copperPourTexture,
        traceTexture,
        copperTextTexture,
        padTexture,
        silkscreenTexture,
        panelOutlineTexture,
      ],
      boardData,
      traceTextureResolution,
    })
  }

  return {
    topBoard: buildForLayer("top"),
    bottomBoard: buildForLayer("bottom"),
  }
}
