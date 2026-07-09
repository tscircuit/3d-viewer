import * as THREE from "three"
import {
  DEFAULT_BOARD_SURFACE_TEXTURE_ID,
  getBoardSurfaceTextureOption,
  type BoardSurfaceTextureId,
} from "../board-surface-textures"

const PLAIN_SOLDERMASK_HEIGHT = 0.22
const MASKED_COPPER_HEIGHT = 0.58
const EXPOSED_COPPER_HEIGHT = 0.86

type BoardSurfaceProfile = {
  height: number
  microSurfaceWeight: number
  roughness: number
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
  x: number,
  y: number,
  layerSalt: number,
  surfaceTexture: BoardSurfaceTextureId,
) => {
  const material = getBoardSurfaceTextureOption(surfaceTexture).material
  const cloudy =
    (valueNoise(x, y, 18, layerSalt) - 0.5) * 0.55 +
    (valueNoise(x, y, 54, layerSalt + 29) - 0.5) * 0.45
  const fineNoise = (hashNoise(x, y, layerSalt + 71) - 0.5) * 0.28

  switch (surfaceTexture) {
    case "Wallpaper001A": {
      const woodchip =
        Math.sin(x * 0.24 + valueNoise(x, y, 42, layerSalt + 3) * 5.4) * 0.22 +
        Math.sin(y * 0.2 + valueNoise(x, y, 36, layerSalt + 7) * 4.2) * 0.18
      return (
        (cloudy * 0.7 + woodchip + fineNoise * 0.35) * material.detailStrength
      )
    }
    case "Concrete030": {
      const pores = Math.max(0, hashNoise(x, y, layerSalt + 113) - 0.72) * -0.65
      const smoothMottle =
        (valueNoise(x, y, 86, layerSalt + 17) - 0.5) * 0.75 +
        (valueNoise(x, y, 24, layerSalt + 19) - 0.5) * 0.35
      return (smoothMottle + pores + fineNoise * 0.2) * material.detailStrength
    }
    case "Plaster002": {
      const roughTrowel =
        (valueNoise(x, y, 14, layerSalt + 31) - 0.5) * 0.9 +
        (valueNoise(x, y, 46, layerSalt + 37) - 0.5) * 0.6
      return (roughTrowel + fineNoise * 0.45) * material.detailStrength
    }
    case "Fabric019": {
      const weave =
        Math.sin(x * 0.85 + Math.sin(y * 0.08) * 0.45) * 0.24 +
        Math.sin(y * 0.72 + Math.sin(x * 0.07) * 0.5) * 0.24
      return (
        (weave + cloudy * 0.35 + fineNoise * 0.18) * material.detailStrength
      )
    }
    case "Asphalt023S": {
      const stones =
        (hashNoise(x, y, layerSalt + 43) - 0.5) * 0.78 +
        (valueNoise(x, y, 6, layerSalt + 47) - 0.5) * 0.6
      return (stones + cloudy * 0.45) * material.detailStrength
    }
    case "Road014A": {
      const roadGrain =
        (hashNoise(x, y, layerSalt + 53) - 0.5) * 0.62 +
        (valueNoise(x, y, 9, layerSalt + 59) - 0.5) * 0.6
      const directionalWear = Math.sin(y * 0.16 + Math.sin(x * 0.025) * 2) * 0.2
      return (
        (roadGrain + directionalWear + cloudy * 0.3) * material.detailStrength
      )
    }
    case "Concrete036": {
      const oldConcrete =
        (valueNoise(x, y, 72, layerSalt + 61) - 0.5) * 0.95 +
        (valueNoise(x, y, 18, layerSalt + 67) - 0.5) * 0.42
      const shallowScratches = Math.sin(x * 0.1 + y * 0.028) * 0.12
      return (
        (oldConcrete + shallowScratches + fineNoise * 0.22) *
        material.detailStrength
      )
    }
    case "Plaster003": {
      const rougherPlaster =
        (valueNoise(x, y, 10, layerSalt + 73) - 0.5) * 1 +
        (valueNoise(x, y, 34, layerSalt + 79) - 0.5) * 0.7
      return (rougherPlaster + fineNoise * 0.55) * material.detailStrength
    }
    case "Plastic012B": {
      const scratches =
        Math.max(0, Math.sin(x * 0.11 + y * 0.035 + layerSalt * 0.01)) * 0.36 +
        Math.max(0, Math.sin(x * 0.27 - y * 0.02)) * 0.14
      return (
        (cloudy * 0.4 + scratches + fineNoise * 0.22) * material.detailStrength
      )
    }
    case "Plastic010":
    default: {
      const satinWave =
        Math.sin(x * 0.36 + Math.sin(y * 0.075) * 2.2 + layerSalt * 0.01) *
          0.16 +
        Math.sin(y * 0.3 + Math.sin(x * 0.052) * 1.5 + layerSalt * 0.017) * 0.1
      return (
        (cloudy * 0.55 + satinWave + fineNoise * 0.18) * material.detailStrength
      )
    }
  }
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
      microSurfaceWeight: 0.15,
      roughness: 0.32,
    }
  }

  const isBrightLegend = r > 170 && g > 170 && b > 160
  if (isBrightLegend) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.45,
      roughness: 0.68,
    }
  }

  const isGreenSoldermask =
    g > r * 1.3 && g > b * 1.05 && r < 85 && g < 140 && b < 90

  if (!isGreenSoldermask) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.8,
      roughness: 0.58,
    }
  }

  const isCopperUnderSoldermask = r > b * 0.62 || g > 34
  return isCopperUnderSoldermask
    ? {
        height: MASKED_COPPER_HEIGHT,
        microSurfaceWeight: 0.65,
        roughness: 0.54,
      }
    : {
        height: PLAIN_SOLDERMASK_HEIGHT,
        microSurfaceWeight: 1,
        roughness: 0.62,
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
    const microSurface =
      createBoardSurfaceTextureDetail(
        x,
        y,
        sourceCanvas.width + 137,
        surfaceTexture,
      ) * profile.microSurfaceWeight
    const height = clamp01(invertSurfaceHeight(profile.height) + microSurface)
    heights[pixelIndex] = height

    const heightChannel = height * 255
    data[i] = heightChannel
    data[i + 1] = heightChannel
    data[i + 2] = heightChannel
    data[i + 3] = 255

    const roughness = clamp01(
      profile.roughness +
        surfaceMaterial.roughnessBias +
        microSurface * 1.25 +
        (valueNoise(x, y, 32, sourceCanvas.height + 211) - 0.5) *
          surfaceMaterial.roughnessVariance,
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
