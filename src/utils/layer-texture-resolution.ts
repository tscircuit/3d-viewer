import type { PcbBoard } from "circuit-json"
import { calculateOutlineBounds } from "./outline-bounds"

export interface TextureResolutionOptions {
  maxTexturePixels?: number
  maxTextureDimension?: number
  minTextureResolution?: number
}

const DEFAULT_MAX_TEXTURE_PIXELS = 4_000_000
const DEFAULT_MAX_TEXTURE_DIMENSION = 4096
const DEFAULT_MIN_TEXTURE_RESOLUTION = 1

export function getLayerTextureResolution(
  boardData: PcbBoard,
  desiredResolution: number,
  options: TextureResolutionOptions = {},
): number {
  const {
    maxTexturePixels = DEFAULT_MAX_TEXTURE_PIXELS,
    maxTextureDimension = DEFAULT_MAX_TEXTURE_DIMENSION,
    minTextureResolution = DEFAULT_MIN_TEXTURE_RESOLUTION,
  } = options

  const bounds = calculateOutlineBounds(boardData)
  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return desiredResolution
  }

  const maxDim = Math.max(bounds.width, bounds.height)
  const maxDimResolution = maxTextureDimension / maxDim
  const maxAreaResolution = Math.sqrt(
    maxTexturePixels / (bounds.width * bounds.height),
  )

  const safeResolution = Math.min(
    desiredResolution,
    maxDimResolution,
    maxAreaResolution,
  )

  return Math.max(minTextureResolution, safeResolution)
}
