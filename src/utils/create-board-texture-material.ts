import * as THREE from "three"
import { FAUX_BOARD_OPACITY } from "../geoms/constants"

interface CreateBoardTextureMaterialOptions {
  texture: THREE.CanvasTexture
  side?: THREE.Side
  depthWrite?: boolean
  polygonOffset?: boolean
  polygonOffsetFactor?: number
  polygonOffsetUnits?: number
  isFaux?: boolean
}

const PLAIN_SOLDERMASK_HEIGHT = 0.22
const MASKED_COPPER_HEIGHT = 0.58
const EXPOSED_COPPER_HEIGHT = 0.86
const invertSurfaceHeight = (height: number) => 1 - height

const getBoardSurfaceHeight = (r: number, g: number, b: number): number => {
  const isExposedCopper =
    r > 120 && g > 70 && b < 120 && r > g * 1.08 && g > b * 1.25

  if (isExposedCopper) return EXPOSED_COPPER_HEIGHT

  const isGreenSoldermask =
    g > r * 1.3 && g > b * 1.05 && r < 85 && g < 140 && b < 90

  if (!isGreenSoldermask) return PLAIN_SOLDERMASK_HEIGHT

  const isCopperUnderSoldermask = r > b * 0.62 || g > 34
  return isCopperUnderSoldermask
    ? MASKED_COPPER_HEIGHT
    : PLAIN_SOLDERMASK_HEIGHT
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

const createBoardReliefTextures = (
  texture: THREE.CanvasTexture,
): { bumpMap: THREE.CanvasTexture; normalMap: THREE.CanvasTexture } | null => {
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

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    const alpha = data[i + 3] ?? 0
    if (alpha < 16) {
      const height = invertSurfaceHeight(PLAIN_SOLDERMASK_HEIGHT)
      const heightChannel = height * 255
      data[i] = heightChannel
      data[i + 1] = heightChannel
      data[i + 2] = heightChannel
      data[i + 3] = 0
      heights[pixelIndex] = height
      continue
    }

    const r = data[i] ?? 0
    const g = data[i + 1] ?? 0
    const b = data[i + 2] ?? 0
    const height = invertSurfaceHeight(getBoardSurfaceHeight(r, g, b))
    heights[pixelIndex] = height

    const heightChannel = height * 255
    data[i] = heightChannel
    data[i + 1] = heightChannel
    data[i + 2] = heightChannel
    data[i + 3] = 255
  }

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
  }
}

export const createBoardTextureMaterial = ({
  texture,
  side = THREE.FrontSide,
  depthWrite = true,
  polygonOffset = false,
  polygonOffsetFactor = 0,
  polygonOffsetUnits = 0,
  isFaux = false,
}: CreateBoardTextureMaterialOptions): THREE.MeshStandardMaterial => {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const reliefTextures = createBoardReliefTextures(texture)

  return new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.2,
    bumpMap: reliefTextures?.bumpMap ?? null,
    bumpScale: 1.2,
    normalMap: reliefTextures?.normalMap ?? null,
    normalScale: new THREE.Vector2(1.8, 1.8),
    transparent: true,
    alphaTest: 0.08,
    side,
    depthWrite,
    polygonOffset,
    polygonOffsetFactor,
    polygonOffsetUnits,
    opacity: isFaux ? FAUX_BOARD_OPACITY : 1.0,
    metalness: 0,
    roughness: 0.5,
  })
}
