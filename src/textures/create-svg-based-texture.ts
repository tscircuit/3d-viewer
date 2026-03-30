import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { calculateOutlineBounds } from "../utils/outline-bounds"
import { createSvgFromCircuitJson } from "./svg-from-circuit-json"
import { convertSvgToPng } from "./resvg-converter"
import * as THREE from "three"

export interface SvgTextureOptions {
  width: number
  height: number
  layer: "top" | "bottom"
  /**
   * Resolution in pixels per mm
   * @default 150
   */
  resolution?: number
  /**
   * Color overrides for different elements
   */
  colors?: {
    copper?: string
    silkscreen?: string
    soldermask?: string
    substrate?: string
  }
}

/**
 * Creates a high-quality PNG texture from circuit JSON using SVG rendering via resvg-wasm.
 * This provides better quality than canvas-based rendering, especially for text and fine details.
 */
export async function createSvgBasedTexture(
  circuitJson: AnyCircuitElement[],
  boardData: PcbBoard,
  options: SvgTextureOptions,
): Promise<THREE.DataTexture | null> {
  const { width, height, layer, resolution = 150, colors } = options

  const bounds = calculateOutlineBounds(boardData)
  const pixelWidth = Math.floor(bounds.width * resolution)
  const pixelHeight = Math.floor(bounds.height * resolution)

  if (pixelWidth <= 0 || pixelHeight <= 0) {
    return null
  }

  try {
    // Generate SVG from circuit JSON
    const svgString = createSvgFromCircuitJson({
      circuitJson,
      boardData,
      layer,
      width: pixelWidth,
      height: pixelHeight,
      bounds,
      colors,
    })

    // Convert SVG to PNG using resvg-wasm
    const pngBuffer = await convertSvgToPng(svgString, {
      width: pixelWidth,
      height: pixelHeight,
    })

    if (!pngBuffer) {
      return null
    }

    // Create Three.js DataTexture from PNG
    const texture = createTextureFromPng(pngBuffer, pixelWidth, pixelHeight)

    return texture
  } catch (error) {
    console.error("Error creating SVG-based texture:", error)
    return null
  }
}

/**
 * Creates a Three.js DataTexture from PNG buffer data
 */
function createTextureFromPng(
  pngBuffer: Uint8Array,
  width: number,
  height: number,
): Promise<THREE.DataTexture> {
  // Create a temporary canvas to decode the PNG
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("Failed to get 2D context")
  }

  // Create blob from buffer and draw to canvas
  // Convert Uint8Array to ArrayBuffer for Blob compatibility
  const arrayBuffer = pngBuffer.buffer.slice(
    pngBuffer.byteOffset,
    pngBuffer.byteOffset + pngBuffer.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: "image/png" })
  const img = new Image()

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, width, height)

      // Create DataTexture
      const texture = new THREE.DataTexture(
        new Uint8Array(imageData.data.buffer),
        width,
        height,
        THREE.RGBAFormat,
      )
      texture.generateMipmaps = true
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.anisotropy = 16
      texture.needsUpdate = true
      texture.flipY = false

      resolve(texture)
    }

    img.onerror = () => {
      reject(new Error("Failed to load PNG image"))
    }

    img.src = URL.createObjectURL(blob)
  })
}

// Synchronous version that returns a placeholder and loads async
export function createSvgBasedTextureAsync(
  circuitJson: AnyCircuitElement[],
  boardData: PcbBoard,
  options: SvgTextureOptions,
  onLoad: (texture: THREE.DataTexture | null) => void,
): THREE.DataTexture | null {
  // Start async loading
  createSvgBasedTexture(circuitJson, boardData, options)
    .then((texture) => {
      onLoad(texture)
    })
    .catch((error) => {
      console.error("Async texture loading failed:", error)
      onLoad(null)
    })

  // Return null immediately - texture will be set via callback
  return null
}
