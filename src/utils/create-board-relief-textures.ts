import * as THREE from "three"
import {
  PAD_COPPER_TEXTURE_MATERIAL,
  REALISTIC_BOARD_SURFACE_MATERIAL,
} from "../board-surface-textures"
import { isYellowSoldermaskColor } from "./soldermask-color"

const PLAIN_SOLDERMASK_HEIGHT = 0.22
const MASKED_COPPER_HEIGHT = 0.7
const EXPOSED_COPPER_HEIGHT = 0.86

type BoardSurfaceProfile = {
  height: number
  microSurfaceWeight: number
  roughness: number
  metalness: number
  isExposedCopper: boolean
  isMaskedCopper: boolean
}

const PLAIN_SOLDERMASK_PROFILE: BoardSurfaceProfile = {
  height: PLAIN_SOLDERMASK_HEIGHT,
  microSurfaceWeight: 1,
  roughness: 0.7,
  metalness: 0.015,
  isExposedCopper: false,
  isMaskedCopper: false,
}

const MASKED_COPPER_PROFILE: BoardSurfaceProfile = {
  height: MASKED_COPPER_HEIGHT,
  microSurfaceWeight: 0.9,
  roughness: 0.54,
  metalness: 0.025,
  isExposedCopper: false,
  isMaskedCopper: true,
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
const invertSurfaceHeight = (height: number) => 1 - height

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

const createCopperDetail = (x: number, y: number, salt: number) => {
  // A restrained etched/brushed grain breaks up large pads without sparkles.
  const etch = (valueNoise(x, y, 7, salt + 31) - 0.5) * 0.55
  const brush = Math.sin(x * 0.12 + valueNoise(x, y, 44, salt + 37) * 2) * 0.22
  return (etch + brush) * PAD_COPPER_TEXTURE_MATERIAL.detailStrength
}

const createMaskedTraceDetail = (x: number, y: number, salt: number) => {
  // Covered routing has a visible but non-metallic etched finish.
  const etch = (hashNoise(x, y, salt + 53) - 0.5) * 0.42
  const routingGrain =
    Math.sin(x * 0.26 + y * 0.06) * 0.2 + Math.sin(y * 0.31 - x * 0.04) * 0.12
  return (etch + routingGrain) * 0.045
}

const getBoardSurfaceProfile = (
  r: number,
  g: number,
  b: number,
  hasMaskedCopper: boolean,
): BoardSurfaceProfile => {
  // The dedicated geometry mask identifies buried copper independently of the
  // visible soldermask color.
  if (hasMaskedCopper) return MASKED_COPPER_PROFILE

  if (isYellowSoldermaskColor({ red: r, green: g, blue: b })) {
    return PLAIN_SOLDERMASK_PROFILE
  }

  const isExposedCopper =
    r > 120 && g > 70 && b < 150 && r > g * 1.05 && g > b * 1.15
  if (isExposedCopper) {
    return {
      height: EXPOSED_COPPER_HEIGHT,
      microSurfaceWeight: 0.9,
      roughness: PAD_COPPER_TEXTURE_MATERIAL.roughness,
      metalness: PAD_COPPER_TEXTURE_MATERIAL.metalness,
      isExposedCopper: true,
      isMaskedCopper: false,
    }
  }

  const isBrightLegend = r > 170 && g > 170 && b > 160
  if (isBrightLegend) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.4,
      roughness: 0.76,
      metalness: 0,
      isExposedCopper: false,
      isMaskedCopper: false,
    }
  }

  const isGreenSoldermask =
    g > r * 1.25 && g > b * 1.05 && r < 110 && g < 180 && b < 130
  if (!isGreenSoldermask) {
    return {
      height: PLAIN_SOLDERMASK_HEIGHT,
      microSurfaceWeight: 0.7,
      roughness: 0.58,
      metalness: 0.015,
      isExposedCopper: false,
      isMaskedCopper: false,
    }
  }

  return PLAIN_SOLDERMASK_PROFILE
}

const createDataTexture = (canvas: HTMLCanvasElement) => {
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
  maskedCopperMask?: THREE.CanvasTexture | null,
): {
  bumpMap: THREE.CanvasTexture
  normalMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
  metalnessMap: THREE.CanvasTexture
} | null => {
  const sourceCanvas = texture.image as HTMLCanvasElement | undefined
  if (!sourceCanvas?.width || !sourceCanvas.height) return null

  const sourceCtx = sourceCanvas.getContext("2d")
  if (!sourceCtx) return null

  const maskCanvas = maskedCopperMask?.image as HTMLCanvasElement | undefined
  const maskCtx = maskCanvas?.getContext("2d")
  const maskWidth = maskCanvas?.width ?? 0
  const maskHeight = maskCanvas?.height ?? 0
  const maskImageData =
    maskCtx && maskWidth && maskHeight
      ? maskCtx.getImageData(0, 0, maskWidth, maskHeight)
      : null

  const imageData = sourceCtx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const data = imageData.data
  const heights = new Float32Array(sourceCanvas.width * sourceCanvas.height)
  const roughnessCanvas = document.createElement("canvas")
  const metalnessCanvas = document.createElement("canvas")
  roughnessCanvas.width = metalnessCanvas.width = sourceCanvas.width
  roughnessCanvas.height = metalnessCanvas.height = sourceCanvas.height
  const roughnessCtx = roughnessCanvas.getContext("2d")
  const metalnessCtx = metalnessCanvas.getContext("2d")
  if (!roughnessCtx || !metalnessCtx) return null
  const roughnessImageData = roughnessCtx.createImageData(
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const metalnessImageData = metalnessCtx.createImageData(
    sourceCanvas.width,
    sourceCanvas.height,
  )
  const roughnessData = roughnessImageData.data
  const metalnessData = metalnessImageData.data

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const x = pixelIndex % sourceCanvas.width
    const y = Math.floor(pixelIndex / sourceCanvas.width)
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) {
      heights[pixelIndex] = invertSurfaceHeight(PLAIN_SOLDERMASK_HEIGHT)
      continue
    }

    const maskX = maskImageData
      ? Math.min(
          maskWidth - 1,
          Math.floor((x / sourceCanvas.width) * maskWidth),
        )
      : 0
    const maskY = maskImageData
      ? Math.min(
          maskHeight - 1,
          Math.floor((y / sourceCanvas.height) * maskHeight),
        )
      : 0
    const maskAlpha = maskImageData
      ? (maskImageData.data[(maskY * maskWidth + maskX) * 4 + 3] ?? 0)
      : 0
    const profile = getBoardSurfaceProfile(
      data[i] ?? 0,
      data[i + 1] ?? 0,
      data[i + 2] ?? 0,
      maskAlpha >= 16,
    )
    const salt = sourceCanvas.width + sourceCanvas.height
    const fineGrain = profile.isExposedCopper
      ? createCopperDetail(x, y, salt)
      : profile.isMaskedCopper
        ? createMaskedTraceDetail(x, y, salt)
        : 0
    const height = clamp01(
      invertSurfaceHeight(profile.height) +
        fineGrain * profile.microSurfaceWeight,
    )
    heights[pixelIndex] = height

    const heightChannel = height * 255
    data[i] = data[i + 1] = data[i + 2] = heightChannel
    data[i + 3] = 255

    const roughness = profile.isExposedCopper
      ? clamp01(
          profile.roughness +
            fineGrain * 0.7 +
            (valueNoise(x, y, 36, salt + 17) - 0.5) *
              PAD_COPPER_TEXTURE_MATERIAL.roughnessVariance,
        )
      : profile.isMaskedCopper
        ? clamp01(
            profile.roughness +
              fineGrain +
              REALISTIC_BOARD_SURFACE_MATERIAL.roughnessBias,
          )
        : profile.roughness
    const roughnessChannel = roughness * 255
    roughnessData[i] =
      roughnessData[i + 1] =
      roughnessData[i + 2] =
        roughnessChannel
    roughnessData[i + 3] = 255

    const metalnessChannel = profile.metalness * 255
    metalnessData[i] =
      metalnessData[i + 1] =
      metalnessData[i + 2] =
        metalnessChannel
    metalnessData[i + 3] = 255
  }
  roughnessCtx.putImageData(roughnessImageData, 0, 0)
  metalnessCtx.putImageData(metalnessImageData, 0, 0)

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
  const getHeight = (x: number, y: number) =>
    heights[
      Math.max(0, Math.min(sourceCanvas.height - 1, y)) * sourceCanvas.width +
        Math.max(0, Math.min(sourceCanvas.width - 1, x))
    ] ?? 0

  for (let y = 0; y < sourceCanvas.height; y++) {
    for (let x = 0; x < sourceCanvas.width; x++) {
      const dx = (getHeight(x + 1, y) - getHeight(x - 1, y)) * 4
      const dy = (getHeight(x, y + 1) - getHeight(x, y - 1)) * 4
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
    bumpMap: createDataTexture(bumpCanvas),
    normalMap: createDataTexture(normalCanvas),
    roughnessMap: createDataTexture(roughnessCanvas),
    metalnessMap: createDataTexture(metalnessCanvas),
  }
}
