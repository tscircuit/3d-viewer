import { CircuitToCanvasDrawer } from "circuit-to-canvas"
import type {
  AnyCircuitElement,
  PcbBoard,
  PcbPlatedHole,
  PcbRenderLayer,
  PcbVia,
} from "circuit-json"
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

type RasterizedThroughHole = PcbVia | PcbPlatedHole

export const getRasterizedThroughHolesForLayer = (
  circuitJson: AnyCircuitElement[],
  layer: "top" | "bottom",
) =>
  circuitJson.filter(
    (element): element is RasterizedThroughHole =>
      (element.type === "pcb_via" || element.type === "pcb_plated_hole") &&
      (!Array.isArray(element.layers) || element.layers.includes(layer)),
  )

export const makeMaskPixelsOpaque = (pixels: Uint8ClampedArray) => {
  for (let alphaIndex = 3; alphaIndex < pixels.length; alphaIndex += 4) {
    if (pixels[alphaIndex] !== 0) pixels[alphaIndex] = 255
  }
}

const eraseRasterizedThroughHoles = ({
  ctx,
  layer,
  throughHoles,
  boardData,
  canvasWidth,
  canvasHeight,
}: {
  ctx: CanvasRenderingContext2D
  layer: "top" | "bottom"
  throughHoles: RasterizedThroughHole[]
  boardData: PcbBoard
  canvasWidth: number
  canvasHeight: number
}) => {
  if (throughHoles.length === 0) return

  // Draw through-hole pads into a temporary mask with the same transform used
  // by the layer textures, then remove them from the combined bitmap. Sharp
  // copper is supplied by the analytic via mesh or plated-hole geometry.
  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = canvasWidth
  maskCanvas.height = canvasHeight
  const maskCtx = maskCanvas.getContext("2d")
  if (!maskCtx) return

  if (layer === "bottom") {
    maskCtx.translate(0, canvasHeight)
    maskCtx.scale(1, -1)
  }

  const opaque = "rgb(255,255,255)"
  const drawer = new CircuitToCanvasDrawer(maskCtx)
  drawer.configure({
    colorOverrides: {
      copper: {
        top: opaque,
        bottom: opaque,
        inner1: opaque,
        inner2: opaque,
        inner3: opaque,
        inner4: opaque,
        inner5: opaque,
        inner6: opaque,
      },
      drill: opaque,
    },
  })
  const bounds = calculateOutlineBounds(boardData)
  drawer.setCameraBounds({
    minX: bounds.minX,
    maxX: bounds.maxX,
    minY: bounds.minY,
    maxY: bounds.maxY,
  })
  const renderLayer: PcbRenderLayer =
    layer === "top" ? "top_copper" : "bottom_copper"
  drawer.drawElements(throughHoles, { layers: [renderLayer] })

  // destination-out multiplies partially transparent edge pixels instead of
  // removing them. Make every covered mask pixel opaque so the raster pad
  // cannot leave a blurred fringe behind the sharp preview geometry.
  const maskImage = maskCtx.getImageData(0, 0, canvasWidth, canvasHeight)
  makeMaskPixelsOpaque(maskImage.data)
  maskCtx.putImageData(maskImage, 0, 0)

  ctx.save()
  ctx.globalCompositeOperation = "destination-out"
  ctx.drawImage(maskCanvas, 0, 0, canvasWidth, canvasHeight)
  ctx.restore()
}

const createCombinedTexture = ({
  textures,
  boardData,
  traceTextureResolution,
  layer,
  throughHoles,
}: {
  textures: Array<THREE.CanvasTexture | null | undefined>
  boardData: PcbBoard
  traceTextureResolution: number
  layer: "top" | "bottom"
  throughHoles: RasterizedThroughHole[]
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

  eraseRasterizedThroughHoles({
    ctx,
    layer,
    throughHoles,
    boardData,
    canvasWidth,
    canvasHeight,
  })

  const combinedTexture = new THREE.CanvasTexture(canvas)
  // Use mipmaps so anisotropic filtering can preserve small copper details,
  // such as via annuli, when the board is viewed at an oblique angle. Mipmaps
  // are generated by WebGL at runtime and are not embedded in model exports.
  combinedTexture.generateMipmaps = true
  combinedTexture.minFilter = THREE.LinearMipmapLinearFilter
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
    const throughHoles = getRasterizedThroughHolesForLayer(circuitJson, layer)

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
      throughHoles,
    })
  }

  const numLayers = boardData.num_layers ?? 2

  return {
    topBoard: buildForLayer("top"),
    bottomBoard: numLayers < 2 ? null : buildForLayer("bottom"),
  }
}
