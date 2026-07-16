import * as THREE from "three"
import {
  type BoardSurfaceTextureId,
  DEFAULT_BOARD_SURFACE_TEXTURE_ID,
  getBoardSurfaceTextureOption,
  getPadCopperTextureProfile,
} from "../board-surface-textures"

const PLAIN_SOLDERMASK_HEIGHT = 0.22
const MASKED_COPPER_HEIGHT = 0.58
const EXPOSED_COPPER_HEIGHT = 0.86

type BoardSurfaceProfile = {
  height: number
  microSurfaceWeight: number
  roughness: number
  isExposedCopper: boolean
}

const invertSurfaceHeight = (height: number) => 1 - height
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const hashNoise = (x: number, y: number, salt: number) => {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295
}

const smoothstep = (value: number) => value * value * (3 - 2 * value)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const valueNoise = (x: number, y: number, scale: number, salt: number) => {
  const sx = x / scale
  const sy = y / scale
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const tx = smoothstep(sx - x0)
  const ty = smoothstep(sy - y0)

  const top = lerp(hashNoise(x0, y0, salt), hashNoise(x0 + 1, y0, salt), tx)
  const bottom = lerp(
    hashNoise(x0, y0 + 1, salt),
    hashNoise(x0 + 1, y0 + 1, salt),
    tx,
  )

  return lerp(top, bottom, ty)
}

const createBoardSurfaceTextureDetail = (
  _x: number,
  _y: number,
  _layerSalt: number,
  surfaceTexture: BoardSurfaceTextureId,
) => {
  switch (surfaceTexture) {
    case "Leather039": {
      const material = getBoardSurfaceTextureOption(surfaceTexture).material
      const microGrain =
        (valueNoise(_x, _y, 3.25, _layerSalt + 17) - 0.5) * 0.16

      return microGrain * material.detailStrength
    }
  }
}

const createPadCopperTextureDetail = (
  x: number,
  y: number,
  layerSalt: number,
) => {
  const material = getPadCopperTextureProfile().material
  const cloudy =
    (valueNoise(x, y, 20, layerSalt + 307) - 0.5) * 0.45 +
    (valueNoise(x, y, 58, layerSalt + 311) - 0.5) * 0.35
  const fineNoise = (hashNoise(x, y, layerSalt + 313) - 0.5) * 0.34
  const satinBrush =
    Math.sin(x * 0.15 + valueNoise(x, y, 64, layerSalt + 359) * 3.5) * 0.13 +
    Math.sin(y * 0.055 + valueNoise(x, y, 86, layerSalt + 367) * 3) * 0.08

  return (
    (satinBrush + cloudy * 0.22 + fineNoise * 0.08) * material.detailStrength
  )
}

const getBoardSurfaceProfile = (
  r: number,
  g: number,
  b: number,
): BoardSurfaceProfile => {
  const isExposedCopper =
    r > 120 && g > 70 && b < 120 && r > g * 1.08 && g > b * 1.25

  if (isExposedCopper) {
    return {
      height: EXPOSED_COPPER_HEIGHT,
      microSurfaceWeight: 0.9,
      roughness: 0.32,
      isExposedCopper: true,
    }
  }

  const isBrightLegend = r > 170 && g > 170 && b > 160
  if (isBrightLegend) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.45,
      roughness: 0.68,
      isExposedCopper: false,
    }
  }

  const isGreenSoldermask =
    g > r * 1.3 && g > b * 1.05 && r < 85 && g < 140 && b < 90

  if (!isGreenSoldermask) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.8,
      roughness: 0.58,
      isExposedCopper: false,
    }
  }

  const isCopperUnderSoldermask = r > b * 0.62 || g > 34
  return isCopperUnderSoldermask
    ? {
        height: MASKED_COPPER_HEIGHT,
        microSurfaceWeight: 0.65,
        roughness: 0.54,
        isExposedCopper: false,
      }
    : {
        height: PLAIN_SOLDERMASK_HEIGHT,
        microSurfaceWeight: 1,
        roughness: 0.62,
        isExposedCopper: false,
      }
}

const createHeightTexture = (
  canvas: HTMLCanvasElement,
): THREE.CanvasTexture => {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.NoColorSpace
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

export const createBoardReliefTextures = (
  texture: THREE.CanvasTexture,
  options: {
    surfaceTexture?: BoardSurfaceTextureId
  } = {},
): {
  bumpMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
} | null => {
  const surfaceTexture =
    options.surfaceTexture ?? DEFAULT_BOARD_SURFACE_TEXTURE_ID
  const surfaceMaterial = getBoardSurfaceTextureOption(surfaceTexture).material
  const padCopperMaterial = getPadCopperTextureProfile().material
  const sourceCanvas = texture.image as HTMLCanvasElement | undefined
  if (!sourceCanvas?.width || !sourceCanvas.height) return null

  const sourceCtx = sourceCanvas.getContext("2d")
  if (!sourceCtx) return null

  const imageData = sourceCtx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const data = imageData.data
  const heights = new Float32Array(sourceCanvas.width * sourceCanvas.height)
  const roughnessCanvas = document.createElement("canvas")
  roughnessCanvas.width = sourceCanvas.width
  roughnessCanvas.height = sourceCanvas.height
  const roughnessCtx = roughnessCanvas.getContext("2d")
  if (!roughnessCtx) return null
  const roughnessImageData = roughnessCtx.createImageData(
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const roughnessData = roughnessImageData.data

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % sourceCanvas.width
    const y = Math.floor(pixelIndex / sourceCanvas.width)
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) {
      const height = invertSurfaceHeight(PLAIN_SOLDERMASK_HEIGHT)
      const heightChannel = height * 255
      data[i] = heightChannel
      data[i + 1] = heightChannel
      data[i + 2] = heightChannel
      data[i + 3] = 0
      heights[pixelIndex] = height
      roughnessData[i] = 0
      roughnessData[i + 1] = 0
      roughnessData[i + 2] = 0
      roughnessData[i + 3] = 0
      continue
    }

    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const profile = getBoardSurfaceProfile(r, g, b)
    const detailTexture = profile.isExposedCopper
      ? createPadCopperTextureDetail(x, y, sourceCanvas.width + 277)
      : createBoardSurfaceTextureDetail(
          x,
          y,
          sourceCanvas.width + 137,
          surfaceTexture,
        )
    const microSurface = detailTexture * profile.microSurfaceWeight
    const height = clamp01(invertSurfaceHeight(profile.height) + microSurface)
    heights[pixelIndex] = height

    const heightChannel = height * 255
    data[i] = heightChannel
    data[i + 1] = heightChannel
    data[i + 2] = heightChannel
    data[i + 3] = 255

    const roughnessBase = profile.isExposedCopper
      ? padCopperMaterial.roughness
      : profile.roughness + surfaceMaterial.roughnessBias
    const roughnessVariance = profile.isExposedCopper
      ? padCopperMaterial.roughnessVariance
      : surfaceMaterial.roughnessVariance
    const roughness = clamp01(
      roughnessBase +
        microSurface * 1.2 +
        (valueNoise(x, y, 32, sourceCanvas.height + 211) - 0.5) *
          roughnessVariance,
    )
    const roughnessChannel = roughness * 255
    roughnessData[i] = roughnessChannel
    roughnessData[i + 1] = roughnessChannel
    roughnessData[i + 2] = roughnessChannel
    roughnessData[i + 3] = 255
  }
  roughnessCtx.putImageData(roughnessImageData, 0, 0)

  const bumpCanvas = document.createElement("canvas")
  bumpCanvas.width = sourceCanvas.width
  bumpCanvas.height = sourceCanvas.height

  const bumpCtx = bumpCanvas.getContext("2d")
  if (!bumpCtx) return null
  bumpCtx.putImageData(imageData, 0, 0)

  const normalCanvas = document.createElement("canvas")
  normalCanvas.width = sourceCanvas.width
  normalCanvas.height = sourceCanvas.height
  const normalCtx = normalCanvas.getContext("2d")
  if (!normalCtx) return null

  const normalImageData = normalCtx.createImageData(
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const normalData = normalImageData.data
  const strength = 8

  const getHeight = (x: number, y: number) => {
    const clampedX = Math.max(0, Math.min(sourceCanvas.width - 1, x))
    const clampedY = Math.max(0, Math.min(sourceCanvas.height - 1, y))
    return heights[clampedY * sourceCanvas.width + clampedX] ?? 0
  }

  for (let y = 0; y < sourceCanvas.height; y++) {
    for (let x = 0; x < sourceCanvas.width; x++) {
      const dx = (getHeight(x + 1, y) - getHeight(x - 1, y)) * strength
      const dy = (getHeight(x, y + 1) - getHeight(x, y - 1)) * strength
      const normal = new THREE.Vector3(-dx, -dy, 1).normalize()
      const i = (y * sourceCanvas.width + x) * 4

      normalData[i] = (normal.x * 0.5 + 0.5) * 255
      normalData[i + 1] = (normal.y * 0.5 + 0.5) * 255
      normalData[i + 2] = (normal.z * 0.5 + 0.5) * 255
      normalData[i + 3] = 255
    }
  }
  normalCtx.putImageData(normalImageData, 0, 0)

  return {
    bumpMap: createHeightTexture(bumpCanvas),
    normalMap: createHeightTexture(normalCanvas),
    roughnessMap: createHeightTexture(roughnessCanvas),
  }
}
